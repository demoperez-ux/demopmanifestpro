import { useState, useMemo } from 'react';
import {
  Ship, Plane, AlertTriangle, CheckCircle2, Info,
  Sparkles, ChevronDown, ChevronUp, Scale,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  calcularCIFPorIncoterm,
  listarIncoterms,
  obtenerInfoIncoterm,
  type Incoterm2020,
  type ResultadoCIF,
  type CostosTransporte,
} from '@/lib/gs1/MotorIncoterms2020';

// ── Types ──

export interface ValuationResult {
  incoterm: Incoterm2020;
  valorDeclarado: number;
  fob: number;
  flete: number;
  seguro: number;
  cif: number;
  metodoValoracion: string;
  fundamentoLegal: string;
  stellaCitation: string;
  zodAlertas: string[];
  completenessScore: number;
  missingElements: string[];
}

interface ValuationAssistantProps {
  /** Called whenever the valuation changes so the parent can update its calculation */
  onValuationChange: (result: ValuationResult) => void;
  /** Current FOB value from parent (for display sync) */
  currentFob?: number;
}

// ── Constants ──

const INCOTERMS_LIST = listarIncoterms();

const METODO_VALORACION = {
  id: 1,
  nombre: 'Método 1: Valor de Transacción',
  articulo: 'Art. 1 del Acuerdo relativo a la Aplicación del Artículo VII del GATT de 1994 (Acuerdo de Valoración de la OMC)',
  descripcion: 'El valor en aduana se determina sobre la base del precio realmente pagado o por pagar por las mercancías cuando éstas se venden para su exportación al país de importación.',
  condiciones: [
    'No existen restricciones a la cesión o utilización de las mercancías',
    'La venta no depende de condiciones cuyo valor no pueda determinarse',
    'No revierte al vendedor parte alguna del producto de la reventa',
    'No existe vinculación entre comprador y vendedor, o la vinculación no afecta al precio',
  ],
};

// ── Helpers ──

function evaluateCompleteness(
  incoterm: Incoterm2020,
  valorDeclarado: number,
  costos: Partial<CostosTransporte>
): { score: number; missing: string[] } {
  const regla = obtenerInfoIncoterm(incoterm);
  const missing: string[] = [];
  let total = 3; // base: valor, incoterm, at least one cost
  let present = 1; // incoterm is selected

  if (valorDeclarado > 0) present++;
  else missing.push('Valor declarado');

  // Check required cost elements based on incoterm
  if (!regla.incluyeFleteInternacional) {
    total++;
    if (costos.fleteInternacional && costos.fleteInternacional > 0) present++;
    else missing.push('Flete internacional');
  }

  if (!regla.incluyeSeguro) {
    total++;
    if (costos.seguroInternacional && costos.seguroInternacional > 0) present++;
    else missing.push('Seguro internacional');
  }

  if (incoterm === 'EXW') {
    total += 2;
    if (costos.fleteInternoOrigen && costos.fleteInternoOrigen > 0) present++;
    else missing.push('Flete interno origen');
    if (costos.despachoExportacion && costos.despachoExportacion > 0) present++;
    else missing.push('Despacho de exportación');
  }

  if (incoterm === 'DDP') {
    total++;
    if (costos.derechosDutiPaid !== undefined) present++;
    else missing.push('Derechos DDP pagados');
  }

  return { score: Math.round((present / total) * 100), missing };
}

