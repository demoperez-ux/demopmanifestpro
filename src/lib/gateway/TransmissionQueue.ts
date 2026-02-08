// ============================================
// ZENITH API GATEWAY — Transmission Queue
// Retry logic with exponential back-off for
// unstable ANA connectivity
// ============================================

export type TransmissionStatus = 'pending' | 'sending' | 'success' | 'retrying' | 'failed' | 'cancelled';

export interface TransmissionItem {
  id: string;
  declaracionId: string;
  tipoDeclaracion: string;
  consignatario: string;
  destino: string;                // Service endpoint name
  xmlPayload: string;
  hashIntegridad: string;
  status: TransmissionStatus;
  intentos: number;
  maxIntentos: number;
  proximoReintento: string | null;
  createdAt: string;
  ultimoIntento: string | null;
  respuesta: string | null;
  codigoError: string | null;
  latenciaMs: number | null;
  zodVerificado: boolean;
}

export interface QueueStats {
  totalEnCola: number;
  enviando: number;
  exitosos: number;
  reintentando: number;
  fallidos: number;
  cancelados: number;
  latenciaPromedio: number;
  tasaExito: number;
}

export interface QueueEvent {
  type: 'enqueued' | 'sending' | 'success' | 'retry' | 'failed' | 'cancelled';
  item: TransmissionItem;
  timestamp: string;
}

// ── Configuration ───────────────────────────

const DEFAULT_CONFIG = {
  maxIntentos: 5,
  intervaloBaseMs: 300_000,  // 5 minutes
  factorExponencial: 1.5,
  timeoutMs: 30_000,
  maxConcurrentes: 3,
};

// ── Queue Engine ────────────────────────────

export class ColaTransmision {
  private items: Map<string, TransmissionItem> = new Map();
  private procesando: Set<string> = new Set();
  private timer: number | null = null;
  private listeners: ((event: QueueEvent) => void)[] = [];
  private historial: TransmissionItem[] = [];

  // ── Enqueue ─────────────────────────────

