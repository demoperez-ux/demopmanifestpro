// ============================================
// ZENITH API GATEWAY — Connectivity Monitor
// Real-time semaphore for ANA web services
// with auto-polling and health metrics
// ============================================

export type ServiceStatus = 'online' | 'latency_high' | 'maintenance' | 'offline';

export interface ServiceNode {
  id: string;
  nombre: string;
  descripcion: string;
  endpoint: string;
  status: ServiceStatus;
  latenciaMs: number;
  ultimoCheck: string;
  uptimePercent: number;
  erroresRecientes: number;
  historial: { timestamp: string; status: ServiceStatus; latenciaMs: number }[];
}

export interface ConnectivitySnapshot {
  timestamp: string;
  servicios: ServiceNode[];
  saludGlobal: ServiceStatus;
  latenciaPromedio: number;
  serviciosOnline: number;
  serviciosTotal: number;
}

// ── Service Definitions ─────────────────────

const SERVICIOS_ANA: Omit<ServiceNode, 'status' | 'latenciaMs' | 'ultimoCheck' | 'uptimePercent' | 'erroresRecientes' | 'historial'>[] = [
  {
    id: 'siga-declaraciones',
    nombre: 'SIGA Declaraciones',
    descripcion: 'Recepción y procesamiento de declaraciones aduaneras',
    endpoint: 'api.siga.ana.gob.pa/v3/declaraciones',
  },
  {
    id: 'siga-liquidaciones',
    nombre: 'SIGA Liquidaciones',
    descripcion: 'Generación de boletas y liquidaciones fiscales',
    endpoint: 'api.siga.ana.gob.pa/v3/liquidaciones',
  },
  {
    id: 'vuce-permisos',
    nombre: 'VUCE Permisos',
    descripcion: 'Ventanilla Única de Comercio Exterior — Permisos y licencias',
    endpoint: 'api.vuce.gob.pa/v2/permisos',
  },
  {
    id: 'crimsonlogic-gw',
    nombre: 'CrimsonLogic Gateway',
    descripcion: 'Gateway de interoperabilidad TradeNet para Panamá',
    endpoint: 'gateway.crimsonlogic.com/pa-customs/v2',
  },
  {
    id: 'siga-certificados',
    nombre: 'SIGA Certificados',
    descripcion: 'Emisión de certificados de origen y documentos oficiales',
    endpoint: 'api.siga.ana.gob.pa/v3/certificados',
  },
];

// ── Simulated Health Check ──────────────────

function simulateHealthCheck(serviceId: string): { status: ServiceStatus; latenciaMs: number } {
  const rand = Math.random();

  // VUCE historically has higher latency
  if (serviceId === 'vuce-permisos') {
    if (rand < 0.15) return { status: 'maintenance', latenciaMs: 0 };
    if (rand < 0.40) return { status: 'latency_high', latenciaMs: Math.floor(Math.random() * 2000 + 800) };
    return { status: 'online', latenciaMs: Math.floor(Math.random() * 600 + 200) };
  }

  // CrimsonLogic — occasional latency
  if (serviceId === 'crimsonlogic-gw') {
    if (rand < 0.05) return { status: 'offline', latenciaMs: 0 };
    if (rand < 0.20) return { status: 'latency_high', latenciaMs: Math.floor(Math.random() * 1500 + 600) };
    return { status: 'online', latenciaMs: Math.floor(Math.random() * 500 + 150) };
  }

  // SIGA services — generally stable
  if (rand < 0.03) return { status: 'maintenance', latenciaMs: 0 };
  if (rand < 0.10) return { status: 'latency_high', latenciaMs: Math.floor(Math.random() * 1000 + 500) };
  return { status: 'online', latenciaMs: Math.floor(Math.random() * 400 + 80) };
}

// ── Monitor Class ───────────────────────────

export class MonitorConectividad {
  private servicios: Map<string, ServiceNode> = new Map();
  private listeners: ((snapshot: ConnectivitySnapshot) => void)[] = [];
  private pollingInterval: number | null = null;

  constructor() {
    this.inicializarServicios();
  }

  private inicializarServicios(): void {
    for (const def of SERVICIOS_ANA) {
      const check = simulateHealthCheck(def.id);
      this.servicios.set(def.id, {
        ...def,
        status: check.status,
        latenciaMs: check.latenciaMs,
        ultimoCheck: new Date().toISOString(),
        uptimePercent: 99.2 + Math.random() * 0.7,
        erroresRecientes: Math.floor(Math.random() * 3),
        historial: [],
      });
    }
  }

  ejecutarHealthCheck(): ConnectivitySnapshot {
    const ts = new Date().toISOString();

    for (const [id, svc] of this.servicios) {
      const check = simulateHealthCheck(id);
      svc.status = check.status;
      svc.latenciaMs = check.latenciaMs;
      svc.ultimoCheck = ts;
      if (check.status === 'offline' || check.status === 'maintenance') {
        svc.erroresRecientes++;
      }
      svc.historial.push({ timestamp: ts, status: check.status, latenciaMs: check.latenciaMs });
      if (svc.historial.length > 50) svc.historial.shift();
    }

    const snapshot = this.getSnapshot();
    this.listeners.forEach(fn => fn(snapshot));
    return snapshot;
  }

  getSnapshot(): ConnectivitySnapshot {
    const servicios = Array.from(this.servicios.values());
    const online = servicios.filter(s => s.status === 'online').length;
    const latencias = servicios.filter(s => s.latenciaMs > 0).map(s => s.latenciaMs);

    let saludGlobal: ServiceStatus = 'online';
    if (servicios.some(s => s.status === 'offline')) saludGlobal = 'offline';
    else if (servicios.some(s => s.status === 'maintenance')) saludGlobal = 'maintenance';
    else if (servicios.some(s => s.status === 'latency_high')) saludGlobal = 'latency_high';

    return {
      timestamp: new Date().toISOString(),
      servicios,
      saludGlobal,
      latenciaPromedio: latencias.length > 0
        ? Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length)
        : 0,
      serviciosOnline: online,
      serviciosTotal: servicios.length,
    };
  }

  getServicio(id: string): ServiceNode | undefined {
    return this.servicios.get(id);
  }

  onUpdate(listener: (snapshot: ConnectivitySnapshot) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  iniciarPolling(intervaloMs: number = 30_000): void {
    this.detenerPolling();
    this.pollingInterval = window.setInterval(() => {
      this.ejecutarHealthCheck();
    }, intervaloMs);
  }

  detenerPolling(): void {
    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

// ── Singleton ───────────────────────────────
export const monitorConectividad = new MonitorConectividad();
