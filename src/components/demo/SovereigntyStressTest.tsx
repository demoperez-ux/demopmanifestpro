/**
 * SOVEREIGNTY STRESS TEST — 4-Phase Certification Dashboard
 * Tests: Chaos Ingestion, GRI Conflict, Resilience, Security Breach
 */

import { useState, useCallback } from 'react';
import { Shield, Play, Zap, Scale, Server, Lock, CheckCircle2, XCircle, AlertTriangle, Activity, Brain, FileWarning, ShieldAlert, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  executePhase1, executePhase2, executePhase3, executePhase4,
  generateStellaReport,
  type Phase1Result, type Phase2Result, type Phase3Result, type Phase4Result, type StellaReport,
} from '@/lib/demo/SovereigntyStressTestEngine';

type SovPhase = 'idle' | 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'report' | 'complete';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function SovereigntyStressTest() {
  const [phase, setPhase] = useState<SovPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [p1, setP1] = useState<Phase1Result | null>(null);
  const [p2, setP2] = useState<Phase2Result | null>(null);
  const [p3, setP3] = useState<Phase3Result | null>(null);
  const [p4, setP4] = useState<Phase4Result | null>(null);
  const [report, setReport] = useState<StellaReport | null>(null);

  const run = useCallback(async () => {
    setPhase('phase1'); setProgress(0); setP1(null); setP2(null); setP3(null); setP4(null); setReport(null);

    // ─── PHASE 1 ───
    setMessage('LEXIS: Inyectando 500 expedientes con 85 sabotajes (codificación, fechas, pesos)...');
    for (let i = 0; i <= 20; i += 2) { setProgress(i); await delay(60); }
    const r1 = executePhase1();
    setP1(r1); setProgress(25);
    setMessage(`✓ Fase 1: ${r1.totalErrorsBlocked}/85 errores bloqueados — Hilo principal estable`);
    await delay(600);

    // ─── PHASE 2 ───
    setPhase('phase2');
    setMessage('PrecedentEngine: Analizando Kit de Energía Renovable — Forzando GRI 3(b)...');
    for (let i = 25; i <= 45; i += 2) { setProgress(i); await delay(50); }
    const r2 = executePhase2();
    setP2(r2); setProgress(50);
    setMessage(`✓ Fase 2: ZOD-PREC-002 emitido — Reclasificación ${r2.declaredHsCode} → ${r2.correctHsCode}`);
    await delay(600);

    // ─── PHASE 3 ───
    setPhase('phase3');
    setMessage('Simulando caída 100% APIs de Aduana — Latencia 15,000ms...');
    for (let i = 50; i <= 70; i += 2) { setProgress(i); await delay(50); }
    const r3 = executePhase3();
    setP3(r3); setProgress(75);
    setMessage(`✓ Fase 3: Circuit Breaker → OPEN — ${r3.operationsEnqueued} ops encoladas — Ri=${r3.resilienceIndex}%`);
    await delay(600);

    // ─── PHASE 4 ───
    setPhase('phase4');
    setMessage('⚠️ Simulando ataque MITM en Nexus Bridge — Payload $5,000 → $50...');
    for (let i = 75; i <= 90; i += 2) { setProgress(i); await delay(40); }
    const r4 = executePhase4();
    setP4(r4); setProgress(95);
    setMessage(`✓ Fase 4: SIGNATURE_MISMATCH — Transacción bloqueada — IP ${r4.ipBlocked} en ledger`);
    await delay(600);

    // ─── STELLA REPORT ───
    setPhase('report');
    setMessage('Stella: Compilando Reporte de Certificación de Soberanía...');
    await delay(400);
    const stellaReport = generateStellaReport(r1, r2, r3, r4);
    setReport(stellaReport);
    setProgress(100);
    setPhase('complete');
    setMessage('Auditoría de Soberanía completada — Certificado emitido');
  }, []);

  const isRunning = phase !== 'idle' && phase !== 'complete';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Stress Test de Soberanía</h1>
            <Badge variant="outline" className="text-[10px] font-mono border-destructive/40 text-destructive">4 FASES</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Certificación de robustez ante expansión regional y fallos catastróficos</p>
        </div>
        <Button onClick={run} disabled={isRunning} size="lg" className="gap-2 font-semibold shadow-md">
          <Shield className="w-4 h-4" />
          {isRunning ? 'Ejecutando...' : 'Iniciar Stress Test de Soberanía'}
        </Button>
      </div>

      {/* Progress */}
      {phase !== 'idle' && (
        <div className="card-elevated p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {phase === 'complete' ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Play className="w-4 h-4 text-primary animate-pulse" />}
              <span className="text-sm font-semibold text-foreground">
                {phase === 'phase1' && 'Fase 1: Ingesto de Caos'}
                {phase === 'phase2' && 'Fase 2: Dilema del Consultor'}
                {phase === 'phase3' && 'Fase 3: Fallo Total de Infraestructura'}
                {phase === 'phase4' && 'Fase 4: Intento de Infiltración'}
                {phase === 'report' && 'Compilando Reporte Stella'}
                {phase === 'complete' && 'Auditoría Completada'}
              </span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground font-mono">{message}</p>
        </div>
      )}

      {/* Phase 1 Results */}
      {p1 && <Phase1Card data={p1} />}

      {/* Phase 2 Results */}
      {p2 && <Phase2Card data={p2} />}

      {/* Phase 3 Results */}
      {p3 && <Phase3Card data={p3} />}

      {/* Phase 4 Results */}
      {p4 && <Phase4Card data={p4} />}

      {/* Stella Report */}
      {report && <StellaReportCard report={report} />}
    </div>
  );
}

