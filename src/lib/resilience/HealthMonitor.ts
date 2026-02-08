// ============================================
// ZENITH — Real-Time Health Monitor
// Tracks CPU-like load, DB latency, WebSocket
// status, and memory pressure
// ============================================

export interface HealthMetrics {
  timestamp: string;
  cpuLoad: number;            // 0-100 simulated engine load
  memoryUsageMB: number;
  dbLatencyMs: number;
  wsConnected: boolean;
  wsLatencyMs: number;
  activeWorkers: number;
  queueDepth: number;
  requestsPerMinute: number;
  errorRate: number;           // 0-100
}

export interface HealthTrend {
  metrics: HealthMetrics[];
  status: 'healthy' | 'degraded' | 'critical';
  alerts: HealthAlert[];
}

export interface HealthAlert {
  id: string;
  metric: string;
  threshold: number;
  currentValue: number;
  severity: 'warning' | 'critical';
  message: string;
  timestamp: string;
}

type HealthListener = (trend: HealthTrend) => void;

const MAX_HISTORY = 60; // Keep last 60 readings

export class HealthMonitor {
  private history: HealthMetrics[] = [];
  private alerts: HealthAlert[] = [];
  private listeners: HealthListener[] = [];
  private pollTimer: number | null = null;
  private baseLoad = 15 + Math.random() * 10;

  // ── Start Monitoring ──────────────────────

  start(intervalMs: number = 3000): void {
    this.stop();
    this.tick(); // immediate first reading
    this.pollTimer = window.setInterval(() => this.tick(), intervalMs);
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // ── Get Current State ────────────────────

  getTrend(): HealthTrend {
    const latest = this.history[this.history.length - 1];
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

    if (latest) {
      if (latest.cpuLoad > 85 || latest.dbLatencyMs > 500 || latest.errorRate > 10) {
        status = 'critical';
      } else if (latest.cpuLoad > 60 || latest.dbLatencyMs > 200 || latest.errorRate > 5) {
        status = 'degraded';
      }
    }

    return {
      metrics: [...this.history],
      status,
      alerts: [...this.alerts].slice(-10),
    };
  }

  // ── Events ───────────────────────────────

  onUpdate(listener: HealthListener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  destroy(): void {
    this.stop();
    this.listeners = [];
    this.history = [];
    this.alerts = [];
  }

  // ── Internals ────────────────────────────

  private tick(): void {
    const now = new Date();
    const hourFactor = Math.sin((now.getHours() * Math.PI) / 12); // Simulates business hours load
    const noise = (Math.random() - 0.5) * 8;

    // Simulate occasional spikes
    const spike = Math.random() > 0.92 ? 20 + Math.random() * 30 : 0;

    const cpuLoad = Math.min(100, Math.max(5, this.baseLoad + hourFactor * 15 + noise + spike));
    const dbLatencyMs = Math.max(8, 25 + Math.random() * 40 + (cpuLoad > 70 ? cpuLoad * 2 : 0));
    const wsLatencyMs = Math.max(5, 15 + Math.random() * 20);
    const wsConnected = Math.random() > 0.02; // 98% uptime
    const memoryUsageMB = Math.round(120 + cpuLoad * 1.5 + Math.random() * 30);
    const activeWorkers = Math.floor(Math.random() * 4);
    const queueDepth = Math.floor(Math.random() * (cpuLoad > 60 ? 15 : 5));
    const requestsPerMinute = Math.floor(50 + cpuLoad * 2 + Math.random() * 20);
    const errorRate = Math.max(0, Math.min(25, (cpuLoad > 80 ? 5 + Math.random() * 10 : Math.random() * 2)));

    const metrics: HealthMetrics = {
      timestamp: now.toISOString(),
      cpuLoad: Math.round(cpuLoad * 10) / 10,
      memoryUsageMB,
      dbLatencyMs: Math.round(dbLatencyMs),
      wsConnected,
      wsLatencyMs: Math.round(wsLatencyMs),
      activeWorkers,
      queueDepth,
      requestsPerMinute,
      errorRate: Math.round(errorRate * 10) / 10,
    };

    this.history.push(metrics);
    if (this.history.length > MAX_HISTORY) this.history.shift();

    // Generate alerts
    this.checkAlerts(metrics);

    // Slowly drift base load
    this.baseLoad += (Math.random() - 0.5) * 2;
    this.baseLoad = Math.max(10, Math.min(50, this.baseLoad));

    const trend = this.getTrend();
    this.listeners.forEach(fn => fn(trend));
  }

  private checkAlerts(m: HealthMetrics): void {
    const ts = m.timestamp;

    if (m.cpuLoad > 85) {
      this.addAlert({ metric: 'CPU Load', threshold: 85, currentValue: m.cpuLoad, severity: 'critical', message: `Carga LEXIS crítica: ${m.cpuLoad}%`, timestamp: ts });
    } else if (m.cpuLoad > 60) {
      this.addAlert({ metric: 'CPU Load', threshold: 60, currentValue: m.cpuLoad, severity: 'warning', message: `Carga LEXIS elevada: ${m.cpuLoad}%`, timestamp: ts });
    }

    if (m.dbLatencyMs > 500) {
      this.addAlert({ metric: 'DB Latency', threshold: 500, currentValue: m.dbLatencyMs, severity: 'critical', message: `Latencia DB crítica: ${m.dbLatencyMs}ms`, timestamp: ts });
    }

    if (!m.wsConnected) {
      this.addAlert({ metric: 'WebSocket', threshold: 0, currentValue: 0, severity: 'critical', message: 'WebSocket desconectado', timestamp: ts });
    }

    if (m.errorRate > 10) {
      this.addAlert({ metric: 'Error Rate', threshold: 10, currentValue: m.errorRate, severity: 'critical', message: `Tasa de error elevada: ${m.errorRate}%`, timestamp: ts });
    }
  }

  private addAlert(data: Omit<HealthAlert, 'id'>): void {
    // Deduplicate: skip if same metric alert in last 10 seconds
    const recent = this.alerts.find(a =>
      a.metric === data.metric &&
      new Date(data.timestamp).getTime() - new Date(a.timestamp).getTime() < 10_000
    );
    if (recent) return;

    this.alerts.push({
      id: `HA-${Date.now().toString(36).toUpperCase()}`,
      ...data,
    });
    if (this.alerts.length > 50) this.alerts.shift();
  }
}

// ── Singleton ──────────────────────────────
export const healthMonitor = new HealthMonitor();
