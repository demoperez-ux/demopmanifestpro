/**
 * SystemHealthDashboard — Módulo de Diagnóstico y Auditoría del Sistema
 * 
 * 4 paneles: Vulnerability Scanner, Stress Test, Stella Audit, Integrity Certificate
 */

import { useState, useCallback } from 'react';
import {
  Shield, Activity, Zap, FileText, Download, Play, CheckCircle2,
  AlertTriangle, XCircle, Info, RefreshCw, Clock, Server, Cpu,
  BookOpen, TrendingUp, Award, Eye, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  SystemHealthEngine,
  type HealthReport,
  type HealthCheck,
  type StressTestResult,
  type StellaAuditResult,
  type IntegrityCertificate,
} from '@/lib/audit/SystemHealthEngine';

export default function SystemHealthDashboard() {
  const { user } = useAuth();

  // Health scan state
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [scanRunning, setScanRunning] = useState(false);

  // Stress test state
  const [stressResults, setStressResults] = useState<StressTestResult[]>([]);
  const [stressRunning, setStressRunning] = useState(false);
  const [stressProgress, setStressProgress] = useState(0);
  const [stressPhase, setStressPhase] = useState('');

  // Stella audit state
  const [stellaAudit, setStellaAudit] = useState<StellaAuditResult | null>(null);

  // Certificate state
  const [certificate, setCertificate] = useState<IntegrityCertificate | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);

  // ─── Run Health Scan ────────────────────────────────

  const runHealthScan = useCallback(async () => {
    setScanRunning(true);
    try {
      const report = await SystemHealthEngine.runFullHealthScan();
      setHealthReport(report);
    } catch (err) {
      console.error('Health scan error:', err);
    } finally {
      setScanRunning(false);
    }
  }, []);

  // ─── Run Stress Test ────────────────────────────────

  const runStressTest = useCallback(async () => {
    setStressRunning(true);
    setStressResults([]);
    setStressProgress(0);

    try {
      const results = await SystemHealthEngine.runStressTest(
        5, 1000,
        (phase, progress, result) => {
          setStressPhase(phase);
          setStressProgress(progress);
          if (result) {
            setStressResults(prev => [...prev, result]);
          }
        }
      );
      setStressResults(results);
    } catch (err) {
      console.error('Stress test error:', err);
    } finally {
      setStressRunning(false);
    }
  }, []);

  // ─── Run Stella Audit ───────────────────────────────

  const runStellaAudit = useCallback(() => {
    const result = SystemHealthEngine.auditStellaKnowledge();
    setStellaAudit(result);
  }, []);

  // ─── Generate Certificate ──────────────────────────

  const generateCertificate = useCallback(() => {
    if (!healthReport) return;

    const stellaResult = stellaAudit || SystemHealthEngine.auditStellaKnowledge();
    if (!stellaAudit) setStellaAudit(stellaResult);

    const cert = SystemHealthEngine.generateIntegrityCertificate(
      healthReport,
      stellaResult,
      stressResults,
      user?.email || 'Sistema'
    );
    setCertificate(cert);
    setShowCertificate(true);
  }, [healthReport, stellaAudit, stressResults, user]);

  // ─── Export Certificate as Text ─────────────────────

  const exportCertificateText = useCallback(() => {
    if (!certificate) return;

    const lines: string[] = [
      '═══════════════════════════════════════════════════════════════',
      '       CERTIFICADO DE INTEGRIDAD TÉCNICA — ZENITH',
      '═══════════════════════════════════════════════════════════════',
      '',
      `ID del Certificado: ${certificate.certId}`,
      `Fecha de Generación: ${new Date(certificate.generatedAt).toLocaleString('es-PA')}`,
      `Generado Por: ${certificate.generatedBy}`,
      `Plataforma: ${certificate.platform} v${certificate.version}`,
      `Calificación General: ${certificate.overallGrade} (${certificate.overallScore}%)`,
      `Firma Digital: ${certificate.digitalSignature}`,
      '',
      '───────────────────────────────────────────────────────────────',
    ];

    for (const section of certificate.sections) {
      const statusSymbol = section.status === 'compliant' ? '✅' : section.status === 'partial' ? '⚠️' : '❌';
      lines.push('');
      lines.push(`${statusSymbol} ${section.title}`);
      lines.push(`   Puntuación: ${Math.round(section.score)}%`);
      for (const finding of section.findings) {
        lines.push(`   • ${finding}`);
      }
    }

    lines.push('');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('');
    lines.push('Este certificado ha sido generado automáticamente por el sistema');
    lines.push('ZENITH Customs Intelligence Platform y constituye un reporte técnico');
    lines.push('de las capas de seguridad, cifrado y cumplimiento implementadas.');
    lines.push('');
    lines.push('Normativa aplicable: CAUCA/RECAUCA, DL 1/2008, Ley 81/2019,');
    lines.push('Convenio de Kyoto Revisado, OMA/OMC.');
    lines.push('');
    lines.push(`Sello Digital: ${certificate.digitalSignature}`);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${certificate.certId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [certificate]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">System Health Audit</h1>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">DIAGNÓSTICO</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Diagnóstico integral de seguridad, rendimiento y cumplimiento normativo
          </p>
        </div>

        <Button
          onClick={generateCertificate}
          disabled={!healthReport}
          className="gap-2"
        >
          <FileText className="w-4 h-4" />
          📄 Generar Auditoría Técnica para Inversionistas/ANA
        </Button>
      </div>

      {/* Score Cards */}
      {healthReport && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-slide-up">
          <ScoreCard
            label="Salud General"
            value={`${healthReport.overallScore}%`}
            accent={healthReport.overallScore >= 75 ? 'success' : healthReport.overallScore >= 50 ? 'warning' : 'destructive'}
            sub={`Grado: ${healthReport.grade}`}
          />
          <ScoreCard label="Checks Pasados" value={healthReport.summary.passed} accent="success" sub={`de ${healthReport.summary.total}`} />
          <ScoreCard label="Advertencias" value={healthReport.summary.warnings} accent="warning" />
          <ScoreCard label="Críticos" value={healthReport.summary.critical} accent={healthReport.summary.critical > 0 ? 'destructive' : 'success'} />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="vulnerability" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="vulnerability" className="gap-1.5 text-xs">
            <Shield className="w-3.5 h-3.5" /> Vulnerabilidades
          </TabsTrigger>
          <TabsTrigger value="stress" className="gap-1.5 text-xs">
            <Zap className="w-3.5 h-3.5" /> Stress Test
          </TabsTrigger>
          <TabsTrigger value="stella" className="gap-1.5 text-xs">
            <BookOpen className="w-3.5 h-3.5" /> Auditoría Stella
          </TabsTrigger>
          <TabsTrigger value="certificate" className="gap-1.5 text-xs">
            <Award className="w-3.5 h-3.5" /> Certificado
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Vulnerability Scanner ─── */}
        <TabsContent value="vulnerability" className="space-y-4">
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Reporte de Vulnerabilidades</h2>
              </div>
              <Button onClick={runHealthScan} disabled={scanRunning} size="sm" className="gap-1.5">
                {scanRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {scanRunning ? 'Escaneando...' : 'Ejecutar Scan'}
              </Button>
            </div>

            {!healthReport && !scanRunning && (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Ejecute el escaneo para analizar vulnerabilidades del sistema</p>
              </div>
            )}

            {healthReport && (
              <div className="space-y-2">
                {healthReport.checks.map(check => (
                  <HealthCheckRow key={check.id} check={check} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── Tab 2: Stress Test ─── */}
        <TabsContent value="stress" className="space-y-4">
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-warning" />
                <h2 className="text-base font-semibold text-foreground">Simulador de Carga Crítica</h2>
                <Badge variant="secondary" className="text-[10px] font-mono">5 × 1000 guías</Badge>
              </div>
              <Button onClick={runStressTest} disabled={stressRunning} size="sm" variant="outline" className="gap-1.5">
                {stressRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {stressRunning ? 'Ejecutando...' : 'Iniciar Test'}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              Simula la ingesta simultánea de 5 manifiestos × 1,000 guías para medir el rendimiento de LEXIS y Zod
            </p>

            {stressRunning && (
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-mono">{stressPhase}</span>
                  <span className="font-mono">{Math.round(stressProgress)}%</span>
                </div>
                <Progress value={stressProgress} className="h-2" />
              </div>
            )}

            {stressResults.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <MiniStat icon={Server} label="Manifiestos" value={stressResults.length} />
                  <MiniStat icon={Clock} label="Tiempo Total" value={`${Math.round(stressResults.reduce((s, r) => s + r.totalTimeMs, 0))}ms`} />
                  <MiniStat
                    icon={TrendingUp}
                    label="Throughput"
                    value={`${stressResults[stressResults.length - 1]?.throughputPerSecond || 0}/s`}
                  />
                  <MiniStat
                    icon={Cpu}
                    label="Memoria"
                    value={`${stressResults[stressResults.length - 1]?.memoryUsageMB || 0} MB`}
                  />
                </div>

                <div className="overflow-auto max-h-[280px] scrollbar-thin">
                  <table className="data-table w-full text-xs">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                      <tr>
                        <th>#</th>
                        <th>Batch ID</th>
                        <th className="text-right">Guías</th>
                        <th className="text-right">Tiempo (ms)</th>
                        <th className="text-right">Avg/Guía</th>
                        <th className="text-right">Throughput</th>
                        <th className="text-right">Errores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stressResults.map((r, i) => (
                        <tr key={r.batchId}>
                          <td className="text-muted-foreground">{i + 1}</td>
                          <td className="font-mono text-[11px]">{r.batchId.split('-').pop()}</td>
                          <td className="text-right">{r.totalGuias.toLocaleString()}</td>
                          <td className="text-right font-mono">{r.totalTimeMs.toLocaleString()}</td>
                          <td className="text-right font-mono">{r.avgTimePerGuia}ms</td>
                          <td className="text-right font-mono">{r.throughputPerSecond}/s</td>
                          <td className="text-right">
                            <Badge variant={r.errors > 0 ? 'destructive' : 'secondary'} className="text-[10px]">
                              {r.errors}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ─── Tab 3: Stella Audit ─── */}
        <TabsContent value="stella" className="space-y-4">
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Autodiagnóstico de Stella</h2>
              </div>
              <Button onClick={runStellaAudit} size="sm" variant="outline" className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Ejecutar Auditoría
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              Stella verifica si su base de conocimientos está actualizada según la última resolución de la ANA
            </p>

            {!stellaAudit && (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Ejecute la auditoría para verificar las tasas de ITBMS y DAI</p>
              </div>
            )}

            {stellaAudit && (
              <div className="space-y-4 animate-slide-up">
                {/* ITBMS Check */}
                <div className={cn(
                  'p-4 rounded-lg border',
                  stellaAudit.itbmsRate.valid
                    ? 'bg-success-light border-success/20'
                    : 'bg-destructive-light border-destructive/20'
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    {stellaAudit.itbmsRate.valid
                      ? <CheckCircle2 className="w-4 h-4 text-success" />
                      : <XCircle className="w-4 h-4 text-destructive" />
                    }
                    <span className="text-sm font-semibold text-foreground">ITBMS (Impuesto de Transferencia)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Tasa Actual:</span>
                      <p className="font-mono font-bold text-foreground">{stellaAudit.itbmsRate.current}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tasa Esperada:</span>
                      <p className="font-mono font-bold text-foreground">{stellaAudit.itbmsRate.expected}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fuente:</span>
                      <p className="text-foreground">{stellaAudit.itbmsRate.source}</p>
                    </div>
                  </div>
                </div>

                {/* DAI Samples */}
                <div className="p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Muestreo DAI (Derechos Arancelarios)</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {stellaAudit.daiRates.valid}/{stellaAudit.daiRates.checked} válidos
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {stellaAudit.daiRates.samples.map((sample) => (
                      <div key={sample.code} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/50">
                        <span className="font-mono text-xs text-foreground">{sample.code}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{sample.rate >= 0 ? `${sample.rate}% DAI` : 'No encontrado'}</span>
                          {sample.valid
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                            : <XCircle className="w-3.5 h-3.5 text-destructive" />
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overall */}
                <div className={cn(
                  'p-3 rounded-lg border text-center',
                  stellaAudit.overallValid
                    ? 'border-success/30 bg-success-light'
                    : 'border-warning/30 bg-warning-light'
                )}>
                  <p className="text-sm font-semibold text-foreground">
                    {stellaAudit.overallValid
                      ? '✅ Base de conocimiento de Stella actualizada'
                      : '⚠️ Algunas tasas requieren actualización'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {stellaAudit.knowledgeBaseArticles} artículos operativos · Última verificación: {new Date(stellaAudit.lastUpdated).toLocaleString('es-PA')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── Tab 4: Certificate ─── */}
        <TabsContent value="certificate" className="space-y-4">
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Certificado de Integridad Técnica</h2>
              </div>
              <div className="flex items-center gap-2">
                {certificate && (
                  <Button onClick={exportCertificateText} size="sm" variant="outline" className="gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Exportar
                  </Button>
                )}
                <Button onClick={generateCertificate} disabled={!healthReport} size="sm" className="gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Generar
                </Button>
              </div>
            </div>

            {!healthReport && (
              <div className="text-center py-12">
                <Award className="w-12 h-12 mx-auto mb-3 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">Ejecute primero el escaneo de vulnerabilidades para generar el certificado</p>
              </div>
            )}

            {certificate && (
              <div className="space-y-4 animate-slide-up">
                {/* Certificate Header */}
                <div className="text-center p-5 rounded-lg border-2 border-primary/20 bg-primary/5">
                  <Award className="w-10 h-10 text-primary mx-auto mb-2" />
                  <h3 className="text-lg font-bold text-foreground">CERTIFICADO DE INTEGRIDAD TÉCNICA</h3>
                  <p className="text-xs text-muted-foreground mt-1">{certificate.platform} · v{certificate.version}</p>
                  <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                    <span className="font-mono text-muted-foreground">{certificate.certId}</span>
                    <Badge variant={certificate.overallScore >= 75 ? 'default' : 'destructive'} className="text-sm font-bold px-3">
                      {certificate.overallGrade} · {certificate.overallScore}%
                    </Badge>
                  </div>
                </div>

                {/* Sections */}
                {certificate.sections.map((section, i) => (
                  <CertificateRow key={i} section={section} />
                ))}

                {/* Signature */}
                <div className="text-center p-4 border-t border-border">
                  <p className="text-[10px] text-muted-foreground font-mono">{certificate.digitalSignature}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Generado por {certificate.generatedBy} · {new Date(certificate.generatedAt).toLocaleString('es-PA')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────

function ScoreCard({ label, value, accent, sub }: {
  label: string;
  value: string | number;
  accent?: string;
  sub?: string;
}) {
  const accentMap: Record<string, string> = {
    success: 'border-success/30 bg-success-light',
    warning: 'border-warning/30 bg-warning-light',
    destructive: 'border-destructive/30 bg-destructive-light',
  };

  return (
    <div className={cn('stat-card', accent && accentMap[accent])}>
      <span className="stat-value text-lg">{value}</span>
      <span className="stat-label text-[11px]">{label}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function HealthCheckRow({ check }: { check: HealthCheck }) {
  const [expanded, setExpanded] = useState(false);

  const severityIcon = {
    pass: <CheckCircle2 className="w-4 h-4 text-success" />,
    info: <Info className="w-4 h-4 text-primary" />,
    warning: <AlertTriangle className="w-4 h-4 text-warning" />,
    critical: <XCircle className="w-4 h-4 text-destructive" />,
  };

  const severityBg = {
    pass: '',
    info: '',
    warning: 'bg-warning-light/50',
    critical: 'bg-destructive-light/50',
  };

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className={cn(
        'w-full text-left p-3 rounded-lg border border-border transition-colors hover:bg-muted/30',
        severityBg[check.severity]
      )}
    >
      <div className="flex items-center gap-3">
        {severityIcon[check.severity]}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">{check.name}</span>
            <Badge variant="outline" className="text-[9px] font-mono">{check.category}</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{check.description}</p>
        </div>
        <ChevronRight className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
      </div>

      {expanded && (
        <div className="mt-2 pl-7 space-y-1 text-[11px]">
          {check.details && <p className="text-foreground/80">{check.details}</p>}
          {check.recommendation && (
            <p className="text-primary font-medium">💡 {check.recommendation}</p>
          )}
        </div>
      )}
    </button>
  );
}

function MiniStat({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div>
        <p className="text-sm font-bold text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function CertificateRow({ section }: { section: IntegrityCertificate['sections'][0] }) {
  const statusIcon = {
    compliant: <CheckCircle2 className="w-4 h-4 text-success" />,
    partial: <AlertTriangle className="w-4 h-4 text-warning" />,
    non_compliant: <XCircle className="w-4 h-4 text-destructive" />,
  };

  const statusLabel = {
    compliant: 'Cumple',
    partial: 'Parcial',
    non_compliant: 'No Cumple',
  };

  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {statusIcon[section.status]}
          <span className="text-sm font-semibold text-foreground">{section.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{statusLabel[section.status]}</Badge>
          <span className="text-xs font-mono text-muted-foreground">{Math.round(section.score)}%</span>
        </div>
      </div>
      <ul className="space-y-1 pl-6">
        {section.findings.map((finding, i) => (
          <li key={i} className="text-[11px] text-muted-foreground list-disc">{finding}</li>
        ))}
      </ul>
    </div>
  );
}