/**
 * FORMULARIO DE CAPTURA MANUAL — ZENITH
 * 
 * Entrada de datos organizada por secciones:
 * 1. Encabezado (MAWB, Consignatario, RUC)
 * 2. Mercancías (Descripción, HTS, Valor, Peso)
 * 3. Tributos (Cálculo automático con validación Zod)
 * 
 * Validación en tiempo real por Zod con alertas de subvaluación.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  AlertTriangle, Shield, CheckCircle2, Sparkles, Plus,
  Trash2, Calculator, FileText, Package, DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

// ─── Tipos ───────────────────────────────────────────────
interface LineaMercancia {
  id: string;
  descripcion: string;
  hsCode: string;
  cantidad: number;
  valorFOB: number;
  peso: number;
  paisOrigen: string;
}

interface DatosEncabezado {
  mawb: string;
  consignatario: string;
  ruc: string;
  dv: string;
  direccion: string;
  provincia: string;
  modoTransporte: string;
  numLiquidacion: string;
}

interface ZodAlerta {
  campo: string;
  mensaje: string;
  severidad: 'warning' | 'error' | 'info';
}

interface FormularioCapturaManualProps {
  /** Datos pre-llenados desde OCR */
  datosOCR?: Partial<DatosEncabezado> & { lineas?: Partial<LineaMercancia>[] };
  onSubmit: (encabezado: DatosEncabezado, lineas: LineaMercancia[]) => void;
  onCancel: () => void;
}

// ─── Constantes Fiscales ────────────────────────────────
const ITBMS_RATE = 0.07;
const TASA_SERVICIO_ANA = 2.00;

const PROVINCIAS = [
  'Bocas del Toro', 'Chiriquí', 'Coclé', 'Colón', 'Darién',
  'Herrera', 'Los Santos', 'Panamá', 'Panamá Oeste', 'Veraguas',
  'Comarca Guna Yala', 'Comarca Emberá-Wounaan', 'Comarca Ngäbe-Buglé'
];

const MODOS_TRANSPORTE = [
  { value: 'aereo', label: 'Aéreo' },
  { value: 'maritimo', label: 'Marítimo' },
  { value: 'terrestre', label: 'Terrestre' },
];

function crearLineaVacia(): LineaMercancia {
  return {
    id: crypto.randomUUID(),
    descripcion: '',
    hsCode: '',
    cantidad: 1,
    valorFOB: 0,
    peso: 0,
    paisOrigen: '',
  };
}

// ─── Validaciones Zod ───────────────────────────────────
function validarCamposZod(
  encabezado: DatosEncabezado,
  lineas: LineaMercancia[]
): ZodAlerta[] {
  const alertas: ZodAlerta[] = [];

  // MAWB
  if (encabezado.mawb && !/^\d{3}-\d{8}$/.test(encabezado.mawb)) {
    alertas.push({
      campo: 'mawb',
      mensaje: 'Formato MAWB inválido. Se espera: XXX-XXXXXXXX',
      severidad: 'error',
    });
  }

  // RUC
  if (encabezado.ruc && encabezado.ruc.length < 5) {
    alertas.push({
      campo: 'ruc',
      mensaje: 'RUC debe tener al menos 5 caracteres',
      severidad: 'error',
    });
  }

  // DV
  if (encabezado.dv && (isNaN(Number(encabezado.dv)) || encabezado.dv.length > 2)) {
    alertas.push({
      campo: 'dv',
      mensaje: 'DV debe ser 1-2 dígitos numéricos',
      severidad: 'error',
    });
  }

  // Líneas de mercancía
  lineas.forEach((linea, idx) => {
    // Valor FOB sospechosamente bajo
    if (linea.valorFOB > 0 && linea.valorFOB < 5) {
      alertas.push({
        campo: `linea-${idx}-valorFOB`,
        mensaje: `Línea ${idx + 1}: Valor FOB $${linea.valorFOB.toFixed(2)} es sospechosamente bajo. ¿Posible subvaluación?`,
        severidad: 'warning',
      });
    }

    // HS Code formato
    if (linea.hsCode && !/^\d{4,10}(\.\d+)?$/.test(linea.hsCode.replace(/\./g, ''))) {
      alertas.push({
        campo: `linea-${idx}-hsCode`,
        mensaje: `Línea ${idx + 1}: Código HTS "${linea.hsCode}" no tiene formato válido`,
        severidad: 'error',
      });
    }

    // Peso vs Valor (ratio sospechoso)
    if (linea.peso > 0 && linea.valorFOB > 0) {
      const ratioPesoValor = linea.valorFOB / linea.peso;
      if (ratioPesoValor < 0.5) {
        alertas.push({
          campo: `linea-${idx}-ratio`,
          mensaje: `Línea ${idx + 1}: Ratio valor/peso ($${ratioPesoValor.toFixed(2)}/kg) indica posible subvaluación.`,
          severidad: 'warning',
        });
      }
    }
  });

  return alertas;
}

