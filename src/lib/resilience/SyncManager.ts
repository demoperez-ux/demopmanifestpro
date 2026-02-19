/**
 * ZENITH — SyncManager
 * Persistencia local con IndexedDB + Backoff Exponencial
 * para sincronización diferida cuando servicios externos fallan.
 */

export interface PendingSync {
  id: string;
  endpoint: string;
  payload: unknown;
  createdAt: string;
  lastAttempt: string | null;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  lastError: string | null;
  nextRetryAt: string | null;
}

export interface SyncManagerSnapshot {
  pending: number;
  syncing: number;
  failed: number;
  synced: number;
  isRunning: boolean;
  lastSyncAttempt: string | null;
}

type SyncListener = (snapshot: SyncManagerSnapshot) => void;

const STORAGE_KEY = 'zenith-sync-queue';
const BASE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 300_000; // 5 minutes cap
const DEFAULT_MAX_RETRIES = 10;

export class SyncManager {
  private queue: PendingSync[] = [];
  private listeners: SyncListener[] = [];
  private timer: number | null = null;
  private running = false;
  private lastSyncAttempt: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  // ── Enqueue a failed operation ──────────────

  enqueue(endpoint: string, payload: unknown, maxRetries = DEFAULT_MAX_RETRIES): PendingSync {
    const item: PendingSync = {
      id: `SYNC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5)}`,
      endpoint,
      payload,
      createdAt: new Date().toISOString(),
      lastAttempt: null,
      retries: 0,
      maxRetries,
      status: 'pending',
      lastError: null,
      nextRetryAt: new Date(Date.now() + BASE_DELAY_MS).toISOString(),
    };
    this.queue.push(item);
    this.persistToStorage();
    this.notify();
    this.scheduleNext();
    return item;
  }

  // ── Start/Stop background sync ─────────────

  start(intervalMs = 5_000): void {
    if (this.running) return;
    this.running = true;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), intervalMs);
    this.notify();
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.notify();
  }

  // ── Process ready items ────────────────────

  private async tick(): Promise<void> {
    const now = Date.now();
    const ready = this.queue.filter(
      q => q.status === 'pending' && q.nextRetryAt && new Date(q.nextRetryAt).getTime() <= now
    );

    for (const item of ready) {
      item.status = 'syncing';
      item.lastAttempt = new Date().toISOString();
      item.retries++;
      this.lastSyncAttempt = item.lastAttempt;
      this.notify();

      try {
        // Attempt the sync (simulated — in production, call fetch)
        await this.attemptSync(item);
        item.status = 'synced';
        item.lastError = null;
      } catch (err) {
        if (item.retries >= item.maxRetries) {
          item.status = 'failed';
          item.lastError = err instanceof Error ? err.message : 'Max retries exceeded';
        } else {
          item.status = 'pending';
          item.lastError = err instanceof Error ? err.message : 'Sync failed';
          // Exponential backoff: 2^retries * base, capped
          const delay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, item.retries));
          const jitter = delay * 0.2 * Math.random();
          item.nextRetryAt = new Date(Date.now() + delay + jitter).toISOString();
        }
      }
    }

    this.persistToStorage();
    this.notify();
  }

  private async attemptSync(item: PendingSync): Promise<void> {
    // In production, this would be a real fetch call
    // For now, simulate with 70% success rate
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.3) {
          resolve();
        } else {
          reject(new Error(`Service unavailable: ${item.endpoint}`));
        }
      }, 200 + Math.random() * 300);
    });
  }

  // ── Queries ────────────────────────────────

  getSnapshot(): SyncManagerSnapshot {
    return {
      pending: this.queue.filter(q => q.status === 'pending').length,
      syncing: this.queue.filter(q => q.status === 'syncing').length,
      failed: this.queue.filter(q => q.status === 'failed').length,
      synced: this.queue.filter(q => q.status === 'synced').length,
      isRunning: this.running,
      lastSyncAttempt: this.lastSyncAttempt,
    };
  }

  getQueue(): PendingSync[] {
    return [...this.queue];
  }

  retryFailed(): void {
    this.queue
      .filter(q => q.status === 'failed')
      .forEach(q => {
        q.status = 'pending';
        q.retries = 0;
        q.nextRetryAt = new Date(Date.now() + BASE_DELAY_MS).toISOString();
      });
    this.persistToStorage();
    this.notify();
  }

  clearSynced(): void {
    this.queue = this.queue.filter(q => q.status !== 'synced');
    this.persistToStorage();
    this.notify();
  }

  // ── Events ─────────────────────────────────

  onUpdate(listener: SyncListener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  // ── Persistence ────────────────────────────

  private persistToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch { /* quota exceeded — graceful degradation */ }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.queue = JSON.parse(data);
        // Reset any stuck "syncing" items
        this.queue.filter(q => q.status === 'syncing').forEach(q => { q.status = 'pending'; });
      }
    } catch { /* corrupted data — start fresh */ }
  }

  private scheduleNext(): void {
    if (this.running) return; // already running
    // Auto-start if items are queued
    this.start();
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach(fn => fn(snapshot));
  }

  destroy(): void {
    this.stop();
    this.listeners = [];
  }
}

// ── Singleton ──────────────────────────────
export const syncManager = new SyncManager();
