import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calculator, Info, ShieldCheck, AlertTriangle, FileText } from 'lucide-react';
import { calcularLiquidacionOficial } from '@/lib/liquidacion/calculadoraOficial';
import { CONSTANTES_ANA } from '@/types/declaracionOficial';

// DAI presets by common HS categories
const DAI_PRESETS = [
  { label: 'Exento (0%)', value: 0 },
  { label: '3%', value: 3 },
  { label: '5%', value: 5 },
  { label: '6.5%', value: 6.5 },
  { label: '10%', value: 10 },
  { label: '15%', value: 15 },
  { label: '20%', value: 20 },
  { label: '25%', value: 25 },
  { label: '30%', value: 30 },
  { label: '40%', value: 40 },
];

const ITBM_OPTIONS = [
  { label: 'Exento (0%)', value: 0 },
  { label: 'Estándar (7%)', value: 7 },
  { label: 'Selectivo (10%)', value: 10 },
  { label: 'Licores y Tabaco (15%)', value: 15 },
];

const ISC_OPTIONS = [
  { label: 'No aplica (0%)', value: 0 },
  { label: '5%', value: 5 },
  { label: '10%', value: 10 },
  { label: '15%', value: 15 },
  { label: '20%', value: 20 },
];

function formatBalboas(amount: number): string {
  return `B/. ${amount.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getCategoria(cif: number): { label: string; color: string; desc: string } {
  if (cif <= 0) return { label: '—', color: 'secondary', desc: '' };
  if (cif <= CONSTANTES_ANA.UMBRAL_DE_MINIMIS) return { label: 'Categoría B', color: 'default', desc: 'De Minimis — Exento de tributos' };
  if (cif <= CONSTANTES_ANA.UMBRAL_CORREDOR_OBLIGATORIO) return { label: 'Categoría C', color: 'default', desc: 'Valor Bajo — Cascada fiscal completa' };
  return { label: 'Categoría D', color: 'destructive', desc: 'Valor Alto — Requiere Corredor de Aduanas' };
}

function getStellaInsight(daiPercent: number, itbmPercent: number, iscPercent: number, cif: number): string {
  const parts: string[] = [];

  if (cif <= CONSTANTES_ANA.UMBRAL_DE_MINIMIS && cif > 0) {
    parts.push('Artículo 2, Decreto Ejecutivo 98 de 2010: Envíos con valor CIF igual o inferior a B/. 100.00 están exentos de tributos aduaneros (De Minimis).');
  }

  if (daiPercent === 0) {
    parts.push('DAI 0%: Posible aplicación de desgravación arancelaria por TLC o régimen especial. Verificar Certificado de Origen válido.');
  } else if (daiPercent >= 20) {
    parts.push(`DAI ${daiPercent}%: Tarifa arancelaria elevada. Verificar clasificación exacta en el Arancel Nacional de Importación para confirmar la fracción aplicable.`);
  }

  if (itbmPercent === 0) {
    parts.push('ITBM Exento: Artículos clasificados como bienes de primera necesidad, medicamentos o insumos agrícolas pueden estar exentos del ITBM según Código Fiscal, Art. 1057-V.');
  } else if (itbmPercent > 7) {
    parts.push(`ITBM ${itbmPercent}%: Tasa selectiva aplicable a bebidas alcohólicas, tabaco y productos de lujo según Ley 8 de 2010.`);
  }

  if (iscPercent > 0) {
    parts.push(`ISC ${iscPercent}%: Impuesto Selectivo al Consumo aplicable. Verificar que la fracción arancelaria corresponde a la categoría gravada.`);
  }

  if (cif > CONSTANTES_ANA.UMBRAL_CORREDOR_OBLIGATORIO) {
    parts.push('Decreto 41 de 2002, Art. 15: Importaciones con valor CIF superior a B/. 2,000.00 requieren intervención obligatoria de un Corredor de Aduanas licenciado.');
  }

  parts.push('Tasa SIGA B/. 3.00: Cargo fijo por uso del Sistema Integrado de Gestión Aduanera, aplicable a todas las declaraciones.');

  return parts.join('\n\n');
}

export default function TaxSimulatorPage() {
  const [fob, setFob] = useState<string>('');
  const [freight, setFreight] = useState<string>('');
  const [insurance, setInsurance] = useState<string>('');
  const [daiPercent, setDaiPercent] = useState<number>(10);
  const [itbmPercent, setItbmPercent] = useState<number>(7);
  const [iscPercent, setIscPercent] = useState<number>(0);
  const [incluirTasa, setIncluirTasa] = useState(true);
  const [autoInsurance, setAutoInsurance] = useState(false);

  const numFob = parseFloat(fob) || 0;
  const numFreight = parseFloat(freight) || 0;
  const rawInsurance = parseFloat(insurance) || 0;
  const numInsurance = autoInsurance ? numFob * (CONSTANTES_ANA.SEGURO_TEORICO_PERCENT / 100) : rawInsurance;

  const result = useMemo(() => {
    if (numFob <= 0) return null;
    return calcularLiquidacionOficial(numFob, numFreight, numInsurance, {
      daiPercent,
      iscPercent,
      itbmPercent,
      incluirTasaSistema: incluirTasa,
    });
  }, [numFob, numFreight, numInsurance, daiPercent, iscPercent, itbmPercent, incluirTasa]);

  const categoria = getCategoria(result?.valorCIF ?? 0);
  const stellaInsight = getStellaInsight(daiPercent, itbmPercent, iscPercent, result?.valorCIF ?? 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            ZENITH Tax Simulator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calculadora de Liquidación Aduanera — Modelo Oficial ANA 2026
          </p>
        </div>
        {result && (
          <Badge variant={categoria.color as any} className="text-xs">
            {categoria.label}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Input */}
        <div className="space-y-4">
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Valores de Importación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Valor FOB (USD)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={fob}
                  onChange={e => setFob(e.target.value)}
                  className="font-mono text-sm"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Flete (USD)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={freight}
                  onChange={e => setFreight(e.target.value)}
                  className="font-mono text-sm"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">Seguro (USD)</Label>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={autoInsurance}
                      onCheckedChange={setAutoInsurance}
                      className="scale-75"
                    />
                    <span className="text-[10px] text-muted-foreground">Teórico ({CONSTANTES_ANA.SEGURO_TEORICO_PERCENT}%)</span>
                  </div>
                </div>
                {autoInsurance ? (
                  <div className="h-10 flex items-center px-3 rounded-md border border-input bg-muted/50 font-mono text-sm text-muted-foreground">
                    {numInsurance.toFixed(2)}
                  </div>
                ) : (
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={insurance}
                    onChange={e => setInsurance(e.target.value)}
                    className="font-mono text-sm"
                    min="0"
                    step="0.01"
                  />
                )}
              </div>

              {result && (
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Valor CIF</span>
                    <span className="text-sm font-semibold font-mono text-foreground">{formatBalboas(result.valorCIF)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Configuración Tributaria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">DAI — Impuesto de Importación</Label>
                <Select value={String(daiPercent)} onValueChange={v => setDaiPercent(Number(v))}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAI_PRESETS.map(p => (
                      <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">ITBM</Label>
                <Select value={String(itbmPercent)} onValueChange={v => setItbmPercent(Number(v))}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITBM_OPTIONS.map(p => (
                      <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">ISC — Impuesto Selectivo</Label>
                <Select value={String(iscPercent)} onValueChange={v => setIscPercent(Number(v))}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISC_OPTIONS.map(p => (
                      <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Label className="text-xs font-medium text-muted-foreground">Tasa SIGA (B/. 3.00)</Label>
                <Switch checked={incluirTasa} onCheckedChange={setIncluirTasa} className="scale-75" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Column — Results */}
        <div className="space-y-4">
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Desglose de Liquidación
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Ingrese un valor FOB para calcular la liquidación.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Valores base */}
                  <div className="space-y-1.5 text-sm">
                    <Row label="F.O.B." value={formatBalboas(result.valorFOB)} muted />
                    <Row label="Flete" value={formatBalboas(result.valorFlete)} muted />
                    <Row label="Seguro" value={formatBalboas(result.valorSeguro)} muted />
                    <Separator className="my-2" />
                    <Row label="Valor CIF" value={formatBalboas(result.valorCIF)} bold />
                  </div>

                  <Separator />

                  {/* Tributos */}
                  <div className="space-y-1.5 text-sm">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Tributos</p>
                    <Row label={`DAI (${daiPercent}%)`} value={formatBalboas(result.montoDAI)} />
                    <Row label={`ISC (${iscPercent}%)`} value={formatBalboas(result.montoISC)} />
                    <Row label={`ITBM (${itbmPercent}%)`} value={formatBalboas(result.montoITBM)} />
                    <Row label="ICCDP" value={formatBalboas(result.montoICCDP)} muted />
                    <Separator className="my-2" />
                    <Row label="Total Tributos" value={formatBalboas(result.totalTributos)} bold />
                  </div>

                  {incluirTasa && (
                    <>
                      <Separator />
                      <Row label="Tasa SIGA" value={formatBalboas(result.tasaSistema)} muted />
                    </>
                  )}

                  <Separator />

                  {/* Total */}
                  <div className="bg-primary/5 border border-primary/10 rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Total a Pagar</span>
                      <span className="text-lg font-bold font-mono text-primary">{formatBalboas(result.totalAPagar)}</span>
                    </div>
                  </div>

                  {/* Recargos */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Escenarios de Recargo</p>
                    <Row label="Recargo 10% (6–10 días)" value={formatBalboas(result.montoRecargo10)} />
                    <Row label="Recargo 20% (>10 días)" value={formatBalboas(result.montoRecargo20)} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cascada fiscal visual */}
          {result && (
            <Card className="border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground">Cascada Fiscal ANA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs font-mono">
                  <CascadeStep label="CIF" formula="FOB + Flete + Seguro" result={formatBalboas(result.valorCIF)} />
                  <CascadeStep label="DAI" formula={`CIF × ${daiPercent}%`} result={formatBalboas(result.montoDAI)} indent />
                  <CascadeStep label="ISC" formula={`(CIF + DAI) × ${iscPercent}%`} result={formatBalboas(result.montoISC)} indent />
                  <CascadeStep label="ITBM" formula={`(CIF + DAI + ISC) × ${itbmPercent}%`} result={formatBalboas(result.montoITBM)} indent />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column — Stella Insights */}
        <div className="space-y-4">
          <Card className="border border-primary/15 bg-info-light">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Stella — Asesoría de Cumplimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-3">
                  {stellaInsight.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="text-xs text-foreground/80 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Configure los valores de importación para recibir asesoría fiscal contextual de Stella.
                </p>
              )}
            </CardContent>
          </Card>

          {result && categoria.desc && (
            <Card className="border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Clasificación ANA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant={categoria.color as any} className="text-xs">
                  {categoria.label}
                </Badge>
                <p className="text-xs text-muted-foreground">{categoria.desc}</p>
              </CardContent>
            </Card>
          )}

          {result && result.valorCIF > CONSTANTES_ANA.UMBRAL_CORREDOR_OBLIGATORIO && (
            <Card className="border border-warning/20 bg-warning-light">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Zod — Alerta de Riesgo Legal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  El valor CIF de {formatBalboas(result.valorCIF)} excede el umbral de B/. 2,000.00.
                  De acuerdo con el Decreto 41 de 2002, esta importación requiere la intervención
                  obligatoria de un Corredor de Aduanas licenciado. La declaración no puede ser
                  procesada sin la firma digital del corredor autorizado.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Subcomponents
function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${muted ? 'text-muted-foreground' : 'text-foreground/80'}`}>{label}</span>
      <span className={`font-mono text-xs ${bold ? 'font-semibold text-foreground' : muted ? 'text-muted-foreground' : 'text-foreground/80'}`}>
        {value}
      </span>
    </div>
  );
}

function CascadeStep({ label, formula, result, indent }: { label: string; formula: string; result: string; indent?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${indent ? 'pl-4' : ''}`}>
      {indent && <span className="text-muted-foreground">└</span>}
      <span className="font-semibold text-foreground w-10">{label}</span>
      <span className="text-muted-foreground flex-1">= {formula}</span>
      <span className="text-foreground font-medium">{result}</span>
    </div>
  );
}