// ─── Componente Principal ───────────────────────────────
export function FormularioCapturaManual({
  datosOCR,
  onSubmit,
  onCancel,
}: FormularioCapturaManualProps) {
  const [encabezado, setEncabezado] = useState<DatosEncabezado>({
    mawb: datosOCR?.mawb || '',
    consignatario: datosOCR?.consignatario || '',
    ruc: datosOCR?.ruc || '',
    dv: datosOCR?.dv || '',
    direccion: datosOCR?.direccion || '',
    provincia: datosOCR?.provincia || '',
    modoTransporte: datosOCR?.modoTransporte || 'aereo',
    numLiquidacion: datosOCR?.numLiquidacion || '',
  });

  const [lineas, setLineas] = useState<LineaMercancia[]>(() => {
    if (datosOCR?.lineas && datosOCR.lineas.length > 0) {
      return datosOCR.lineas.map(l => ({
        ...crearLineaVacia(),
        ...l,
      }));
    }
    return [crearLineaVacia()];
  });

  // Efecto para actualizar con datos OCR cuando cambian
  useEffect(() => {
    if (datosOCR) {
      setEncabezado(prev => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(datosOCR).filter(([k, v]) => v && k !== 'lineas')
        ),
      }));
      if (datosOCR.lineas && datosOCR.lineas.length > 0) {
        setLineas(datosOCR.lineas.map(l => ({
          ...crearLineaVacia(),
          ...l,
        })));
      }
    }
  }, [datosOCR]);

  // Validación en tiempo real
  const alertasZod = useMemo(
    () => validarCamposZod(encabezado, lineas),
    [encabezado, lineas]
  );

  const tieneErrores = alertasZod.some(a => a.severidad === 'error');
  const tieneWarnings = alertasZod.some(a => a.severidad === 'warning');

  // Cálculos tributarios
  const tributos = useMemo(() => {
    const totalFOB = lineas.reduce((s, l) => s + l.valorFOB * l.cantidad, 0);
    const totalPeso = lineas.reduce((s, l) => s + l.peso, 0);
    const dai = totalFOB * 0.10; // DAI estimado 10%
    const itbms = (totalFOB + dai) * ITBMS_RATE;
    const total = totalFOB + dai + itbms + TASA_SERVICIO_ANA;
    return { totalFOB, totalPeso, dai, itbms, tasaANA: TASA_SERVICIO_ANA, total };
  }, [lineas]);

  // Handlers
  const updateEncabezado = useCallback((field: keyof DatosEncabezado, value: string) => {
    setEncabezado(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateLinea = useCallback((id: string, field: keyof LineaMercancia, value: string | number) => {
    setLineas(prev =>
      prev.map(l => l.id === id ? { ...l, [field]: value } : l)
    );
  }, []);

  const agregarLinea = useCallback(() => {
    setLineas(prev => [...prev, crearLineaVacia()]);
  }, []);

  const eliminarLinea = useCallback((id: string) => {
    setLineas(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!tieneErrores) {
      onSubmit(encabezado, lineas);
    }
  }, [encabezado, lineas, tieneErrores, onSubmit]);

  // Helper para alertas en un campo específico
  const getAlertasCampo = (campo: string) =>
    alertasZod.filter(a => a.campo === campo);

  const campoConAlerta = (campo: string) => {
    const alertas = getAlertasCampo(campo);
    if (alertas.some(a => a.severidad === 'error')) return 'border-destructive ring-1 ring-destructive/30';
    if (alertas.some(a => a.severidad === 'warning')) return 'border-warning ring-1 ring-warning/30';
    return '';
  };

  return (
    <div className="space-y-6">
      {/* OCR auto-fill indicator */}
      {datosOCR && Object.keys(datosOCR).length > 0 && (
        <Alert className="border-primary/30 bg-primary/5">
          <Sparkles className="h-4 w-4 text-stella" />
          <AlertDescription className="text-sm">
            <strong>Stella OCR:</strong> Campos pre-llenados desde el documento escaneado.
            Revisa y confirma los datos antes de enviar.
          </AlertDescription>
        </Alert>
      )}

      {/* ─── Sección 1: Encabezado ─── */}
      <Card className="zenith-border-glow">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-primary" />
            Encabezado de Declaración
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* MAWB */}
            <div className="space-y-1.5">
              <Label htmlFor="mawb" className="text-xs">MAWB / BL</Label>
              <Input
                id="mawb"
                placeholder="XXX-XXXXXXXX"
                value={encabezado.mawb}
                onChange={e => updateEncabezado('mawb', e.target.value)}
                className={cn(campoConAlerta('mawb'))}
              />
              {getAlertasCampo('mawb').map((a, i) => (
                <p key={i} className={cn('text-[11px]', a.severidad === 'error' ? 'text-destructive' : 'text-warning')}>
                  {a.mensaje}
                </p>
              ))}
            </div>

            {/* Modo Transporte */}
            <div className="space-y-1.5">
              <Label className="text-xs">Modo de Transporte</Label>
              <Select value={encabezado.modoTransporte} onValueChange={v => updateEncabezado('modoTransporte', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODOS_TRANSPORTE.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Num Liquidacion */}
            <div className="space-y-1.5">
              <Label htmlFor="numLiquidacion" className="text-xs">Nº Liquidación ANA</Label>
              <Input
                id="numLiquidacion"
                placeholder="Opcional"
                value={encabezado.numLiquidacion}
                onChange={e => updateEncabezado('numLiquidacion', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Consignatario */}
            <div className="space-y-1.5">
              <Label htmlFor="consignatario" className="text-xs">Consignatario</Label>
              <Input
                id="consignatario"
                placeholder="Nombre del importador"
                value={encabezado.consignatario}
                onChange={e => updateEncabezado('consignatario', e.target.value)}
              />
            </div>

            {/* RUC */}
            <div className="space-y-1.5">
              <Label htmlFor="ruc" className="text-xs">RUC</Label>
              <Input
                id="ruc"
                placeholder="Registro Único de Contribuyente"
                value={encabezado.ruc}
                onChange={e => updateEncabezado('ruc', e.target.value)}
                className={cn(campoConAlerta('ruc'))}
              />
              {getAlertasCampo('ruc').map((a, i) => (
                <p key={i} className="text-[11px] text-destructive">{a.mensaje}</p>
              ))}
            </div>

            {/* DV */}
            <div className="space-y-1.5">
              <Label htmlFor="dv" className="text-xs">DV</Label>
              <Input
                id="dv"
                placeholder="00"
                value={encabezado.dv}
                onChange={e => updateEncabezado('dv', e.target.value)}
                className={cn('max-w-20', campoConAlerta('dv'))}
                maxLength={2}
              />
              {getAlertasCampo('dv').map((a, i) => (
                <p key={i} className="text-[11px] text-destructive">{a.mensaje}</p>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dirección */}
            <div className="space-y-1.5">
              <Label htmlFor="direccion" className="text-xs">Dirección</Label>
              <Input
                id="direccion"
                placeholder="Dirección del consignatario"
                value={encabezado.direccion}
                onChange={e => updateEncabezado('direccion', e.target.value)}
              />
            </div>

            {/* Provincia */}
            <div className="space-y-1.5">
              <Label className="text-xs">Provincia</Label>
              <Select value={encabezado.provincia} onValueChange={v => updateEncabezado('provincia', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar provincia" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCIAS.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Sección 2: Mercancías ─── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-4 h-4 text-primary" />
              Mercancías
              <Badge variant="secondary" className="ml-2 text-xs">{lineas.length} línea(s)</Badge>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={agregarLinea} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineas.map((linea, idx) => (
            <div
              key={linea.id}
              className={cn(
                'p-4 rounded-lg border border-border space-y-3',
                getAlertasCampo(`linea-${idx}-valorFOB`).length > 0 && 'border-warning/50 bg-warning/5',
                getAlertasCampo(`linea-${idx}-hsCode`).length > 0 && 'border-destructive/50 bg-destructive/5'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Línea {idx + 1}</span>
                {lineas.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => eliminarLinea(linea.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs">Descripción</Label>
                  <Textarea
                    placeholder="Descripción detallada de la mercancía"
                    value={linea.descripcion}
                    onChange={e => updateLinea(linea.id, 'descripcion', e.target.value)}
                    className="min-h-[60px] text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Código HTS</Label>
                  <Input
                    placeholder="8471.30.00"
                    value={linea.hsCode}
                    onChange={e => updateLinea(linea.id, 'hsCode', e.target.value)}
                    className={cn(campoConAlerta(`linea-${idx}-hsCode`))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">País de Origen</Label>
                  <Input
                    placeholder="US, CN, MX..."
                    value={linea.paisOrigen}
                    onChange={e => updateLinea(linea.id, 'paisOrigen', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Cantidad</Label>
                  <Input
                    type="number"
                    min={1}
                    value={linea.cantidad}
                    onChange={e => updateLinea(linea.id, 'cantidad', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Valor FOB (USD)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={linea.valorFOB || ''}
                    onChange={e => updateLinea(linea.id, 'valorFOB', parseFloat(e.target.value) || 0)}
                    className={cn(campoConAlerta(`linea-${idx}-valorFOB`))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Peso (kg)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={linea.peso || ''}
                    onChange={e => updateLinea(linea.id, 'peso', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Alertas Zod para esta línea */}
              {[
                ...getAlertasCampo(`linea-${idx}-valorFOB`),
                ...getAlertasCampo(`linea-${idx}-hsCode`),
                ...getAlertasCampo(`linea-${idx}-ratio`),
              ].map((alerta, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-2 p-2 rounded-md text-xs',
                    alerta.severidad === 'error' && 'bg-destructive/10 text-destructive',
                    alerta.severidad === 'warning' && 'bg-warning/10 text-warning'
                  )}
                >
                  {alerta.severidad === 'error' ? (
                    <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{alerta.mensaje}</span>
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ─── Sección 3: Tributos ─── */}
      <Card className="glass-panel-zod">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="w-4 h-4 text-zod" />
            Estimación de Tributos
            <Badge variant="outline" className="text-[10px] ml-2 border-warning/30 text-zod-light">
              Zod Engine
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Valor FOB Total</p>
              <p className="text-lg font-bold text-foreground font-display">${tributos.totalFOB.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Peso Total</p>
              <p className="text-lg font-bold text-foreground font-display">{tributos.totalPeso.toFixed(2)} kg</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">DAI (Est. 10%)</p>
              <p className="text-lg font-bold text-foreground font-display">${tributos.dai.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ITBMS (7%)</p>
              <p className="text-lg font-bold text-foreground font-display">${tributos.itbms.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tasa ANA</p>
              <p className="text-lg font-bold text-foreground font-display">${tributos.tasaANA.toFixed(2)}</p>
            </div>
            <div className="bg-primary/10 rounded-lg p-2">
              <p className="text-xs text-primary">Total Estimado</p>
              <p className="text-xl font-bold text-primary font-display">${tributos.total.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Alertas Zod Globales ─── */}
      {alertasZod.length > 0 && (
        <div className="space-y-2">
          {alertasZod.filter(a => a.severidad === 'error').length > 0 && (
            <Alert variant="destructive">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Zod:</strong> {alertasZod.filter(a => a.severidad === 'error').length} error(es) detectado(s).
                Corrija antes de continuar.
              </AlertDescription>
            </Alert>
          )}
          {tieneWarnings && !tieneErrores && (
            <Alert className="border-warning/30 bg-warning/5">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning">
                <strong>Zod:</strong> {alertasZod.filter(a => a.severidad === 'warning').length} advertencia(s) de posible subvaluación.
                Revise antes de enviar.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* ─── Botones ─── */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <div className="flex items-center gap-3">
          {!tieneErrores && (
            <div className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Validación Zod OK
            </div>
          )}
          <Button
            onClick={handleSubmit}
            disabled={tieneErrores}
            className={cn(
              'gap-2',
              !tieneErrores && 'btn-primary'
            )}
          >
            <DollarSign className="w-4 h-4" />
            Registrar Declaración
          </Button>
        </div>
      </div>
    </div>
  );
}
