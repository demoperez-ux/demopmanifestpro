// ============================================
// ZENITH — Circuit Breaker Pattern
// Auto-switches to async queue mode when ANA
// services exceed latency thresholds
// ============================================

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerConfig {
  /** Threshold in ms to consider a timeout */
  timeoutMs: number;
  /** Number of consecutive failures before opening circuit */
  failureThreshold: number;
  /** How long to keep circuit open before trying half-open (ms) */
  resetTimeoutMs: number;
  /** Retry interval when in queue mode (ms) */
  retryIntervalMs: number;
}

export interface QueuedItem {
  id: string;
  payload: unknown;
  timestamp: string;
  retries: number;
  lastError: string | null;
}

export interface CircuitBreakerSnapshot {
  state: CircuitState;
  consecutiveFailures: number;
  lastFailure: string | null;
  lastSuccess: string | null;
  queueSize: number;
  totalProcessed: number;
  totalFailed: number;
  uptime: number;
  avgLatency: number;
}

type CircuitListener = (snapshot: CircuitBreakerSnapshot) => void;

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  timeoutMs: 10_000,
  failureThreshold: 3,
  resetTimeoutMs: 120_000, // 2 minutes
  retryIntervalMs: 120_000, // 2 minutes
};

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private lastFailure: string | null = null;
  private lastSuccess: string | null = null;
  private openedAt: number | null = null;
  private queue: QueuedItem[] = [];
  private retryTimer: number | null = null;
  private totalProcessed = 0;
  private totalFailed = 0;
  private latencies: number[] = [];
  private listeners: CircuitListener[] = [];
  private config: CircuitBreakerConfig;
  private startTime = Date.now();

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ── Execute with circuit protection ──────────

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half_open';
        this.notify();
      } else {
        throw new CircuitOpenError('Circuit is OPEN — request queued for async retry');
      }
    }

    const start = Date.now();

    try {
      const result = await Promise.race([
        fn(),
        this.createTimeout(),
      ]) as T;

      const latency = Date.now() - start;
      this.recordSuccess(latency);
      return result;
    } catch (error) {
      const latency = Date.now() - start;
      this.recordFailure(latency, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // ── Queue Management ────────────────────────

  enqueue(payload: unknown): QueuedItem {
    const item: QueuedItem = {
      id: `CBQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      payload,
      timestamp: new Date().toISOString(),
      retries: 0,
      lastError: null,
    };
    this.queue.push(item);
    this.startRetryLoop();
    this.notify();
    return item;
  }

  getQueue(): QueuedItem[] {
    return [...this.queue];
  }

  clearQueue(): void {
    this.queue = [];
    this.notify();
  }

  // ── Snapshot ────────────────────────────────

  getSnapshot(): CircuitBreakerSnapshot {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      queueSize: this.queue.length,
      totalProcessed: this.totalProcessed,
      totalFailed: this.totalFailed,
      uptime: Date.now() - this.startTime,
      avgLatency: this.latencies.length > 0
        ? Math.round(this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length)
        : 0,
    };
  }

  // ── Events ─────────────────────────────────

  onStateChange(listener: CircuitListener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  // ── Manual Controls ───────────────────────

  forceClose(): void {
    this.state = 'closed';
    this.consecutiveFailures = 0;
    this.notify();
  }

  forceOpen(): void {
    this.state = 'open';
    this.openedAt = Date.now();
    this.notify();
  }

  reset(): void {
    this.state = 'closed';
    this.consecutiveFailures = 0;
    this.lastFailure = null;
    this.lastSuccess = null;
    this.openedAt = null;
    this.queue = [];
    this.totalProcessed = 0;
    this.totalFailed = 0;
    this.latencies = [];
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    this.notify();
  }

  destroy(): void {
    if (this.retryTimer) clearInterval(this.retryTimer);
    this.listeners = [];
    this.queue = [];
  }

  // ── Internals ─────────────────────────────

  private recordSuccess(latencyMs: number): void {
    this.consecutiveFailures = 0;
    this.lastSuccess = new Date().toISOString();
    this.totalProcessed++;
    this.latencies.push(latencyMs);
    if (this.latencies.length > 100) this.latencies.shift();

    if (this.state === 'half_open') {
      this.state = 'closed';
    }
    this.notify();
  }

  private recordFailure(latencyMs: number, error: string): void {
    this.consecutiveFailures++;
    this.lastFailure = new Date().toISOString();
    this.totalFailed++;
    this.latencies.push(latencyMs);
    if (this.latencies.length > 100) this.latencies.shift();

    if (this.consecutiveFailures >= this.config.failureThreshold) {
      this.state = 'open';
      this.openedAt = Date.now();
    }
    this.notify();
  }

  private shouldAttemptReset(): boolean {
    if (!this.openedAt) return false;
    return Date.now() - this.openedAt >= this.config.resetTimeoutMs;
  }

  private createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new TimeoutError(`Request timed out after ${this.config.timeoutMs}ms`)), this.config.timeoutMs);
    });
  }

  private startRetryLoop(): void {
    if (this.retryTimer) return;
    this.retryTimer = window.setInterval(() => {
      if (this.queue.length === 0) {
        clearInterval(this.retryTimer!);
        this.retryTimer = null;
        return;
      }
      // Simulate processing queued items
      const item = this.queue[0];
      if (item) {
        item.retries++;
        // In a real system, attempt to resend here
        // For demo, randomly succeed
        if (Math.random() > 0.4) {
          this.queue.shift();
          this.totalProcessed++;
        } else {
          item.lastError = 'Retry failed — service still unavailable';
        }
        this.notify();
      }
    }, Math.min(this.config.retryIntervalMs, 15_000)); // Cap at 15s for demo
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach(fn => fn(snapshot));
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ── Singleton for ANA/CrimsonLogic ────────────
export const circuitBreakerANA = new CircuitBreaker({
  timeoutMs: 10_000,
  failureThreshold: 3,
  resetTimeoutMs: 120_000,
  retryIntervalMs: 120_000,
});
