/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  NEXUS BRIDGE — Secure Inter-System Communication Tunnel     ║
 * ║  HMAC-SHA256 Signed Payload Exchange: ORIÓN ↔ ZENITH         ║
 * ║  © IPL / Orion Freight System — ZENITH Platform              ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * Security Protocol:
 *   1. Every outgoing payload is signed with HMAC-SHA256
 *   2. Every incoming payload is verified before ZOD purification
 *   3. All traffic is logged immutably in nexus_traffic_logs
 *   4. Tampered payloads trigger IP blocking + security alerts
 */

import CryptoJS from 'crypto-js';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type NexusDirection = 'orion_to_zenith' | 'zenith_to_orion';
export type NexusVerificationStatus = 'verified' | 'rejected' | 'tampered';

export interface NexusPayload {
  transactionId: string;
  direction: NexusDirection;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface NexusSignedPayload extends NexusPayload {
  signature: string;
  nonce: string;
}

export interface NexusVerificationResult {
  status: NexusVerificationStatus;
  transactionId: string;
  payloadHash: string;
  error?: string;
  zodScore?: number;
  zodFindings?: unknown[];
}

export interface NexusTrafficLog {
  direction: NexusDirection;
  transaction_id: string;
  payload_hash: string;
  verification_status: NexusVerificationStatus;
  source_ip?: string;
  source_domain?: string;
  endpoint?: string;
  payload_size?: number;
  zod_score?: number;
  zod_findings?: unknown[];
  error_message?: string;
  metadata?: Record<string, unknown>;
}

export interface NexusHandshakeOrionToZenith {
  type: 'arrival_confirmed';
  shipmentId: string;
  mawb: string;
  documents: {
    invoices: unknown[];
    billsOfLading: unknown[];
    packingLists: unknown[];
  };
  arrivalTimestamp: string;
}

export interface NexusHandshakeZenithToOrion {
  type: 'customs_status_update';
  shipmentId: string;
  mawb: string;
  legalStatus: 'levante_autorizado' | 'canal_rojo' | 'canal_verde' | 'canal_amarillo' | 'retenido';
  paymentReceipts: {
    boletaNumber: string;
    amount: number;
    currency: string;
    paidAt: string;
  }[];
  zodIntegrityHash: string;
}

// ═══════════════════════════════════════════════════════════════
// AUTHORIZED DOMAINS
// ═══════════════════════════════════════════════════════════════

const AUTHORIZED_DOMAINS = [
  'orion.iplpanama.com',
  'zenith.iplpanama.com',
  'api.iplpanama.com',
  'localhost',
  '127.0.0.1',
];

const NEXUS_SECURITY_HEADER = 'X-Nexus-Bridge-Token';
const NEXUS_SIGNATURE_HEADER = 'X-Nexus-Signature';
const NEXUS_NONCE_HEADER = 'X-Nexus-Nonce';
const NEXUS_TIMESTAMP_HEADER = 'X-Nexus-Timestamp';

// Max age for replay attack prevention (5 minutes)
const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════
// NEXUS BRIDGE ENGINE
// ═══════════════════════════════════════════════════════════════

export class NexusBridge {
  private static instance: NexusBridge | null = null;
  private usedNonces: Set<string> = new Set();
  private blockedIPs: Map<string, { blockedAt: string; reason: string }> = new Map();

