import { useState, useRef, useCallback } from 'react';
import {
  Upload, FileSpreadsheet, Check, AlertCircle, Loader2,
  Database, Sparkles, ShieldCheck, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// ── ISO 3166-1 alpha-2 country codes ──
const ISO_COUNTRY_CODES = new Set([
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS',
  'BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN',
  'CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE',
  'EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF',
  'GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM',
  'HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM',
  'JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC',
  'LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK',
  'ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA',
  'NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG',
  'PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW',
  'SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS',
  'ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO',
  'TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI',
  'VN','VU','WF','WS','YE','YT','ZA','ZM','ZW'
]);

// ── Zod validation schema ──
const TLCRowSchema = z.object({
  codigo_arancelario: z.string()
    .transform(v => v.replace(/[.\-\s]/g, ''))
    .pipe(z.string().regex(/^\d{12}$/, 'Partida debe ser exactamente 12 dígitos numéricos')),
  pais_origen: z.string()
    .transform(v => v.trim().toUpperCase())
    .pipe(z.string().refine(v => ISO_COUNTRY_CODES.has(v), { message: 'Código de país ISO inválido' })),
  tratado_nombre: z.string().min(1, 'Nombre del tratado requerido').max(200),
  tratado_codigo: z.string().min(1, 'Código del tratado requerido').max(20),
  arancel_preferencial: z.union([z.string(), z.number()])
    .transform(v => typeof v === 'string' ? parseFloat(v.replace('%', '').replace(',', '.')) : v)
    .pipe(z.number().min(0, 'Arancel mínimo: 0%').max(100, 'Arancel máximo: 100%')),
  arancel_general: z.union([z.string(), z.number()])
    .transform(v => typeof v === 'string' ? parseFloat(v.replace('%', '').replace(',', '.')) : v)
    .pipe(z.number().min(0, 'Arancel mínimo: 0%').max(100, 'Arancel máximo: 100%')),
  requisitos_origen: z.string().max(500).optional().nullable(),
  notas: z.string().max(500).optional().nullable(),
});

type TLCRowInput = z.input<typeof TLCRowSchema>;
type TLCRowParsed = z.output<typeof TLCRowSchema>;

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface StellaMessage {
  type: 'success' | 'warning' | 'info';
  title: string;
  body: string;
}

// ── Column name mapping ──
const COLUMN_ALIASES: Record<string, string[]> = {
  codigo_arancelario: ['partida', 'codigo', 'hs_code', 'hscode', 'codigo_arancelario', 'tariff_code', 'partida_arancelaria'],
  pais_origen: ['pais', 'pais_origen', 'country', 'origin', 'iso', 'country_code'],
  tratado_nombre: ['tratado', 'tratado_nombre', 'treaty', 'acuerdo', 'agreement', 'tlc'],
  tratado_codigo: ['codigo_tratado', 'tratado_codigo', 'treaty_code', 'tlc_code'],
  arancel_preferencial: ['preferencial', 'arancel_preferencial', 'preferential', 'pref_rate', 'dai_pref'],
  arancel_general: ['general', 'arancel_general', 'general_rate', 'dai_general', 'dai'],
  requisitos_origen: ['requisitos', 'requisitos_origen', 'origin_requirements', 'reglas_origen'],
  notas: ['notas', 'notes', 'observaciones', 'comments'],
};

function matchColumn(header: string): string | null {
  const normalized = header.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some(a => normalized.includes(a))) return field;
  }
  return null;
}