function buildStellaCitation(
  incoterm: Incoterm2020,
  resultado: ResultadoCIF,
  completeness: { score: number; missing: string[] }
): string {
  const regla = obtenerInfoIncoterm(incoterm);
  const parts: string[] = [];

  // Method citation
  parts.push(
    `Método de Valoración Aplicado: ${METODO_VALORACION.nombre}. ` +
    `${METODO_VALORACION.articulo}. ` +
    `"${METODO_VALORACION.descripcion}"`
  );

  // Incoterm analysis
  parts.push(
    `Incoterm ICC 2020: ${incoterm} (${regla.nombre}). ` +
    `${resultado.fundamentoLegal}. ` +
    `Transferencia de riesgo: ${regla.riesgoTransferencia}.`
  );

  // Adjustments
  if (resultado.ajustesAplicados.length > 0) {
    parts.push(
      `Ajustes al Valor: Art. 8 del Acuerdo de Valoración OMC autoriza la adición de costos no incluidos ` +
      `en el precio de transacción: ${resultado.ajustesAplicados.join('; ')}.`
    );
  }

  // Theoretical insurance
  if (resultado.seguroTeorico) {
    parts.push(
      `Seguro Teórico: Art. 8.2(c) del Acuerdo de Valoración OMC. El seguro no fue declarado en la factura ` +
      `comercial; se aplica estimación del 1% sobre el valor FOB conforme a la práctica aduanera panameña.`
    );
  }

  // Completeness
  if (completeness.missing.length > 0) {
    parts.push(
      `Elementos Faltantes (${completeness.score}% completo): ${completeness.missing.join(', ')}. ` +
      `Se recomienda documentar todos los elementos del costo para evitar ajustes de la ANA en fiscalización posterior.`
    );
  } else {
    parts.push(
      `Documentación Completa: Todos los elementos del costo están presentes. ` +
      `El expediente cumple con los requisitos documentales del Art. 1 del Acuerdo de Valoración OMC.`
    );
  }

  return parts.join('\n\n');
}

// ── Component ──

