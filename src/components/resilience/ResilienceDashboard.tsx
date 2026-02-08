/**
 * Resilience Dashboard — Real-time system health, circuit breaker,
 * anomaly detection, and performance monitoring
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Cpu, Database, Wifi, WifiOff, Shield, AlertTriangle,
  RefreshCw, Zap, Clock, TrendingUp, Server, ChevronRight,
  Power, PowerOff, RotateCcw, Download, Eye, ShieldAlert,
  BarChart3, Gauge, ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { healthMonitor, type HealthTrend, type HealthMetrics } from '@/lib/resilience/HealthMonitor';
import { circuitBreakerANA, type CircuitBreakerSnapshot } from '@/lib/resilience/CircuitBreaker';
import { anomalyDetector, type AnomalyAlert } from '@/lib/resilience/AnomalyDetector';

export default function ResilienceDashboard() {
  const [healthTrend, setHealthTrend] = useState<HealthTrend | null>(null);
  const [cbSnapshot, setCbSnapshot] = useState<CircuitBreakerSnapshot>(circuitBreakerANA.getSnapshot());
  const [anomalyAlerts, setAnomalyAlerts] = useState<AnomalyAlert[]>(anomalyDetector.getAlerts());

  // ── Start monitoring on mount ──────────────
  useEffect(() => {
    healthMonitor.start(3000);
    const unsubHealth = healthMonitor.onUpdate(setHealthTrend);
    const unsubCB = circuitBreakerANA.onStateChange(setCbSnapshot);
    const unsubAnomaly = anomalyDetector.onAlert(() => {
      setAnomalyAlerts(anomalyDetector.getAlerts());
    });

    return () => {
      healthMonitor.stop();
      unsubHealth();
      unsubCB();
      unsubAnomaly();
    };
  }, []);

  const latest = healthTrend?.metrics[healthTrend.metrics.length - 1];

  // ── Simulate download burst for demo ──────
  const simulateDownloadBurst = useCallback(() => {
    for (let i = 0; i < 55; i++) {
      anomalyDetector.trackDownload({
        userId: 'demo-user',
        documentType: 'manifest',
        documentId: `DOC-${i}`,
      });
    }
    setAnomalyAlerts(anomalyDetector.getAlerts());
  }, []);

  // ── Simulate circuit breaker trigger ──────
  const simulateCircuitTrip = useCallback(async () => {
    for (let i = 0; i < 4; i++) {
      try {
        await circuitBreakerANA.execute(() =>
          new Promise((_, reject) => setTimeout(() => reject(new Error('SIGA-TIMEOUT')), 100))
        );
      } catch {
        // Expected failures
      }
    }
    setCbSnapshot(circuitBreakerANA.getSnapshot());
  }, []);

  const statusColor = {
    healthy: 'text-success',
    degraded: 'text-warning',
    critical: 'text-destructive',
  };

  const statusLabel = {
    healthy: 'Saludable',
    degraded: 'Degradado',
    critical: 'Crítico',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">Módulo de Resiliencia</h1>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">DEFENSA ACTIVA</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Monitor de salud, Circuit Breaker y detección de anomalías en tiempo real
          </p>
        </div>
        {healthTrend && (
          <div className="flex items-center gap-2">
            <span className={cn('w-2.5 h-2.5 rounded-full', {
              'bg-success animate-pulse': healthTrend.status === 'healthy',
              'bg-warning animate-pulse': healthTrend.status === 'degraded',
              'bg-destructive animate-pulse': healthTrend.status === 'critical',
            })} />
            <span className={cn('text-sm font-semibold', statusColor[healthTrend.status])}>
              Sistema {statusLabel[healthTrend.status]}
            </span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            icon={Cpu}
            label="Carga LEXIS"
            value={`${latest.cpuLoad}%`}
            severity={latest.cpuLoad > 85 ? 'critical' : latest.cpuLoad > 60 ? 'warning' : 'normal'}
            sub={`${latest.activeWorkers} workers activos`}
          />
          <MetricCard
            icon={Database}
            label="Latencia DB"
            value={`${latest.dbLatencyMs}ms`}
            severity={latest.dbLatencyMs > 500 ? 'critical' : latest.dbLatencyMs > 200 ? 'warning' : 'normal'}
            sub={`${latest.requestsPerMinute} req/min`}
          />
          <MetricCard
            icon={latest.wsConnected ? Wifi : WifiOff}
            label="WebSocket"
            value={latest.wsConnected ? 'Conectado' : 'Desconectado'}
            severity={latest.wsConnected ? 'normal' : 'critical'}
            sub={latest.wsConnected ? `${latest.wsLatencyMs}ms latencia` : 'Reconectando...'}
          />
          <MetricCard
            icon={Gauge}
            label="Memoria"
            value={`${latest.memoryUsageMB} MB`}
            severity={latest.memoryUsageMB > 300 ? 'warning' : 'normal'}
            sub={`Error rate: ${latest.errorRate}%`}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="health" className="gap-1.5 text-xs">
            <Activity className="w-3.5 h-3.5" /> Health Monitor
          </TabsTrigger>
          <TabsTrigger value="circuit" className="gap-1.5 text-xs">
            <Zap className="w-3.5 h-3.5" /> Circuit Breaker
            {cbSnapshot.state !== 'closed' && (
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="anomaly" className="gap-1.5 text-xs">
            <ShieldAlert className="w-3.5 h-3.5" /> Detección Anomalías
            {anomalyAlerts.filter(a => !a.resolved).length > 0 && (
              <Badge variant="destructive" className="text-[9px] h-4 px-1">
                {anomalyAlerts.filter(a => !a.resolved).length}
            </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Health Monitor Tab ── */}
        <TabsContent value="health" className="space-y-4">
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Telemetría en Tiempo Real</h2>
                <Badge variant="secondary" className="text-[10px] font-mono">LIVE</Badge>
              </div>
            </div>

            {/* Sparkline-like history */}
            {healthTrend && healthTrend.metrics.length > 5 && (
              <div className="space-y-4">
                <MetricTimeline label="CPU Load (%)" metrics={healthTrend.metrics} accessor={m => m.cpuLoad} threshold={60} maxValue={100} />
                <MetricTimeline label="DB Latency (ms)" metrics={healthTrend.metrics} accessor={m => m.dbLatencyMs} threshold={200} maxValue={600} />
                <MetricTimeline label="Error Rate (%)" metrics={healthTrend.metrics} accessor={m => m.errorRate} threshold={5} maxValue={25} />
              </div>
            )}

            {/* Alerts */}
            {healthTrend && healthTrend.alerts.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Alertas Recientes</p>
                {healthTrend.alerts.slice(-5).reverse().map(alert => (
                  <div key={alert.id} className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
                    alert.severity === 'critical' ? 'bg-destructive-light text-destructive' : 'bg-warning-light text-warning-foreground'
                  )}>
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="flex-1">{alert.message}</span>
                    <span className="text-[10px] font-mono opacity-60">
                      {new Date(alert.timestamp).toLocaleTimeString('es-PA')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Circuit Breaker Tab ── */}
        <TabsContent value="circuit" className="space-y-4">
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-warning" />
                <h2 className="text-base font-semibold text-foreground">Circuit Breaker — ANA/CrimsonLogic</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={simulateCircuitTrip} size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Zap className="w-3 h-3" /> Simular Falla
                </Button>
                <Button onClick={() => { circuitBreakerANA.reset(); setCbSnapshot(circuitBreakerANA.getSnapshot()); }} size="sm" variant="outline" className="gap-1.5 text-xs">
                  <RotateCcw className="w-3 h-3" /> Reset
                </Button>
              </div>
            </div>

            {/* Circuit State */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className={cn('stat-card text-center', {
                'border-success/30 bg-success-light': cbSnapshot.state === 'closed',
                'border-destructive/30 bg-destructive-light': cbSnapshot.state === 'open',
                'border-warning/30 bg-warning-light': cbSnapshot.state === 'half_open',
              })}>
                <div className={cn('text-lg font-bold', {
                  'text-success': cbSnapshot.state === 'closed',
                  'text-destructive': cbSnapshot.state === 'open',
                  'text-warning': cbSnapshot.state === 'half_open',
                })}>
                  {cbSnapshot.state === 'closed' ? '🟢 CERRADO' : cbSnapshot.state === 'open' ? '🔴 ABIERTO' : '🟡 SEMI-ABIERTO'}
                </div>
                <span className="text-[10px] text-muted-foreground">Estado del Circuito</span>
              </div>

              <div className="stat-card text-center">
                <span className="stat-value text-lg">{cbSnapshot.consecutiveFailures}</span>
                <span className="text-[10px] text-muted-foreground">Fallos Consecutivos</span>
              </div>

              <div className="stat-card text-center">
                <span className="stat-value text-lg">{cbSnapshot.queueSize}</span>
                <span className="text-[10px] text-muted-foreground">En Cola Asíncrona</span>
              </div>

              <div className="stat-card text-center">
                <span className="stat-value text-lg">{cbSnapshot.avgLatency}ms</span>
                <span className="text-[10px] text-muted-foreground">Latencia Promedio</span>
              </div>
            </div>

            {/* Explanation */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Lógica de Protección:</p>
              <p>• Si CrimsonLogic/ANA tarda &gt;10s, se marca como <strong>timeout</strong></p>
              <p>• Después de 3 fallos consecutivos, el circuito se <strong>abre</strong></p>
              <p>• Los trámites se guardan localmente en <strong>Cola Asíncrona</strong></p>
              <p>• Reintento automático cada <strong>2 minutos</strong> sin bloquear al usuario</p>
              <p>• Después de 2 min, se intenta <strong>semi-abierto</strong> para probar conectividad</p>
            </div>

            {/* Last events */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-card">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Último éxito</p>
                <p className="text-xs font-mono text-foreground">
                  {cbSnapshot.lastSuccess ? new Date(cbSnapshot.lastSuccess).toLocaleString('es-PA') : '—'}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Último fallo</p>
                <p className="text-xs font-mono text-foreground">
                  {cbSnapshot.lastFailure ? new Date(cbSnapshot.lastFailure).toLocaleString('es-PA') : '—'}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Anomaly Detection Tab ── */}
        <TabsContent value="anomaly" className="space-y-4">
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-destructive" />
                <h2 className="text-base font-semibold text-foreground">Stella AI — Detección de Anomalías</h2>
              </div>
              <Button onClick={simulateDownloadBurst} size="sm" variant="outline" className="gap-1.5 text-xs">
                <Download className="w-3 h-3" /> Simular Descarga Masiva
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              Stella monitorea la velocidad de descarga. Si un usuario descarga &gt;50 archivos/minuto,
              se exige re-autenticación MFA/biométrica.
            </p>

            {/* Current velocity */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="stat-card">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Descargas (1 min)</span>
                <span className="stat-value text-lg">{anomalyDetector.getRecentDownloadCount().lastMinute}</span>
                <Progress
                  value={Math.min(100, (anomalyDetector.getRecentDownloadCount().lastMinute / 50) * 100)}
                  className="h-1.5 mt-1"
                />
                <span className="text-[10px] text-muted-foreground">Umbral: 50/min</span>
              </div>
              <div className="stat-card">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Descargas (5 min)</span>
                <span className="stat-value text-lg">{anomalyDetector.getRecentDownloadCount().last5Min}</span>
                <Progress
                  value={Math.min(100, (anomalyDetector.getRecentDownloadCount().last5Min / 100) * 100)}
                  className="h-1.5 mt-1"
                />
                <span className="text-[10px] text-muted-foreground">Umbral: 100/5min</span>
              </div>
            </div>

            {/* MFA Gate Status */}
            {anomalyDetector.isMFARequired() && (
              <div className="p-4 rounded-lg border-2 border-destructive/30 bg-destructive-light mb-4 animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-destructive" />
                  <span className="text-sm font-bold text-destructive">⚠️ RE-AUTENTICACIÓN REQUERIDA</span>
                </div>
                <p className="text-xs text-destructive/80 mb-3">
                  Se ha detectado actividad anómala. Se requiere verificación MFA o biométrica para continuar.
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => { anomalyDetector.verifyMFA(); setAnomalyAlerts(anomalyDetector.getAlerts()); }}
                  className="gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" /> Verificar MFA (Demo)
                </Button>
              </div>
            )}

            {/* Alert List */}
            {anomalyAlerts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Historial de Alertas</p>
                {anomalyAlerts.slice(-10).reverse().map(alert => (
                  <div key={alert.id} className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border',
                    alert.resolved ? 'border-border bg-muted/30 opacity-60' : 'border-destructive/20 bg-destructive-light'
                  )}>
                    <AlertTriangle className={cn('w-4 h-4 flex-shrink-0 mt-0.5', alert.resolved ? 'text-muted-foreground' : 'text-destructive')} />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs font-medium', alert.resolved ? 'text-muted-foreground' : 'text-foreground')}>{alert.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{alert.details}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-mono text-muted-foreground">{new Date(alert.timestamp).toLocaleString('es-PA')}</span>
                        {alert.requiresMFA && <Badge variant="destructive" className="text-[9px] h-4">MFA</Badge>}
                        {alert.resolved && <Badge variant="secondary" className="text-[9px] h-4">Resuelto</Badge>}
                      </div>
                    </div>
                    {!alert.resolved && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => { anomalyDetector.resolveAlert(alert.id); setAnomalyAlerts([...anomalyDetector.getAlerts()]); }}
                      >
                        Resolver
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Sin anomalías detectadas</p>
                <p className="text-[10px]">Stella AI monitorea continuamente la actividad</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────

function MetricCard({ icon: Icon, label, value, severity, sub }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  severity: 'normal' | 'warning' | 'critical';
  sub?: string;
}) {
  const bg = {
    normal: '',
    warning: 'border-warning/30 bg-warning-light',
    critical: 'border-destructive/30 bg-destructive-light',
  };
  const iconColor = {
    normal: 'text-primary',
    warning: 'text-warning',
    critical: 'text-destructive',
  };

  return (
    <div className={cn('stat-card', bg[severity])}>
      <div className="flex items-center gap-2">
        <Icon className={cn('w-4 h-4', iconColor[severity])} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <span className="stat-value text-lg">{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function MetricTimeline({ label, metrics, accessor, threshold, maxValue }: {
  label: string;
  metrics: HealthMetrics[];
  accessor: (m: HealthMetrics) => number;
  threshold: number;
  maxValue: number;
}) {
  const last20 = metrics.slice(-20);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
        <span className="text-[10px] font-mono text-foreground">
          {last20.length > 0 ? accessor(last20[last20.length - 1]) : '—'}
        </span>
      </div>
      <div className="flex items-end gap-[2px] h-8">
        {last20.map((m, i) => {
          const val = accessor(m);
          const pct = Math.min(100, (val / maxValue) * 100);
          const isAbove = val > threshold;
          return (
            <div
              key={i}
              className={cn(
                'flex-1 rounded-sm transition-all',
                isAbove ? 'bg-destructive/70' : 'bg-primary/40'
              )}
              style={{ height: `${Math.max(4, pct)}%` }}
              title={`${val}`}
            />
          );
        })}
      </div>
      <div className="relative h-px bg-muted mt-0.5">
        <div
          className="absolute h-px bg-warning/50 w-full"
          style={{ bottom: `${(threshold / maxValue) * 100}%` }}
        />
      </div>
    </div>
  );
}