  encolar(params: {
    declaracionId: string;
    tipoDeclaracion: string;
    consignatario: string;
    destino: string;
    xmlPayload: string;
    hashIntegridad: string;
  }): TransmissionItem {
    const item: TransmissionItem = {
      id: `TXQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      ...params,
      status: 'pending',
      intentos: 0,
      maxIntentos: DEFAULT_CONFIG.maxIntentos,
      proximoReintento: null,
      createdAt: new Date().toISOString(),
      ultimoIntento: null,
      respuesta: null,
      codigoError: null,
      latenciaMs: null,
      zodVerificado: true,
    };

    this.items.set(item.id, item);
    this.emitEvent({ type: 'enqueued', item, timestamp: item.createdAt });
    this.procesarSiguiente();
    return item;
  }

  // ── Process Next ────────────────────────

  private async procesarSiguiente(): Promise<void> {
    if (this.procesando.size >= DEFAULT_CONFIG.maxConcurrentes) return;

    const pendientes = Array.from(this.items.values()).filter(
      i => i.status === 'pending' || (i.status === 'retrying' && this.esHoraDeReintentar(i))
    );

    for (const item of pendientes.slice(0, DEFAULT_CONFIG.maxConcurrentes - this.procesando.size)) {
      this.enviar(item);
    }
  }

  private esHoraDeReintentar(item: TransmissionItem): boolean {
    if (!item.proximoReintento) return true;
    return new Date(item.proximoReintento).getTime() <= Date.now();
  }

  // ── Send (simulated) ───────────────────

  private async enviar(item: TransmissionItem): Promise<void> {
    this.procesando.add(item.id);
    item.status = 'sending';
    item.intentos++;
    item.ultimoIntento = new Date().toISOString();
    this.emitEvent({ type: 'sending', item, timestamp: item.ultimoIntento });

    const inicio = Date.now();

    // Simulate network call
    const resultado = await this.simularTransmision(item);

    item.latenciaMs = Date.now() - inicio;
    this.procesando.delete(item.id);

    if (resultado.exito) {
      item.status = 'success';
      item.respuesta = resultado.respuesta;
      item.codigoError = null;
      this.emitEvent({ type: 'success', item, timestamp: new Date().toISOString() });
      // Move to history
      this.historial.push({ ...item });
      this.items.delete(item.id);
    } else {
      item.codigoError = resultado.codigoError;
      item.respuesta = resultado.respuesta;

      if (item.intentos >= item.maxIntentos) {
        item.status = 'failed';
        this.emitEvent({ type: 'failed', item, timestamp: new Date().toISOString() });
        this.historial.push({ ...item });
        this.items.delete(item.id);
      } else {
        // Schedule retry with exponential backoff
        const delay = DEFAULT_CONFIG.intervaloBaseMs * Math.pow(DEFAULT_CONFIG.factorExponencial, item.intentos - 1);
        item.status = 'retrying';
        item.proximoReintento = new Date(Date.now() + delay).toISOString();
        this.emitEvent({ type: 'retry', item, timestamp: new Date().toISOString() });
        this.programarReintento(delay);
      }
    }
  }

  private async simularTransmision(item: TransmissionItem): Promise<{
    exito: boolean;
    respuesta: string;
    codigoError: string | null;
  }> {
    return new Promise(resolve => {
      const duracion = Math.floor(Math.random() * 3000 + 500);
      setTimeout(() => {
        const rand = Math.random();

        // Higher success rate on retries
        const tasaExito = Math.min(0.65 + (item.intentos * 0.10), 0.95);

        if (rand < tasaExito) {
          const numLiquidacion = `LIQ-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
          resolve({
            exito: true,
            respuesta: JSON.stringify({
              status: 'ACCEPTED',
              numeroLiquidacion: numLiquidacion,
              timestamp: new Date().toISOString(),
              receptor: 'ANA-SIGA',
              codigoConfirmacion: `ACK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            }),
            codigoError: null,
          });
        } else {
          const errores = [
            { code: 'SIGA-TIMEOUT', msg: 'Timeout de conexión con servidores SIGA' },
            { code: 'SIGA-503', msg: 'Servicio temporalmente no disponible' },
            { code: 'AUTH-EXPIRED', msg: 'Token de autenticación expirado' },
            { code: 'NET-ERR', msg: 'Error de red — sin respuesta del endpoint' },
            { code: 'SIGA-429', msg: 'Límite de solicitudes excedido — throttling activo' },
          ];
          const err = errores[Math.floor(Math.random() * errores.length)];
          resolve({
            exito: false,
            respuesta: JSON.stringify({ error: err.code, message: err.msg }),
            codigoError: err.code,
          });
        }
      }, duracion);
    });
  }

  private programarReintento(delayMs: number): void {
    // In demo mode, use a much shorter delay
    const demoDelay = Math.min(delayMs, 10_000); // Cap at 10s for demo
    if (this.timer) clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.procesarSiguiente();
    }, demoDelay);
  }

  // ── Manual Actions ────────────────────

  reintentarManual(itemId: string): void {
    const item = this.items.get(itemId) || this.historial.find(h => h.id === itemId);
    if (!item) return;

    if (item.status === 'failed') {
      // Re-enqueue failed item
      this.encolar({
        declaracionId: item.declaracionId,
        tipoDeclaracion: item.tipoDeclaracion,
        consignatario: item.consignatario,
        destino: item.destino,
        xmlPayload: item.xmlPayload,
        hashIntegridad: item.hashIntegridad,
      });
    } else if (item.status === 'retrying') {
      item.proximoReintento = null; // Force immediate retry
      this.procesarSiguiente();
    }
  }

  cancelar(itemId: string): void {
    const item = this.items.get(itemId);
    if (!item) return;
    item.status = 'cancelled';
    this.emitEvent({ type: 'cancelled', item, timestamp: new Date().toISOString() });
    this.historial.push({ ...item });
    this.items.delete(itemId);
    this.procesando.delete(itemId);
  }

  // ── Queries ───────────────────────────

  getItemsEnCola(): TransmissionItem[] {
    return Array.from(this.items.values());
  }

  getHistorial(): TransmissionItem[] {
    return [...this.historial];
  }

  getStats(): QueueStats {
    const todos = [...Array.from(this.items.values()), ...this.historial];
    const exitosos = todos.filter(i => i.status === 'success');
    const latencias = exitosos.filter(i => i.latenciaMs).map(i => i.latenciaMs!);

    return {
      totalEnCola: this.items.size,
      enviando: this.procesando.size,
      exitosos: exitosos.length,
      reintentando: Array.from(this.items.values()).filter(i => i.status === 'retrying').length,
      fallidos: todos.filter(i => i.status === 'failed').length,
      cancelados: todos.filter(i => i.status === 'cancelled').length,
      latenciaPromedio: latencias.length > 0 ? Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length) : 0,
      tasaExito: todos.length > 0 ? Math.round((exitosos.length / Math.max(todos.filter(i => i.status !== 'pending' && i.status !== 'sending').length, 1)) * 100) : 0,
    };
  }

  // ── Events ────────────────────────────

  onEvent(listener: (event: QueueEvent) => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private emitEvent(event: QueueEvent): void {
    this.listeners.forEach(fn => fn(event));
  }

  // ── Cleanup ───────────────────────────

  destruir(): void {
    if (this.timer) clearTimeout(this.timer);
    this.items.clear();
    this.procesando.clear();
    this.listeners = [];
  }
}

// ── Singleton ───────────────────────────────
export const colaTransmision = new ColaTransmision();