export function TLCKnowledgeBase() {
  const [parsedRows, setParsedRows] = useState<TLCRowParsed[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [totalRawRows, setTotalRawRows] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [stellaMessage, setStellaMessage] = useState<StellaMessage | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setParsedRows([]);
    setErrors([]);
    setFileName(null);
    setTotalRawRows(0);
    setStellaMessage(null);
  };

  const processExcel = useCallback((file: File) => {
    resetState();
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

        if (jsonData.length === 0) {
          setErrors([{ row: 0, field: '-', message: 'El archivo está vacío' }]);
          return;
        }

        setTotalRawRows(jsonData.length);

        // Map columns
        const headers = Object.keys(jsonData[0]);
        const columnMap: Record<string, string> = {};
        for (const header of headers) {
          const matched = matchColumn(header);
          if (matched) columnMap[header] = matched;
        }

        const requiredFields = ['codigo_arancelario', 'pais_origen', 'tratado_nombre', 'tratado_codigo', 'arancel_preferencial', 'arancel_general'];
        const mappedFields = Object.values(columnMap);
        const missing = requiredFields.filter(f => !mappedFields.includes(f));

        if (missing.length > 0) {
          setErrors([{
            row: 0,
            field: missing.join(', '),
            message: `Columnas obligatorias no encontradas: ${missing.join(', ')}. Columnas detectadas: ${headers.join(', ')}`
          }]);
          return;
        }

        // Parse and validate each row
        const valid: TLCRowParsed[] = [];
        const rowErrors: ValidationError[] = [];

        jsonData.forEach((rawRow, idx) => {
          const mapped: Record<string, unknown> = {};
          for (const [originalCol, targetField] of Object.entries(columnMap)) {
            mapped[targetField] = String(rawRow[originalCol] ?? '');
          }

          const result = TLCRowSchema.safeParse(mapped as TLCRowInput);
          if (result.success) {
            valid.push(result.data);
          } else {
            result.error.issues.forEach(issue => {
              rowErrors.push({
                row: idx + 2, // Excel row (header=1, data starts at 2)
                field: issue.path.join('.') || 'desconocido',
                message: issue.message,
              });
            });
          }
        });

        setParsedRows(valid);
        setErrors(rowErrors.slice(0, 50)); // Limit displayed errors

        if (valid.length > 0 && rowErrors.length === 0) {
          setStellaMessage({
            type: 'info',
            title: 'Validación Exitosa',
            body: `He validado ${valid.length} registros de desgravación arancelaria. Todos cumplen con formato de 12 dígitos, códigos ISO y porcentajes válidos. Presione "Cargar a Base de Conocimiento" para actualizar el motor de estrategia.`,
          });
        } else if (valid.length > 0 && rowErrors.length > 0) {
          setStellaMessage({
            type: 'warning',
            title: 'Validación Parcial',
            body: `De ${jsonData.length} filas, ${valid.length} pasaron validación Zod y ${rowErrors.length} tienen errores. Puede cargar los registros válidos o corregir el archivo.`,
          });
        }
      } catch (err) {
        setErrors([{
          row: 0,
          field: '-',
          message: err instanceof Error ? err.message : 'Error al leer el archivo Excel',
        }]);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processExcel(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      processExcel(file);
    } else {
      toast.error('Solo se aceptan archivos Excel (.xlsx, .xls)');
    }
  };

  const handleUpload = async () => {
    if (parsedRows.length === 0) return;
    setUploading(true);

    try {
      // Upsert in batches of 100
      const BATCH_SIZE = 100;
      let inserted = 0;
      let updated = 0;

      for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
        const batch = parsedRows.slice(i, i + BATCH_SIZE);

        const records = batch.map(row => ({
          codigo_arancelario: row.codigo_arancelario,
          pais_origen: row.pais_origen,
          tratado_nombre: row.tratado_nombre,
          tratado_codigo: row.tratado_codigo,
          arancel_preferencial: row.arancel_preferencial,
          arancel_general: row.arancel_general,
          requisitos_origen: row.requisitos_origen || null,
          notas: row.notas || null,
          activo: true,
          updated_at: new Date().toISOString(),
        }));

        // Use upsert with conflict on (codigo_arancelario, pais_origen, tratado_codigo)
        const { error, data } = await supabase
          .from('acuerdos_comerciales')
          .upsert(records, {
            onConflict: 'codigo_arancelario,pais_origen,tratado_codigo',
            ignoreDuplicates: false,
          })
          .select('id');

        if (error) throw error;
        inserted += data?.length ?? batch.length;
      }

      setStellaMessage({
        type: 'success',
        title: 'Conocimiento Actualizado',
        body: `He cargado ${parsedRows.length.toLocaleString()} nuevas reglas de desgravación arancelaria. El Botón de Estrategia ahora es más inteligente. Los acuerdos existentes con la misma partida y tratado fueron actualizados automáticamente.`,
      });

      toast.success(`${parsedRows.length.toLocaleString()} reglas cargadas exitosamente`);
      setParsedRows([]);
      setErrors([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar datos';
      toast.error(msg);
      setStellaMessage({
        type: 'warning',
        title: 'Error de Persistencia',
        body: `No pude completar la carga: ${msg}. Verifique permisos de escritura en la base de conocimiento.`,
      });
    } finally {
      setUploading(false);
    }
  };

  const uniqueTreaties = [...new Set(parsedRows.map(r => r.tratado_codigo))];
  const uniqueCountries = [...new Set(parsedRows.map(r => r.pais_origen))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            TLC Knowledge Base
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Carga masiva de acuerdos comerciales y reglas de desgravación arancelaria
          </p>
        </div>
        {parsedRows.length > 0 && (
          <Button onClick={handleUpload} disabled={uploading} className="gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Cargando...' : `Cargar ${parsedRows.length.toLocaleString()} Reglas`}
          </Button>
        )}
      </div>

      {/* Drop Zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors',
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        )}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />
        <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium text-foreground">
          Arrastre su archivo Excel aquí o haga clic para seleccionar
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Columnas requeridas: <span className="font-mono">partida</span> (12 dígitos), <span className="font-mono">pais_origen</span> (ISO), <span className="font-mono">tratado_nombre</span>, <span className="font-mono">tratado_codigo</span>, <span className="font-mono">arancel_preferencial</span>, <span className="font-mono">arancel_general</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Opcionales: <span className="font-mono">requisitos_origen</span>, <span className="font-mono">notas</span>
        </p>
      </div>

      {/* File loaded indicator */}
      {fileName && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{fileName}</span>
            <span className="text-xs text-muted-foreground">— {totalRawRows.toLocaleString()} filas detectadas</span>
          </div>
          <Button variant="ghost" size="sm" onClick={resetState} className="h-7 w-7 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Validation Errors */}
      {errors.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              Errores de Validación Zod ({errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-48 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left text-muted-foreground font-medium">Fila</th>
                    <th className="p-2 text-left text-muted-foreground font-medium">Campo</th>
                    <th className="p-2 text-left text-muted-foreground font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((e, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-2 font-mono text-foreground">{e.row}</td>
                      <td className="p-2 font-mono text-primary">{e.field}</td>
                      <td className="p-2 text-destructive">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {errors.length >= 50 && (
              <p className="text-xs text-muted-foreground p-2 border-t border-border">
                Mostrando los primeros 50 errores. Corrija el archivo y vuelva a cargarlo.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview Table */}
      {parsedRows.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Registros Validados
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{uniqueTreaties.length} tratados</Badge>
                <Badge variant="outline" className="text-xs">{uniqueCountries.length} países</Badge>
                <Badge className="text-xs">{parsedRows.length.toLocaleString()} reglas</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left text-muted-foreground font-medium">Partida</th>
                    <th className="p-2 text-left text-muted-foreground font-medium">País</th>
                    <th className="p-2 text-left text-muted-foreground font-medium">Tratado</th>
                    <th className="p-2 text-center text-muted-foreground font-medium">DAI General</th>
                    <th className="p-2 text-center text-muted-foreground font-medium">DAI Pref.</th>
                    <th className="p-2 text-center text-muted-foreground font-medium">Ahorro</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 20).map((r, i) => {
                    const savings = r.arancel_general - r.arancel_preferencial;
                    return (
                      <tr key={i} className="border-t border-border">
                        <td className="p-2 font-mono text-primary">{r.codigo_arancelario}</td>
                        <td className="p-2 font-medium text-foreground">{r.pais_origen}</td>
                        <td className="p-2 text-foreground">{r.tratado_nombre}</td>
                        <td className="p-2 text-center text-muted-foreground">{r.arancel_general}%</td>
                        <td className="p-2 text-center font-medium text-primary">{r.arancel_preferencial}%</td>
                        <td className="p-2 text-center">
                          {savings > 0 ? (
                            <span className="text-green-600 dark:text-green-400 font-medium">-{savings.toFixed(1)}%</span>
                          ) : (
                            <span className="text-muted-foreground">0%</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 20 && (
              <p className="text-xs text-muted-foreground p-2 border-t border-border text-center">
                Mostrando 20 de {parsedRows.length.toLocaleString()} registros validados
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stella Message */}
      {stellaMessage && (
        <Card className={cn(
          'border-l-4',
          stellaMessage.type === 'success' && 'border-l-primary bg-primary/5',
          stellaMessage.type === 'warning' && 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
          stellaMessage.type === 'info' && 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20',
        )}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className={cn(
                'w-5 h-5 mt-0.5 flex-shrink-0',
                stellaMessage.type === 'success' && 'text-primary',
                stellaMessage.type === 'warning' && 'text-yellow-600',
                stellaMessage.type === 'info' && 'text-blue-600',
              )} />
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Stella — {stellaMessage.title}
                </p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {stellaMessage.body}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Format Guide */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Formato de archivo requerido (Excel .xlsx):</p>
          <div className="overflow-x-auto">
            <table className="text-[10px] font-mono w-full">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="pr-4 text-left">partida</th>
                  <th className="pr-4 text-left">pais_origen</th>
                  <th className="pr-4 text-left">tratado_nombre</th>
                  <th className="pr-4 text-left">tratado_codigo</th>
                  <th className="pr-4 text-left">arancel_preferencial</th>
                  <th className="pr-4 text-left">arancel_general</th>
                  <th className="pr-4 text-left">requisitos_origen</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                <tr>
                  <td className="pr-4">330410000000</td>
                  <td className="pr-4">US</td>
                  <td className="pr-4">TPC Panamá-EE.UU.</td>
                  <td className="pr-4">TPC-US</td>
                  <td className="pr-4">0</td>
                  <td className="pr-4">10</td>
                  <td className="pr-4">Certificado de Origen TPC</td>
                </tr>
                <tr className="text-muted-foreground/60">
                  <td className="pr-4">850440000000</td>
                  <td className="pr-4">CN</td>
                  <td className="pr-4">TLC Panamá-China</td>
                  <td className="pr-4">TLC-CN</td>
                  <td className="pr-4">5</td>
                  <td className="pr-4">15</td>
                  <td className="pr-4">Certificado de Origen Form E</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