// ─── Phase 1 Card ───────────────────────────────────────

function Phase1Card({ data }: { data: Phase1Result }) {
  return (
    <div className="card-elevated p-5 animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-warning" />
        <h2 className="text-sm font-bold text-foreground">Fase 1: Ingesto de Caos — LEXIS & ZOD</h2>
        <Badge variant="secondary" className="text-[10px]">{data.totalExpedientes} expedientes</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <MiniStat label="Codificación Corrupta" value={`${data.corruptEncoding.blocked}/${data.corruptEncoding.total}`} status="blocked" />
        <MiniStat label="Fechas Futuras (2027)" value={`${data.futureDates.blocked}/${data.futureDates.total}`} status="blocked" />
        <MiniStat label="Peso Bruto < Neto" value={`${data.weightAnomalies.blocked}/${data.weightAnomalies.total}`} status="blocked" />
        <MiniStat label="Hilo Principal" value={data.mainThreadDegraded ? 'DEGRADADO' : 'ESTABLE'} status={data.mainThreadDegraded ? 'error' : 'ok'} />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {(['PA', 'CR', 'GT', 'unknown'] as const).map(r => (
          <div key={r} className="text-center p-2 bg-muted/50 rounded-md">
            <p className="text-lg font-bold text-foreground">{data.regionDetection[r]}</p>
            <p className="text-[10px] text-muted-foreground">{r === 'unknown' ? 'No identificado' : r}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-success font-mono">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {data.totalErrorsBlocked}/85 sabotajes bloqueados — Procesamiento: {data.processingTimeMs}ms
      </div>
    </div>
  );
}

// ─── Phase 2 Card ───────────────────────────────────────

function Phase2Card({ data }: { data: Phase2Result }) {
  return (
    <div className="card-elevated p-5 animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="w-5 h-5 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Fase 2: Dilema del Consultor — GRI 3(b)</h2>
        <Badge className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">{data.zodFinding}</Badge>
      </div>

      <div className="bg-muted/50 rounded-lg p-3 mb-4">
        <p className="text-xs font-semibold text-foreground mb-2">{data.kitDescription}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {data.components.map(c => (
            <div key={c.name} className="text-[10px] p-2 bg-background rounded border border-border">
              <p className="font-semibold">{c.name}</p>
              <p className="text-muted-foreground">{c.material}</p>
              <p className="font-mono">{c.hsCode} · DAI {c.daiPercent}%</p>
              <p className="text-muted-foreground">{(c.proportion * 100).toFixed(0)}% valor</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reclassification */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Declarado</p>
          <p className="font-mono font-bold text-destructive">{data.declaredHsCode}</p>
          <p className="text-[10px] text-muted-foreground">DAI {data.declaredDai}%</p>
        </div>
        <div className="text-xl text-destructive font-bold">→</div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Correcto ({data.griApplied})</p>
          <p className="font-mono font-bold text-success">{data.correctHsCode}</p>
          <p className="text-[10px] text-muted-foreground">DAI {data.correctDai}%</p>
        </div>
        <div className="flex-1 text-[10px] text-muted-foreground ml-2">
          <p className="font-semibold text-foreground">Justificación:</p>
          <p>{data.griJustification}</p>
        </div>
      </div>

      {/* Fiscal Cascade */}
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-1.5">Región</th>
              <th className="text-right">DAI Declarado</th>
              <th className="text-right">DAI Correcto</th>
              <th className="text-right">{'{VAT}'} Declarado</th>
              <th className="text-right">{'{VAT}'} Correcto</th>
              <th className="text-right font-semibold text-destructive">Déficit</th>
            </tr>
          </thead>
          <tbody>
            {data.fiscalImpact.map(r => (
              <tr key={r.region} className="border-b border-border/50">
                <td className="py-1.5 font-semibold">{r.regionName} ({r.vatName} {(r.vatRate * 100).toFixed(0)}%)</td>
                <td className="text-right font-mono text-destructive">${r.daiDeclared.toLocaleString()}</td>
                <td className="text-right font-mono text-success">${r.daiCorrect.toLocaleString()}</td>
                <td className="text-right font-mono text-destructive">${r.vatDeclared.toLocaleString()}</td>
                <td className="text-right font-mono text-success">${r.vatCorrect.toLocaleString()}</td>
                <td className="text-right font-mono font-bold text-destructive">${r.deficit.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Phase 3 Card ───────────────────────────────────────

function Phase3Card({ data }: { data: Phase3Result }) {
  return (
    <div className="card-elevated p-5 animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <Server className="w-5 h-5 text-destructive" />
        <h2 className="text-sm font-bold text-foreground">Fase 3: Fallo Total de Infraestructura</h2>
        <Badge variant="destructive" className="text-[10px]">CB: {data.circuitBreakerState}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <MiniStat label="Latencia Simulada" value={`${(data.latencySimulated / 1000).toFixed(0)}s`} status="error" />
        <MiniStat label="Ops Encoladas" value={data.operationsEnqueued} status="warning" />
        <MiniStat label="Índice Resiliencia" value={`${data.resilienceIndex}%`} status={data.resilienceIndex >= 70 ? 'ok' : 'error'} />
        <MiniStat label="SyncManager" value={data.syncManagerStatus.toUpperCase()} status={data.syncManagerStatus === 'active' ? 'ok' : 'warning'} />
      </div>

      {/* Backoff Schedule */}
      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-[10px] font-semibold text-foreground mb-2">Estrategia de Backoff Exponencial</p>
        <div className="flex flex-wrap gap-1.5">
          {data.backoffSchedule.map(b => (
            <div key={b.attempt} className="text-[9px] font-mono px-2 py-1 bg-background rounded border border-border">
              #{b.attempt}: {b.delayMs < 1000 ? `${b.delayMs}ms` : `${(b.delayMs / 1000).toFixed(1)}s`}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 font-mono">
          R<sub>i</sub> = (1 − T<sub>fallos</sub>/T<sub>total</sub>) × 100 = (1 − {(data.failedOps * 0.3).toFixed(0)}/{data.totalOps}) × 100 = {data.resilienceIndex}%
        </p>
      </div>
    </div>
  );
}

// ─── Phase 4 Card ───────────────────────────────────────

function Phase4Card({ data }: { data: Phase4Result }) {
  return (
    <div className="card-elevated p-5 animate-slide-up border-destructive/30">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-5 h-5 text-destructive" />
        <h2 className="text-sm font-bold text-foreground">Fase 4: Intento de Infiltración — MITM</h2>
        <Badge variant="destructive" className="text-[10px] animate-pulse">{data.alertType}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <MiniStat label="Monto Original" value={`$${data.originalAmount.toLocaleString()}`} status="ok" />
        <MiniStat label="Monto Manipulado" value={`$${data.tamperedAmount}`} status="error" />
        <MiniStat label="Token Válido" value={data.tokenValid ? 'SÍ' : 'NO'} status="warning" />
        <MiniStat label="Firma HMAC" value={data.signatureMatch ? 'MATCH' : 'MISMATCH'} status="blocked" />
      </div>

      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-destructive" />
          <p className="text-xs font-bold text-destructive">TRANSACCIÓN BLOQUEADA</p>
        </div>
        <p className="text-[10px] text-muted-foreground">{data.auditLogEntry.details}</p>
        <div className="font-mono text-[9px] text-muted-foreground bg-muted/60 p-2 rounded break-all">
          <p>Audit ID: {data.auditLogEntry.id}</p>
          <p>Hash: {data.auditLogEntry.hash}</p>
          <p>Timestamp: {data.auditLogEntry.timestamp}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Stella Report Card ─────────────────────────────────

function StellaReportCard({ report }: { report: StellaReport }) {
  const verdictColors: Record<string, string> = {
    CERTIFIED: 'text-success border-success/30 bg-success/5',
    DEGRADED: 'text-warning border-warning/30 bg-warning/5',
    FAILED: 'text-destructive border-destructive/30 bg-destructive/5',
  };

  return (
    <div className="card-elevated p-6 animate-slide-up border-primary/30">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Reporte de Stella — Certificación de Soberanía</h2>
        </div>
        <Badge className={cn('text-xs font-bold px-3 py-1 border', verdictColors[report.overallVerdict])}>
          {report.overallVerdict}
        </Badge>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="text-center p-3 bg-success/5 rounded-lg border border-success/20">
          <Shield className="w-5 h-5 text-success mx-auto mb-1" />
          <p className="text-2xl font-bold text-success">{report.totalThreatsNeutralized}</p>
          <p className="text-[10px] text-muted-foreground">Amenazas Neutralizadas</p>
        </div>
        <div className="text-center p-3 bg-primary/5 rounded-lg border border-primary/20">
          <Scale className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold text-primary">{report.precedentsSaved}</p>
          <p className="text-[10px] text-muted-foreground">Precedentes Aplicados</p>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg border border-border">
          <Activity className="w-5 h-5 text-foreground mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{report.dataVaultHealth}%</p>
          <p className="text-[10px] text-muted-foreground">Salud de Bóveda</p>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg border border-border">
          <Cpu className="w-5 h-5 text-foreground mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">4/4</p>
          <p className="text-[10px] text-muted-foreground">Fases Completadas</p>
        </div>
      </div>

      {/* Phase Summaries */}
      <div className="space-y-3 mb-5">
        {[
          { icon: <Zap className="w-3.5 h-3.5 text-warning" />, label: 'Fase 1', text: report.phase1Summary },
          { icon: <Scale className="w-3.5 h-3.5 text-primary" />, label: 'Fase 2', text: report.phase2Summary },
          { icon: <Server className="w-3.5 h-3.5 text-destructive" />, label: 'Fase 3', text: report.phase3Summary },
          { icon: <ShieldAlert className="w-3.5 h-3.5 text-destructive" />, label: 'Fase 4', text: report.phase4Summary },
        ].map((s, i) => (
          <div key={i} className="flex gap-2 items-start text-[11px] text-muted-foreground p-2.5 bg-muted/40 rounded-md">
            {s.icon}
            <div>
              <span className="font-semibold text-foreground">{s.label}:</span> {s.text}
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
        <p className="text-[10px] font-semibold text-foreground mb-2">Recomendaciones de Stella</p>
        <ul className="space-y-1">
          {report.recommendations.map((r, i) => (
            <li key={i} className="text-[10px] text-muted-foreground flex gap-1.5">
              <span className="text-primary">•</span> {r}
            </li>
          ))}
        </ul>
      </div>

      {/* Certification Hash */}
      <div className="bg-muted rounded-lg p-3 font-mono text-[9px] text-muted-foreground break-all">
        <p className="font-semibold text-foreground text-[10px] mb-1">Sello de Certificación de Soberanía</p>
        <p>SHA-256: {report.certificationHash}</p>
        <p className="mt-1">Timestamp: {report.timestamp}</p>
      </div>
    </div>
  );
}

// ─── Shared ─────────────────────────────────────────────

function MiniStat({ label, value, status }: { label: string; value: string | number; status: 'ok' | 'warning' | 'error' | 'blocked' }) {
  const styles = {
    ok: 'border-success/30 bg-success/5',
    warning: 'border-warning/30 bg-warning/5',
    error: 'border-destructive/30 bg-destructive/5',
    blocked: 'border-destructive/50 bg-destructive/10',
  };
  const textStyles = {
    ok: 'text-success',
    warning: 'text-warning',
    error: 'text-destructive',
    blocked: 'text-destructive',
  };

  return (
    <div className={cn('p-2.5 rounded-lg border text-center', styles[status])}>
      <p className={cn('text-lg font-bold font-mono', textStyles[status])}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
