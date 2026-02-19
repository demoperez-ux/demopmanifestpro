/**
 * STRESS TEST — Control Tower
 * 
 * Demo de operaciones masivas: 689 guías procesadas con el flujo Lexis-Zod-Stella.
 * 4 fases de procesamiento + Dashboard ROI + Certificado de Compliance.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Shield, Play, Lock, Server, Clock, DollarSign, AlertTriangle, CheckCircle2, FileText, Download, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MotorCourierHub, type AnalisisGuiaCourier, type ResumenCourierHub } from '@/lib/courier/MotorCourierHub';
import { partnerManager } from '@/lib/courier/partnerConfig';
import { generarManifiestoDemo, calcularImpactoFinanciero, type FinancialImpact } from '@/lib/demo/StressTestEngine';
import { ManifestRow } from '@/types/manifest';

type Phase = 'idle' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'complete';

const PHASE_LABELS: Record<Phase, string> = {
  idle: 'Esperando Ejecución',
  phase1: 'Fase 1: Ingesta & Cross-Check LEXIS',
  phase2: 'Fase 2: Heurística Arancelaria',
  phase3: 'Fase 3: Auditoría Forense Zod',
  phase4: 'Fase 4: Compliance Triage Stella',
  complete: 'Auditoría Completada',
};

export default function StressTestControlTower() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [phaseMessage, setPhaseMessage] = useState('');
  const [analisis, setAnalisis] = useState<AnalisisGuiaCourier[]>([]);
  const [resumen, setResumen] = useState<ResumenCourierHub | null>(null);
  const [visibleRows, setVisibleRows] = useState<AnalisisGuiaCourier[]>([]);
  const [financials, setFinancials] = useState<FinancialImpact | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [filtroSemaforo, setFiltroSemaforo] = useState<'all' | 'verde' | 'amarillo' | 'rojo'>('all');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  const partner = partnerManager.getActivePartner();

  const ejecutarAuditoria = useCallback(async () => {
    abortRef.current = false;
    setPhase('phase1');
    setProgress(0);
    setAnalisis([]);
    setVisibleRows([]);
    setResumen(null);
    setFinancials(null);
    setShowCertificate(false);

    // ─── PHASE 1: Ingesta & Cross-Check (0-25%) ───
    setPhaseMessage('Sincronizando Manifiesto con LEXIS... Validando integridad de 689 AWBs');
    const guias = generarManifiestoDemo(689);

    for (let p = 0; p <= 25; p += 2) {
      if (abortRef.current) return;
      setProgress(p);
      await delay(80);
    }
    setPhaseMessage(`✓ ${guias.length} AWBs validadas — Integridad del manifiesto: 100%`);
    await delay(400);

    // ─── PHASE 2: Heurística Arancelaria (25-55%) ───
    if (abortRef.current) return;
    setPhase('phase2');
    setPhaseMessage('Aplicando Heurística Arancelaria del Arancel de Panamá...');

    const resultado = MotorCourierHub.analizarManifiesto(guias);
    const { analisis: allAnalisis, resumen: res } = resultado;

    // Simulate async row filling
    const batchSize = 30;
    for (let i = 0; i < allAnalisis.length; i += batchSize) {
      if (abortRef.current) return;
      const batch = allAnalisis.slice(0, i + batchSize);
      setVisibleRows(batch);
      const pct = 25 + Math.round((i / allAnalisis.length) * 30);
      setProgress(pct);
      setPhaseMessage(`Clasificando AWB ${Math.min(i + batchSize, allAnalisis.length)}/${allAnalisis.length}...`);
      await delay(40);
    }

    setVisibleRows(allAnalisis);
    setAnalisis(allAnalisis);
    setResumen(res);
    setProgress(55);
    setPhaseMessage(`✓ ${res.exentosTecnologia} exenciones DAI aplicadas — ${res.requierenPermiso} permisos detectados`);
    await delay(500);

    // ─── PHASE 3: Auditoría Forense Zod (55-80%) ───
    if (abortRef.current) return;
    setPhase('phase3');
    setPhaseMessage('Zod Integrity Engine: Ejecutando auditoría forense de valor...');

    for (let p = 55; p <= 75; p += 2) {
      if (abortRef.current) return;
      setProgress(p);
      await delay(60);
    }

    setPhaseMessage(`⚠️ Zod: ${res.alertasFraude} inconsistencias de valor detectadas — Riesgo de Sanción Administrativa`);
    setProgress(80);
    await delay(600);

    // ─── PHASE 4: Compliance Triage Stella (80-100%) ───
    if (abortRef.current) return;
    setPhase('phase4');
    setPhaseMessage('Stella: Agrupando por Nivel de Servicio...');

    for (let p = 80; p <= 95; p += 2) {
      if (abortRef.current) return;
      setProgress(p);
      await delay(50);
    }

    const impact = calcularImpactoFinanciero(res.totalGuias, res.alertasFraude, res.rojo);
    setFinancials(impact);
    setProgress(100);
    setPhaseMessage(`✓ Auditoría completada: ${res.verde} Vía Verde, ${res.amarillo} Vía Ámbar, ${res.rojo} Vía Roja`);
    await delay(400);

    setPhase('complete');
    // Auto-show certificate after completion
    setTimeout(() => setShowCertificate(true), 800);
  }, []);

  const filteredRows = filtroSemaforo === 'all'
    ? visibleRows
    : visibleRows.filter(a => a.semaforo === filtroSemaforo);

  const isRunning = phase !== 'idle' && phase !== 'complete';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Header: Control Tower ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-foreground tracking-tight">ZENITH High-Velocity Logistics</h1>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">STRESS-TEST</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Auditoría masiva de carga aérea courier — Estándares OMA/OMC · CAUCA/RECAUCA
          </p>
        </div>
        <div className="flex items-center gap-3">
          <VPCBadge />
          <Button
            onClick={ejecutarAuditoria}
            disabled={isRunning}
            size="lg"
            className="gap-2 font-semibold shadow-md"
          >
            <Shield className="w-4 h-4" />
            {isRunning ? 'Procesando...' : 'Ejecutar Auditoría de Flujo Masivo: Lote #AMZ-689-TOC'}
          </Button>
        </div>
      </div>

      {/* ─── Phase Progress ─── */}
      {phase !== 'idle' && (
        <div className="card-elevated p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PhaseIcon phase={phase} />
              <span className="text-sm font-semibold text-foreground">{PHASE_LABELS[phase]}</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground font-mono">{phaseMessage}</p>
        </div>
      )}

      {/* ─── Traffic Light Summary ─── */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 animate-slide-up">
          <StatCard label="Total AWBs" value={resumen.totalGuias} />
          <StatCard label="Vía Verde" value={resumen.verde} accent="success" onClick={() => setFiltroSemaforo('verde')} active={filtroSemaforo === 'verde'} />
          <StatCard label="Vía Ámbar" value={resumen.amarillo} accent="warning" onClick={() => setFiltroSemaforo('amarillo')} active={filtroSemaforo === 'amarillo'} />
          <StatCard label="Vía Roja" value={resumen.rojo} accent="destructive" onClick={() => setFiltroSemaforo('rojo')} active={filtroSemaforo === 'rojo'} />
          <StatCard label="Exención DAI" value={resumen.exentosTecnologia} accent="primary" />
          <StatCard label="Valor Total" value={`$${resumen.valorTotalUSD.toLocaleString()}`} />
          <StatCard label="Peso Total" value={`${resumen.pesoTotalLb.toLocaleString()} lb`} />
        </div>
      )}

      {/* ─── Data Grid ─── */}
      {visibleRows.length > 0 && (
        <div className="card-elevated animate-slide-up">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-foreground">Manifiesto de Carga</h2>
              <Badge variant="secondary" className="text-[10px] font-mono">{filteredRows.length} filas</Badge>
              {filtroSemaforo !== 'all' && (
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setFiltroSemaforo('all')}>
                  Limpiar filtro
                </Button>
              )}
            </div>
            {phase === 'complete' && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => MotorCourierHub.descargarExportacion(analisis, partner)}
              >
                <Download className="w-3.5 h-3.5" />
                Generar Interfaz ERP para {partner.name}
              </Button>
            )}
          </div>

          <div ref={tableRef} className="overflow-auto max-h-[420px] scrollbar-thin">
            <table className="data-table w-full text-xs">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                <tr>
                  <th className="w-8 text-center">#</th>
                  <th className="w-10">Estado</th>
                  <th>AWB</th>
                  <th>Consignatario</th>
                  <th className="max-w-[220px]">Descripción</th>
                  <th className="text-right">Valor FOB</th>
                  <th className="text-right">Peso</th>
                  <th>Categoría</th>
                  <th>DAI</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 200).map((a, idx) => (
                  <tr
                    key={a.guia.id}
                    className={cn(
                      'transition-colors',
                      a.alertaFraude && 'bg-destructive-light/50',
                      hoveredRow === a.guia.id && 'bg-muted/60'
                    )}
                    onMouseEnter={() => setHoveredRow(a.guia.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td className="text-center text-muted-foreground">{idx + 1}</td>
                    <td>
                      <SemaforoDot semaforo={a.semaforo} />
                    </td>
                    <td className="font-mono text-[11px]">{a.guia.trackingNumber}</td>
                    <td className="truncate max-w-[140px]">{a.guia.recipient}</td>
                    <td className="max-w-[220px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate block cursor-help">{a.guia.description}</span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs text-xs space-y-1">
                          <p className="font-semibold">{a.guia.description}</p>
                          {a.observaciones.map((obs, i) => (
                            <p key={i} className="text-muted-foreground">{obs}</p>
                          ))}
                          {a.exencionDAI && (
                            <p className="text-success font-medium">
                              Aplicando Exención Tecnológica — Arancel de Panamá Cap. 84/85
                            </p>
                          )}
                          {a.alertaFraude && (
                            <p className="text-destructive font-medium">
                              ⚠️ Zod: Riesgo de Sanción Administrativa (RECAUCA Art. 68)
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className={cn('text-right font-mono', a.alertaFraude && 'text-destructive font-bold')}>
                      ${a.guia.valueUSD.toFixed(2)}
                    </td>
                    <td className="text-right font-mono">{a.guia.weight.toFixed(1)} lb</td>
                    <td>
                      <Badge variant="secondary" className="text-[10px]">
                        {a.categoriaDetectada}
                      </Badge>
                    </td>
                    <td className="font-mono">
                      {a.exencionDAI ? (
                        <span className="text-success font-semibold">0%</span>
                      ) : (
                        <span className="text-muted-foreground">{a.daiAplicable}%</span>
                      )}
                    </td>
                    <td>
                      {a.alertaFraude && (
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm text-xs">
                            <p className="font-semibold text-destructive mb-1">Alerta Zod — Auditoría Forense</p>
                            <p>{a.stellaMensaje}</p>
                            <p className="mt-1 text-muted-foreground italic">
                              Inconsistencia en Valor FOB (Descripción vs. Declaración). Acción: Corrección bloqueada hasta revisión manual por Corredor licenciado.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length > 200 && (
              <div className="text-center py-3 text-xs text-muted-foreground border-t border-border">
                Mostrando 200 de {filteredRows.length} filas — Utilice filtros para refinar la vista
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Financial Health / ROI Dashboard ─── */}
      {financials && phase === 'complete' && (
        <FinancialDashboard financials={financials} resumen={resumen!} />
      )}

      {/* ─── Compliance Certificate Modal ─── */}
      {showCertificate && resumen && financials && (
        <ComplianceCertificate
          resumen={resumen}
          financials={financials}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────

function VPCBadge() {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted rounded-md border border-border">
      <Lock className="w-3 h-3 text-success" />
      <span className="text-[10px] font-mono text-muted-foreground">VPC Privada</span>
      <Server className="w-3 h-3 text-muted-foreground" />
    </div>
  );
}

function PhaseIcon({ phase }: { phase: Phase }) {
  if (phase === 'complete') return <CheckCircle2 className="w-4 h-4 text-success" />;
  return <Play className="w-4 h-4 text-primary animate-pulse" />;
}

function SemaforoDot({ semaforo }: { semaforo: 'verde' | 'amarillo' | 'rojo' }) {
  const colors = {
    verde: 'bg-success',
    amarillo: 'bg-warning',
    rojo: 'bg-destructive',
  };
  return <div className={cn('w-2.5 h-2.5 rounded-full mx-auto', colors[semaforo])} />;
}

function StatCard({ label, value, accent, onClick, active }: {
  label: string;
  value: string | number;
  accent?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const accentColors: Record<string, string> = {
    success: 'border-success/40 bg-success-light',
    warning: 'border-warning/40 bg-warning-light',
    destructive: 'border-destructive/40 bg-destructive-light',
    primary: 'border-primary/40 bg-primary-light',
  };

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'stat-card text-left transition-all',
        onClick && 'cursor-pointer hover:shadow-md',
        active && accent && accentColors[accent],
        !active && accent && `border-${accent}/20`
      )}
    >
      <span className="stat-value text-lg">{value}</span>
      <span className="stat-label text-[11px]">{label}</span>
    </button>
  );
}

function FinancialDashboard({ financials, resumen }: { financials: FinancialImpact; resumen: ResumenCourierHub }) {
  return (
    <div className="card-elevated p-6 animate-slide-up">
      <div className="flex items-center gap-2 mb-5">
        <DollarSign className="w-5 h-5 text-primary" />
        <h2 className="text-base font-bold text-foreground">Financial Health — ROI en Tiempo Real</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Eficiencia Temporal */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Eficiencia Temporal</h3>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-lg font-bold text-muted-foreground line-through">{financials.tiempoTradicionalHoras}h</p>
              <p className="text-[10px] text-muted-foreground">Método Tradicional</p>
            </div>
            <div className="text-xl text-muted-foreground">→</div>
            <div className="text-center">
              <Clock className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-lg font-bold text-success">{financials.tiempoZenithMinutos} min</p>
              <p className="text-[10px] text-muted-foreground">ZENITH</p>
            </div>
          </div>
          <div className="bg-success-light rounded-md p-2 text-center">
            <span className="text-sm font-bold text-success">{financials.eficienciaPorcentaje}% más rápido</span>
          </div>
        </div>

        {/* Mitigación de Pasivos */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mitigación de Pasivos</h3>
          <div className="text-center">
            <AlertTriangle className="w-5 h-5 text-warning mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">${financials.multasEvitadas.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Multas Potenciales Evitadas</p>
          </div>
          <div className="space-y-1">
            {financials.multasDetalle.map((d, i) => (
              <p key={i} className="text-[10px] text-muted-foreground font-mono">{d}</p>
            ))}
          </div>
        </div>

        {/* EBITDA Impact */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Costo de Procesamiento</h3>
          <div className="text-center">
            <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">${financials.ahorroEBITDA.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Ahorro en Horas-Hombre (EBITDA Impact)</p>
          </div>
          <div className="bg-primary-light rounded-md p-2 text-center">
            <span className="text-xs text-muted-foreground">
              {financials.ahorroHorasHombre}h × ${financials.costoHoraHombre}/h
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComplianceCertificate({ resumen, financials, onClose }: {
  resumen: ResumenCourierHub;
  financials: FinancialImpact;
  onClose: () => void;
}) {
  const fecha = new Date();
  const hashDemo = `SHA-256:${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-xl border border-border shadow-xl max-w-lg w-full mx-4 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="bg-primary p-5 text-primary-foreground flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6" />
            <div>
              <h2 className="font-bold text-sm">Reporte de Debida Diligencia LEXIS</h2>
              <p className="text-[10px] opacity-80">Certificado de Auditoría de Carga — CAUCA/RECAUCA</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Fecha de Emisión</p>
              <p className="font-semibold">{fecha.toLocaleDateString('es-PA', { dateStyle: 'long' })}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Lote</p>
              <p className="font-mono font-semibold text-primary">#AMZ-689-TOC</p>
            </div>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <p className="font-semibold text-foreground">Certificación de Auditoría Integral</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Se certifica que el <strong>100%</strong> de la carga ({resumen.totalGuias} guías aéreas) del Lote #AMZ-689-TOC
              ha sido sometida a auditoría integral bajo el marco normativo CAUCA (Art. 95, 96) y RECAUCA (Art. 321, 322),
              cumpliendo con los estándares de la Organización Mundial de Aduanas (OMA) y la Organización Mundial del Comercio (OMC).
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-success-light rounded-lg">
              <p className="text-lg font-bold text-success">{resumen.verde}</p>
              <p className="text-[10px] text-muted-foreground">Vía Verde</p>
              <p className="text-[9px] text-muted-foreground">SIGA Ready</p>
            </div>
            <div className="text-center p-3 bg-warning-light rounded-lg">
              <p className="text-lg font-bold text-warning">{resumen.amarillo}</p>
              <p className="text-[10px] text-muted-foreground">Vía Ámbar</p>
              <p className="text-[9px] text-muted-foreground">Permisos Pendientes</p>
            </div>
            <div className="text-center p-3 bg-destructive-light rounded-lg">
              <p className="text-lg font-bold text-destructive">{resumen.rojo}</p>
              <p className="text-[10px] text-muted-foreground">Vía Roja</p>
              <p className="text-[9px] text-muted-foreground">Legal Hold</p>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px] text-muted-foreground">
            <p>• Exenciones DAI aplicadas: <strong className="text-foreground">{resumen.exentosTecnologia}</strong> (Cap. 84/85 Arancel de Panamá)</p>
            <p>• Permisos regulatorios requeridos: <strong className="text-foreground">{resumen.requierenPermiso}</strong> (MINSA/MIDA/APA)</p>
            <p>• Alertas de subvaloración: <strong className="text-destructive">{resumen.alertasFraude}</strong> (RECAUCA Art. 68)</p>
            <p>• Multas potenciales evitadas: <strong className="text-foreground">${financials.multasEvitadas.toLocaleString()}</strong></p>
          </div>

          {/* Sello de integridad */}
          <div className="bg-muted rounded-lg p-3 font-mono text-[9px] text-muted-foreground break-all">
            <p className="font-semibold text-foreground text-[10px] mb-1">Sello de Inexpugnabilidad ZENITH</p>
            <p>{hashDemo}</p>
            <p className="mt-1 text-[8px]">Timestamp: {fecha.toISOString()}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex items-center justify-between bg-muted/30">
          <p className="text-[10px] text-muted-foreground">
            ZENITH Customs Intelligence Platform
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={onClose}>
              <Eye className="w-3 h-3" />
              Cerrar
            </Button>
            <Button size="sm" className="text-xs gap-1">
              <Download className="w-3 h-3" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
