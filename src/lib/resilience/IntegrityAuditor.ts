/**
 * ZENITH — Integrity Auditor
 * Verificación recurrente de hashes SHA-256 en registros críticos.
 * Detecta manipulación de datos en embarques, pre-facturas y audit logs.
 */

import CryptoJS from 'crypto-js';

export interface IntegrityRecord {
  id: string;
  table: string;
  recordId: string;
  expectedHash: string;
  computedHash: string;
  isValid: boolean;
  checkedAt: string;
  fields: Record<string, unknown>;
}

export interface IntegrityAuditResult {
  totalChecked: number;
  valid: number;
  tampered: number;
  errors: number;
  records: IntegrityRecord[];
  startedAt: string;
  completedAt: string;
  resilienceIndex: number; // 0-100
}

type AuditListener = (result: IntegrityAuditResult) => void;

export class IntegrityAuditor {
  private lastResult: IntegrityAuditResult | null = null;
  private listeners: AuditListener[] = [];
  private timer: number | null = null;

  // ── Compute SHA-256 for a record ──────────

  static computeHash(data: Record<string, unknown>): string {
    const canonicalized = JSON.stringify(data, Object.keys(data).sort());
    return CryptoJS.SHA256(canonicalized).toString();
  }

  // ── Run Integrity Audit ───────────────────

  async runAudit(records: Array<{
    table: string;
    recordId: string;
    fields: Record<string, unknown>;
    storedHash: string | null;
  }>): Promise<IntegrityAuditResult> {
    const startedAt = new Date().toISOString();
    const checked: IntegrityRecord[] = [];
    let valid = 0;
    let tampered = 0;
    let errors = 0;

    for (const record of records) {
      try {
        const computedHash = IntegrityAuditor.computeHash(record.fields);
        const expectedHash = record.storedHash || '';
        const isValid = !record.storedHash || computedHash === expectedHash;

        if (isValid) valid++;
        else tampered++;

        checked.push({
          id: `IA-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
          table: record.table,
          recordId: record.recordId,
          expectedHash,
          computedHash,
          isValid,
          checkedAt: new Date().toISOString(),
          fields: record.fields,
        });
      } catch {
        errors++;
      }
    }

    const totalChecked = valid + tampered + errors;
    const resilienceIndex = totalChecked > 0
      ? Math.round((valid / totalChecked) * 100)
      : 100;

    const result: IntegrityAuditResult = {
      totalChecked,
      valid,
      tampered,
      errors,
      records: checked,
      startedAt,
      completedAt: new Date().toISOString(),
      resilienceIndex,
    };

    this.lastResult = result;
    this.listeners.forEach(fn => fn(result));
    return result;
  }

  // ── Schedule Recurring Audits ─────────────

  startRecurring(intervalMs: number, auditFn: () => Promise<void>): void {
    this.stopRecurring();
    auditFn(); // immediate first run
    this.timer = window.setInterval(auditFn, intervalMs);
  }

  stopRecurring(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // ── Queries ────────────────────────────────

  getLastResult(): IntegrityAuditResult | null {
    return this.lastResult;
  }

  getResilienceIndex(): number {
    return this.lastResult?.resilienceIndex ?? 100;
  }

  // ── Events ─────────────────────────────────

  onAudit(listener: AuditListener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  destroy(): void {
    this.stopRecurring();
    this.listeners = [];
  }
}

// ── Singleton ──────────────────────────────
export const integrityAuditor = new IntegrityAuditor();
