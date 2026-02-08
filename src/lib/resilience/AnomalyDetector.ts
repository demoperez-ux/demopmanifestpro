// ============================================
// ZENITH — Anomaly Detector (Stella AI)
// Monitors download velocity and triggers
// MFA re-authentication on suspicious activity
// ============================================

export interface DownloadEvent {
  userId: string;
  timestamp: number;
  documentType: string;
  documentId: string;
}

export interface AnomalyAlert {
  id: string;
  type: 'mass_download' | 'rapid_access' | 'off_hours_activity';
  userId: string;
  severity: 'warning' | 'critical';
  message: string;
  details: string;
  timestamp: string;
  requiresMFA: boolean;
  resolved: boolean;
}

type AnomalyListener = (alert: AnomalyAlert) => void;

const THRESHOLDS = {
  /** Max downloads per minute before triggering alert */
  maxDownloadsPerMinute: 50,
  /** Max downloads per 5 min before requiring MFA */
  maxDownloadsPer5Min: 100,
  /** Window in ms for tracking (1 minute) */
  windowMs: 60_000,
  /** Extended window (5 minutes) */
  extendedWindowMs: 300_000,
};

export class AnomalyDetector {
  private downloads: DownloadEvent[] = [];
  private alerts: AnomalyAlert[] = [];
  private listeners: AnomalyListener[] = [];
  private mfaRequired = false;
  private mfaVerifiedAt: number | null = null;

  // ── Track Download ──────────────────────

  trackDownload(event: Omit<DownloadEvent, 'timestamp'>): AnomalyAlert | null {
    const now = Date.now();
    this.downloads.push({ ...event, timestamp: now });

    // Clean old entries
    this.downloads = this.downloads.filter(d => now - d.timestamp < THRESHOLDS.extendedWindowMs);

    // Check velocity
    const recentMinute = this.downloads.filter(d => now - d.timestamp < THRESHOLDS.windowMs);
    const recent5Min = this.downloads.filter(d => now - d.timestamp < THRESHOLDS.extendedWindowMs);

    if (recentMinute.length >= THRESHOLDS.maxDownloadsPerMinute) {
      const alert = this.createAlert({
        type: 'mass_download',
        userId: event.userId,
        severity: 'critical',
        message: `⚠️ Descarga masiva detectada: ${recentMinute.length} archivos en 1 minuto`,
        details: `El usuario ha descargado ${recentMinute.length} documentos en los últimos 60 segundos. Umbral: ${THRESHOLDS.maxDownloadsPerMinute}. Se requiere re-autenticación MFA.`,
        requiresMFA: true,
      });
      return alert;
    }

    if (recent5Min.length >= THRESHOLDS.maxDownloadsPer5Min) {
      const alert = this.createAlert({
        type: 'rapid_access',
        userId: event.userId,
        severity: 'warning',
        message: `Actividad de descarga elevada: ${recent5Min.length} archivos en 5 min`,
        details: `Velocidad de descarga sostenida alta. ${recent5Min.length} documentos en ventana de 5 minutos.`,
        requiresMFA: true,
      });
      return alert;
    }

    return null;
  }

  // ── MFA Gate ────────────────────────────

  isMFARequired(): boolean {
    return this.mfaRequired;
  }

  verifyMFA(): void {
    this.mfaRequired = false;
    this.mfaVerifiedAt = Date.now();
    // Reset download counter after MFA
    this.downloads = [];
  }

  // ── Queries ────────────────────────────

  getAlerts(): AnomalyAlert[] {
    return [...this.alerts];
  }

  getRecentDownloadCount(): { lastMinute: number; last5Min: number } {
    const now = Date.now();
    return {
      lastMinute: this.downloads.filter(d => now - d.timestamp < THRESHOLDS.windowMs).length,
      last5Min: this.downloads.filter(d => now - d.timestamp < THRESHOLDS.extendedWindowMs).length,
    };
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  // ── Events ────────────────────────────

  onAlert(listener: AnomalyListener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  // ── Internals ─────────────────────────

  private createAlert(data: Omit<AnomalyAlert, 'id' | 'timestamp' | 'resolved'>): AnomalyAlert {
    const alert: AnomalyAlert = {
      id: `ANM-${Date.now().toString(36).toUpperCase()}`,
      ...data,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    if (data.requiresMFA) {
      this.mfaRequired = true;
    }

    this.alerts.push(alert);
    if (this.alerts.length > 100) this.alerts.shift();
    this.listeners.forEach(fn => fn(alert));
    return alert;
  }

  destroy(): void {
    this.listeners = [];
    this.downloads = [];
    this.alerts = [];
  }
}

// ── Singleton ──────────────────────────────
export const anomalyDetector = new AnomalyDetector();