  private constructor() {
    // Periodically clean old nonces (prevent memory leak)
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanExpiredNonces(), 10 * 60 * 1000);
    }
  }

  static getInstance(): NexusBridge {
    if (!NexusBridge.instance) {
      NexusBridge.instance = new NexusBridge();
    }
    return NexusBridge.instance;
  }

  // ── Signing ──────────────────────────────────────────────

  /**
   * Sign an outgoing payload with HMAC-SHA256.
   * Returns the payload with signature, nonce, and timestamp attached.
   */
  signPayload(payload: NexusPayload, secretKey: string): NexusSignedPayload {
    const nonce = this.generateNonce();
    const canonical = this.canonicalize(payload, nonce);
    const signature = CryptoJS.HmacSHA256(canonical, secretKey).toString();

    return {
      ...payload,
      signature,
      nonce,
    };
  }

  /**
   * Generate security headers for outgoing HTTP requests.
   */
  generateSecurityHeaders(
    signedPayload: NexusSignedPayload,
    bridgeToken: string
  ): Record<string, string> {
    return {
      [NEXUS_SECURITY_HEADER]: bridgeToken,
      [NEXUS_SIGNATURE_HEADER]: signedPayload.signature,
      [NEXUS_NONCE_HEADER]: signedPayload.nonce,
      [NEXUS_TIMESTAMP_HEADER]: signedPayload.timestamp,
      'Content-Type': 'application/json',
    };
  }

  // ── Verification ─────────────────────────────────────────

  /**
   * Verify an incoming signed payload.
   * Checks: signature match, timestamp freshness, nonce uniqueness, domain authorization.
   */
  verifyPayload(
    signedPayload: NexusSignedPayload,
    secretKey: string,
    sourceIP?: string,
    sourceDomain?: string
  ): NexusVerificationResult {
    const payloadHash = CryptoJS.SHA256(
      JSON.stringify(signedPayload.data)
    ).toString();

    // 1. Check blocked IP
    if (sourceIP && this.blockedIPs.has(sourceIP)) {
      return {
        status: 'rejected',
        transactionId: signedPayload.transactionId,
        payloadHash,
        error: `IP ${sourceIP} is blocked: ${this.blockedIPs.get(sourceIP)?.reason}`,
      };
    }

    // 2. Verify domain authorization
    if (sourceDomain && !this.isDomainAuthorized(sourceDomain)) {
      return {
        status: 'rejected',
        transactionId: signedPayload.transactionId,
        payloadHash,
        error: `Unauthorized domain: ${sourceDomain}`,
      };
    }

    // 3. Check timestamp freshness (replay attack prevention)
    const payloadTime = new Date(signedPayload.timestamp).getTime();
    const now = Date.now();
    if (Math.abs(now - payloadTime) > MAX_TIMESTAMP_DRIFT_MS) {
      return {
        status: 'rejected',
        transactionId: signedPayload.transactionId,
        payloadHash,
        error: 'Timestamp drift exceeds 5-minute tolerance. Possible replay attack.',
      };
    }

    // 4. Check nonce uniqueness
    if (this.usedNonces.has(signedPayload.nonce)) {
      this.blockIP(sourceIP, 'Nonce reuse detected — replay attack attempt');
      return {
        status: 'tampered',
        transactionId: signedPayload.transactionId,
        payloadHash,
        error: 'Nonce already used. Replay attack detected. IP blocked.',
      };
    }

    // 5. Recalculate HMAC and compare
    const canonical = this.canonicalize(signedPayload, signedPayload.nonce);
    const expectedSignature = CryptoJS.HmacSHA256(canonical, secretKey).toString();

    if (expectedSignature !== signedPayload.signature) {
      this.blockIP(sourceIP, 'HMAC signature mismatch — data tampering attempt');
      return {
        status: 'tampered',
        transactionId: signedPayload.transactionId,
        payloadHash,
        error: 'HMAC-SHA256 signature mismatch. Data tampering detected. IP blocked.',
      };
    }

    // 6. Mark nonce as used
    this.usedNonces.add(signedPayload.nonce);

    return {
      status: 'verified',
      transactionId: signedPayload.transactionId,
      payloadHash,
    };
  }

  // ── Domain & IP Security ─────────────────────────────────

  isDomainAuthorized(domain: string): boolean {
    return AUTHORIZED_DOMAINS.some(
      (d) => domain === d || domain.endsWith(`.${d}`)
    );
  }

  blockIP(ip: string | undefined, reason: string): void {
    if (!ip) return;
    this.blockedIPs.set(ip, {
      blockedAt: new Date().toISOString(),
      reason,
    });
  }

  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  getBlockedIPs(): Map<string, { blockedAt: string; reason: string }> {
    return new Map(this.blockedIPs);
  }

  // ── Handshake Builders ───────────────────────────────────

  /**
   * Build Orion → Zenith handshake payload (arrival + documents).
   */
  buildOrionToZenithHandshake(
    data: NexusHandshakeOrionToZenith
  ): NexusPayload {
    return {
      transactionId: `NX-O2Z-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      direction: 'orion_to_zenith',
      timestamp: new Date().toISOString(),
      data: data as unknown as Record<string, unknown>,
    };
  }

  /**
   * Build Zenith → Orion handshake payload (legal status + payments).
   */
  buildZenithToOrionHandshake(
    data: NexusHandshakeZenithToOrion
  ): NexusPayload {
    return {
      transactionId: `NX-Z2O-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      direction: 'zenith_to_orion',
      timestamp: new Date().toISOString(),
      data: data as unknown as Record<string, unknown>,
    };
  }

  // ── Traffic Log Builder ──────────────────────────────────

  buildTrafficLog(
    result: NexusVerificationResult,
    direction: NexusDirection,
    options?: {
      sourceIP?: string;
      sourceDomain?: string;
      endpoint?: string;
      payloadSize?: number;
    }
  ): NexusTrafficLog {
    return {
      direction,
      transaction_id: result.transactionId,
      payload_hash: result.payloadHash,
      verification_status: result.status,
      source_ip: options?.sourceIP,
      source_domain: options?.sourceDomain,
      endpoint: options?.endpoint,
      payload_size: options?.payloadSize,
      zod_score: result.zodScore,
      zod_findings: result.zodFindings,
      error_message: result.error,
    };
  }

  // ── Internals ────────────────────────────────────────────

  private canonicalize(payload: NexusPayload, nonce: string): string {
    const sortedData = JSON.stringify(payload.data, Object.keys(payload.data).sort());
    return `${payload.transactionId}|${payload.direction}|${payload.timestamp}|${nonce}|${sortedData}`;
  }

  private generateNonce(): string {
    const array = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < 32; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  private cleanExpiredNonces(): void {
    // Simple strategy: clear all nonces every 10 minutes
    // In production, use timestamp-tagged nonces
    if (this.usedNonces.size > 10000) {
      this.usedNonces.clear();
    }
  }

  destroy(): void {
    NexusBridge.instance = null;
  }
}

// ── Singleton Export ────────────────────────────────────────
export const nexusBridge = NexusBridge.getInstance();

// ── Header Constants Export ────────────────────────────────
export const NEXUS_HEADERS = {
  SECURITY: NEXUS_SECURITY_HEADER,
  SIGNATURE: NEXUS_SIGNATURE_HEADER,
  NONCE: NEXUS_NONCE_HEADER,
  TIMESTAMP: NEXUS_TIMESTAMP_HEADER,
} as const;