export function ValuationAssistant({ onValuationChange, currentFob }: ValuationAssistantProps) {
  const [incoterm, setIncoterm] = useState<Incoterm2020>('FOB');
  const [valorDeclarado, setValorDeclarado] = useState('');
  const [fleteIntl, setFleteIntl] = useState('');
  const [seguroIntl, setSeguroIntl] = useState('');
  const [fleteInterno, setFleteInterno] = useState('');
  const [despachoExport, setDespachoExport] = useState('');
  const [derechosDDP, setDerechosDDP] = useState('');
  const [otrosGastos, setOtrosGastos] = useState('');
  const [showMethod, setShowMethod] = useState(false);

  const numValor = parseFloat(valorDeclarado) || currentFob || 0;
  const regla = obtenerInfoIncoterm(incoterm);

  // Build cost object
  const costos: Partial<CostosTransporte> = useMemo(() => {
    const c: Partial<CostosTransporte> = {};
    const f = parseFloat(fleteIntl);
    const s = parseFloat(seguroIntl);
    const fi = parseFloat(fleteInterno);
    const de = parseFloat(despachoExport);
    const dd = parseFloat(derechosDDP);

    if (!isNaN(f) && f > 0) c.fleteInternacional = f;
    if (!isNaN(s) && s > 0) c.seguroInternacional = s;
    if (!isNaN(fi) && fi > 0) c.fleteInternoOrigen = fi;
    if (!isNaN(de) && de > 0) c.despachoExportacion = de;
    if (!isNaN(dd)) c.derechosDutiPaid = dd;

    return c;
  }, [fleteIntl, seguroIntl, fleteInterno, despachoExport, derechosDDP]);

  // Calculate CIF
  const resultado = useMemo<ResultadoCIF | null>(() => {
    if (numValor <= 0) return null;
    return calcularCIFPorIncoterm(numValor, incoterm, costos);
  }, [numValor, incoterm, costos]);

  const completeness = useMemo(() => {
    return evaluateCompleteness(incoterm, numValor, costos);
  }, [incoterm, numValor, costos]);

  const stellaCitation = useMemo(() => {
    if (!resultado) return '';
    return buildStellaCitation(incoterm, resultado, completeness);
  }, [resultado, incoterm, completeness]);

  // Emit changes to parent
  useMemo(() => {
    if (!resultado) return;
    const numOtros = parseFloat(otrosGastos) || 0;
    onValuationChange({
      incoterm,
      valorDeclarado: numValor,
      fob: resultado.valorFOB,
      flete: resultado.valorFlete,
      seguro: resultado.valorSeguro,
      cif: resultado.valorCIF + numOtros,
      metodoValoracion: METODO_VALORACION.nombre,
      fundamentoLegal: resultado.fundamentoLegal,
      stellaCitation,
      zodAlertas: resultado.zodAlertasRequeridas,
      completenessScore: completeness.score,
      missingElements: completeness.missing,
    });
  }, [resultado, stellaCitation, incoterm, numValor, otrosGastos, completeness, onValuationChange]);

  // Determine which extra fields to show
  const needsFlete = !regla.incluyeFleteInternacional;
  const needsSeguro = !regla.incluyeSeguro;
  const isEXW = incoterm === 'EXW';
  const isDDP = incoterm === 'DDP';

  return (
    <div className="space-y-4">
      {/* Incoterm Selector */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            Asistente de Valoración OMC
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Incoterm */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Incoterm ICC 2020</Label>
            <Select value={incoterm} onValueChange={(v) => setIncoterm(v as Incoterm2020)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INCOTERMS_LIST.map(ic => (
                  <SelectItem key={ic.codigo} value={ic.codigo}>
                    <div className="flex items-center gap-2">
                      {ic.modo === 'Solo Marítimo' ? (
                        <Ship className="w-3 h-3 text-primary flex-shrink-0" />
                      ) : (
                        <Plane className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="font-mono font-medium">{ic.codigo}</span>
                      <span className="text-muted-foreground text-xs">— {ic.nombre}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{regla.descripcion}</p>
          </div>

          {/* Declared Value */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Valor Declarado ({incoterm}) USD
            </Label>
            <Input
              type="number"
              placeholder="0.00"
              value={valorDeclarado}
              onChange={e => setValorDeclarado(e.target.value)}
              className="font-mono text-sm"
              min="0"
              step="0.01"
            />
          </div>

          <Separator />

          {/* Dynamic Cost Fields */}
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Elementos del Costo
          </p>

          {/* Flete Internacional — shown when incoterm doesn't include it OR for decomposition */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">Flete Internacional (USD)</Label>
              {!needsFlete && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-muted/50">Incluido en {incoterm}</Badge>
              )}
            </div>
            <Input
              type="number"
              placeholder={needsFlete ? 'Requerido' : 'Desglose opcional'}
              value={fleteIntl}
              onChange={e => setFleteIntl(e.target.value)}
              className={cn('font-mono text-sm', needsFlete && !fleteIntl && 'border-warning/50')}
              min="0"
              step="0.01"
            />
          </div>

          {/* Seguro Internacional */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">Seguro Internacional (USD)</Label>
              {!needsSeguro && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-muted/50">Incluido en {incoterm}</Badge>
              )}
            </div>
            <Input
              type="number"
              placeholder={needsSeguro ? 'Requerido (o teórico)' : 'Desglose opcional'}
              value={seguroIntl}
              onChange={e => setSeguroIntl(e.target.value)}
              className={cn('font-mono text-sm', needsSeguro && !seguroIntl && 'border-warning/50')}
              min="0"
              step="0.01"
            />
          </div>

          {/* EXW extras */}
          {isEXW && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Flete Interno Origen (USD)</Label>
                <Input
                  type="number"
                  placeholder="Fábrica → puerto/aeropuerto"
                  value={fleteInterno}
                  onChange={e => setFleteInterno(e.target.value)}
                  className={cn('font-mono text-sm', !fleteInterno && 'border-warning/50')}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Despacho de Exportación (USD)</Label>
                <Input
                  type="number"
                  placeholder="Gastos aduaneros de exportación"
                  value={despachoExport}
                  onChange={e => setDespachoExport(e.target.value)}
                  className="font-mono text-sm"
                  min="0"
                  step="0.01"
                />
              </div>
            </>
          )}

          {/* DDP deduction */}
          {isDDP && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Derechos DDP Pagados (USD)</Label>
              <Input
                type="number"
                placeholder="Impuestos incluidos en DDP"
                value={derechosDDP}
                onChange={e => setDerechosDDP(e.target.value)}
                className={cn('font-mono text-sm', !derechosDDP && 'border-warning/50')}
                min="0"
                step="0.01"
              />
            </div>
          )}

          {/* Otros Gastos */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Otros Gastos Art. 8 OMC (USD)</Label>
            <Input
              type="number"
              placeholder="Comisiones, envases, etc."
              value={otrosGastos}
              onChange={e => setOtrosGastos(e.target.value)}
              className="font-mono text-sm"
              min="0"
              step="0.01"
            />
          </div>
        </CardContent>
      </Card>

      {/* Completeness & CIF Result */}
      {resultado && (
        <Card className="border border-border">
          <CardContent className="p-4 space-y-3">
            {/* Completeness bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Completitud Documental</span>
                <span className={cn(
                  'font-mono font-bold',
                  completeness.score >= 100 ? 'text-success' :
                  completeness.score >= 70 ? 'text-warning' :
                  'text-destructive'
                )}>
                  {completeness.score}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    completeness.score >= 100 ? 'bg-success' :
                    completeness.score >= 70 ? 'bg-warning' :
                    'bg-destructive'
                  )}
                  style={{ width: `${completeness.score}%` }}
                />
              </div>
              {completeness.missing.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {completeness.missing.map(m => (
                    <Badge key={m} variant="outline" className="text-[9px] px-1.5 py-0 text-warning border-warning/20">
                      {m}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* CIF Breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">FOB Calculado</span>
                <span className="font-mono text-foreground">B/. {resultado.valorFOB.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Flete {resultado.fleteEstimado && '(estimado)'}
                </span>
                <span className={cn('font-mono', resultado.fleteEstimado ? 'text-warning' : 'text-foreground')}>
                  B/. {resultado.valorFlete.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Seguro {resultado.seguroTeorico && '(teórico 1%)'}
                </span>
                <span className={cn('font-mono', resultado.seguroTeorico ? 'text-warning' : 'text-foreground')}>
                  B/. {resultado.valorSeguro.toFixed(2)}
                </span>
              </div>
              {(parseFloat(otrosGastos) || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Otros Gastos Art. 8</span>
                  <span className="font-mono text-foreground">B/. {(parseFloat(otrosGastos) || 0).toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between">
                <span className="font-semibold text-foreground">Valor CIF Aduanero</span>
                <span className="font-mono font-bold text-primary text-sm">
                  B/. {(resultado.valorCIF + (parseFloat(otrosGastos) || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Adjustments applied */}
            {resultado.ajustesAplicados.length > 0 && (
              <div className="space-y-1 pt-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Ajustes Aplicados</p>
                {resultado.ajustesAplicados.map((a, i) => (
                  <p key={i} className="text-[10px] text-warning flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    {a}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Zod Alerts */}
      {resultado && resultado.zodAlertasRequeridas.length > 0 && (
        <Card className="border-l-4 border-l-warning bg-warning-light">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground">Zod — Alertas de Integridad</p>
                <div className="space-y-1.5 mt-2">
                  {resultado.zodAlertasRequeridas.map((alerta, i) => (
                    <p key={i} className="text-xs text-foreground/80 leading-relaxed">{alerta}</p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stella — Valuation Method Citation */}
      {resultado && (
        <Card className="border-l-4 border-l-primary bg-info-light">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    Stella — Expediente de Valoración
                  </p>
                  {completeness.score >= 100 && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-success/10 text-success border-success/20 gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Completo
                    </Badge>
                  )}
                </div>
                <div className="space-y-2.5 mt-2">
                  {stellaCitation.split('\n\n').map((p, i) => (
                    <p key={i} className="text-xs text-foreground/80 leading-relaxed">{p}</p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Method Details Toggle */}
      <button
        onClick={() => setShowMethod(!showMethod)}
        className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-1"
      >
        <Info className="w-3 h-3" />
        {showMethod ? 'Ocultar' : 'Ver'} condiciones del Método 1 — Valor de Transacción
        {showMethod ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {showMethod && (
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-foreground mb-2">{METODO_VALORACION.nombre}</p>
            <p className="text-[10px] text-muted-foreground mb-3">{METODO_VALORACION.articulo}</p>
            <p className="text-xs text-foreground/80 mb-3 italic">"{METODO_VALORACION.descripcion}"</p>
            <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Condiciones de aplicación:</p>
            <ul className="space-y-1">
              {METODO_VALORACION.condiciones.map((c, i) => (
                <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0 mt-0.5" />
                  {c}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
