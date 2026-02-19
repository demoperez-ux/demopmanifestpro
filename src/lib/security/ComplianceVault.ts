/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  COMPLIANCE VAULT — Digital Certificate Management           ║
 * ║  Gestión de Certificados de Firma Electrónica Regional       ║
 * ║  ZENITH Customs Intelligence Platform                        ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * Jurisdicciones: PA · CR · GT
 * Capacidades: Firmas en cascada, auditoría de uso, rotación
 *
 * @maintained-by Core Development Team
 */

import CryptoJS from 'crypto-js';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type CertificateRegion = 'PA' | 'CR' | 'GT';
export type CertificateStatus = 'active' | 'expired' | 'revoked' | 'pending_renewal';
export type SignatureLevel = 'simple' | 'advanced' | 'qualified';

export interface DigitalCertificate {
  id: string;
  region: CertificateRegion;
  holderId: string;
  holderRole: string;
  issuer: string;
  serialNumber: string;
  publicKeyHash: string;
  signatureLevel: SignatureLevel;
  status: CertificateStatus;
  issuedAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  usageCount: number;
  legalBasis: string;
  metadata: Record<string, unknown>;
}

export interface CascadeSignature {
  id: string;
  documentId: string;
  documentHash: string;
  signatures: SignatureEntry[];
  status: 'pending' | 'partial' | 'complete' | 'rejected';
  requiredSigners: number;
  completedSigners: number;
  createdAt: string;
  completedAt: string | null;
  region: CertificateRegion;
}

export interface SignatureEntry {
  signerId: string;
  signerRole: string;
  certificateId: string;
  signatureHash: string;
  timestamp: string;
  ipAddress: string;
  deviceFingerprint: string;
  level: SignatureLevel;
  status: 'valid' | 'rejected' | 'pending';
  rejectionReason?: string;
}

export interface CertificateAuditEntry {
  id: string;
  certificateId: string;
  action: 'sign' | 'verify' | 'revoke' | 'renew' | 'create' | 'cascade_init' | 'cascade_sign';
  performedBy: string;
  timestamp: string;
  documentId?: string;
  ipAddress: string;
  resultHash: string;
  success: boolean;
  details: string;
}

// ═══════════════════════════════════════════════════════════════
// REGIONAL AUTHORITY CONFIG
// ═══════════════════════════════════════════════════════════════

interface RegionalCertAuthority {
  name: string;
  code: CertificateRegion;
  authority: string;
  legalBasis: string;
  requiredLevel: SignatureLevel;
  cascadeRoles: string[];
  maxCertValidityDays: number;
}

const REGIONAL_CERT_AUTHORITIES: Record<CertificateRegion, RegionalCertAuthority> = {
  PA: {
    name: 'Panamá',
    code: 'PA',
    authority: 'Dirección Nacional de Firma Electrónica (DNFE)',
    legalBasis: 'Ley 51 de 2008 — Firma Electrónica, Documentos Electrónicos y PKI',
    requiredLevel: 'advanced',
    cascadeRoles: ['corredor_principal', 'revisor_legal', 'oficial_cumplimiento'],
    maxCertValidityDays: 365,
  },
  CR: {
    name: 'Costa Rica',
    code: 'CR',
    authority: 'MICITT — Dirección de Certificadores de Firma Digital',
    legalBasis: 'Ley 8454 de 2005 — Certificados, Firmas Digitales y Documentos Electrónicos',
    requiredLevel: 'qualified',
    cascadeRoles: ['agente_aduanero', 'verificador_tecnico', 'jefe_operaciones'],
    maxCertValidityDays: 730,
  },
  GT: {
    name: 'Guatemala',
    code: 'GT',
    authority: 'Registro de Prestadores de Servicios de Certificación (RPSC)',
    legalBasis: 'Decreto 47-2008 — Ley para el Reconocimiento de las Comunicaciones y Firmas Electrónicas',
    requiredLevel: 'advanced',
    cascadeRoles: ['representante_legal', 'contador_fiscal', 'oficial_aduana'],
    maxCertValidityDays: 365,
  },
};

// ═══════════════════════════════════════════════════════════════
// COMPLIANCE VAULT ENGINE
// ═══════════════════════════════════════════════════════════════

export class ComplianceVault {
  private static instance: ComplianceVault | null = null;
  private certificates: Map<string, DigitalCertificate> = new Map();
  private cascadeSignatures: Map<string, CascadeSignature> = new Map();
  private auditLog: CertificateAuditEntry[] = [];
  private _currentRegion: CertificateRegion = 'PA';

  private constructor() {}

  static getInstance(): ComplianceVault {
    if (!ComplianceVault.instance) {
      ComplianceVault.instance = new ComplianceVault();
    }
    return ComplianceVault.instance;
  }

  // ── Region ─────────────────────────────────────────────

  setRegion(region: CertificateRegion): void {
    this._currentRegion = region;
  }

  getRegionAuthority(): RegionalCertAuthority {
    return REGIONAL_CERT_AUTHORITIES[this._currentRegion];
  }

  // ── Certificate Management ─────────────────────────────

  registerCertificate(params: {
    holderId: string;
    holderRole: string;
    publicKey: string;
    signatureLevel?: SignatureLevel;
    region?: CertificateRegion;
  }): DigitalCertificate {
    const region = params.region || this._currentRegion;
    const authority = REGIONAL_CERT_AUTHORITIES[region];
    const id = `CERT-${region}-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date();
    const expires = new Date(now.getTime() + authority.maxCertValidityDays * 86400000);

    const cert: DigitalCertificate = {
      id,
      region,
      holderId: params.holderId,
      holderRole: params.holderRole,
      issuer: authority.authority,
      serialNumber: CryptoJS.SHA256(`${id}:${params.publicKey}:${now.toISOString()}`).toString().substring(0, 32).toUpperCase(),
      publicKeyHash: CryptoJS.SHA256(params.publicKey).toString(),
      signatureLevel: params.signatureLevel || authority.requiredLevel,
      status: 'active',
      issuedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      lastUsedAt: null,
      usageCount: 0,
      legalBasis: authority.legalBasis,
      metadata: {},
    };

    this.certificates.set(id, cert);
    this.logAudit({
      certificateId: id,
      action: 'create',
      performedBy: params.holderId,
      ipAddress: '0.0.0.0',
      success: true,
      details: `Certificate registered for ${params.holderRole} in ${region}. Level: ${cert.signatureLevel}. Expires: ${cert.expiresAt}.`,
    });

    return cert;
  }

  getCertificate(id: string): DigitalCertificate | null {
    return this.certificates.get(id) || null;
  }

  getActiveCertificates(region?: CertificateRegion): DigitalCertificate[] {
    const r = region || this._currentRegion;
    const now = new Date().toISOString();
    return Array.from(this.certificates.values()).filter(
      c => c.region === r && c.status === 'active' && c.expiresAt > now
    );
  }

  revokeCertificate(id: string, revokedBy: string, reason: string): boolean {
    const cert = this.certificates.get(id);
    if (!cert || cert.status === 'revoked') return false;

    cert.status = 'revoked';
    cert.metadata.revokedAt = new Date().toISOString();
    cert.metadata.revokedBy = revokedBy;
    cert.metadata.revocationReason = reason;

    this.logAudit({
      certificateId: id,
      action: 'revoke',
      performedBy: revokedBy,
      ipAddress: '0.0.0.0',
      success: true,
      details: `Certificate revoked. Reason: ${reason}`,
    });

    return true;
  }

  // ── Digital Signature ──────────────────────────────────

  signDocument(params: {
    certificateId: string;
    documentId: string;
    documentContent: string;
    ipAddress: string;
    deviceFingerprint: string;
  }): { signatureHash: string; valid: boolean; error?: string } {
    const cert = this.certificates.get(params.certificateId);
    if (!cert) return { signatureHash: '', valid: false, error: 'Certificate not found' };
    if (cert.status !== 'active') return { signatureHash: '', valid: false, error: `Certificate status: ${cert.status}` };
    if (new Date(cert.expiresAt) < new Date()) {
      cert.status = 'expired';
      return { signatureHash: '', valid: false, error: 'Certificate expired' };
    }

    const signaturePayload = `${params.documentId}|${params.documentContent}|${cert.publicKeyHash}|${new Date().toISOString()}`;
    const signatureHash = CryptoJS.SHA256(signaturePayload).toString();

    cert.lastUsedAt = new Date().toISOString();
    cert.usageCount++;

    this.logAudit({
      certificateId: params.certificateId,
      action: 'sign',
      performedBy: cert.holderId,
      documentId: params.documentId,
      ipAddress: params.ipAddress,
      success: true,
      details: `Document ${params.documentId} signed. Signature: ${signatureHash.substring(0, 16)}...`,
    });

    return { signatureHash, valid: true };
  }

  // ── Cascade Signatures ─────────────────────────────────

  initiateCascadeSignature(params: {
    documentId: string;
    documentContent: string;
    requiredSignerRoles: string[];
    region?: CertificateRegion;
  }): CascadeSignature {
    const region = params.region || this._currentRegion;
    const id = `CASCADE-${region}-${Date.now().toString(36).toUpperCase()}`;
    const documentHash = CryptoJS.SHA256(params.documentContent).toString();

    const cascade: CascadeSignature = {
      id,
      documentId: params.documentId,
      documentHash,
      signatures: [],
      status: 'pending',
      requiredSigners: params.requiredSignerRoles.length,
      completedSigners: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
      region,
    };

    this.cascadeSignatures.set(id, cascade);
    this.logAudit({
      certificateId: 'SYSTEM',
      action: 'cascade_init',
      performedBy: 'system',
      documentId: params.documentId,
      ipAddress: '0.0.0.0',
      success: true,
      details: `Cascade signature initiated. Required signers: ${params.requiredSignerRoles.join(', ')}. Region: ${region}.`,
    });

    return cascade;
  }

  addCascadeSignature(params: {
    cascadeId: string;
    certificateId: string;
    ipAddress: string;
    deviceFingerprint: string;
  }): { success: boolean; cascade: CascadeSignature | null; error?: string } {
    const cascade = this.cascadeSignatures.get(params.cascadeId);
    if (!cascade) return { success: false, cascade: null, error: 'Cascade not found' };
    if (cascade.status === 'complete') return { success: false, cascade, error: 'Cascade already complete' };

    const cert = this.certificates.get(params.certificateId);
    if (!cert) return { success: false, cascade, error: 'Certificate not found' };

    const alreadySigned = cascade.signatures.some(s => s.certificateId === params.certificateId);
    if (alreadySigned) return { success: false, cascade, error: 'Already signed with this certificate' };

    const signaturePayload = `${cascade.documentHash}|${cert.publicKeyHash}|${cascade.signatures.length}|${new Date().toISOString()}`;
    const signatureHash = CryptoJS.SHA256(signaturePayload).toString();

    const entry: SignatureEntry = {
      signerId: cert.holderId,
      signerRole: cert.holderRole,
      certificateId: params.certificateId,
      signatureHash,
      timestamp: new Date().toISOString(),
      ipAddress: params.ipAddress,
      deviceFingerprint: params.deviceFingerprint,
      level: cert.signatureLevel,
      status: 'valid',
    };

    cascade.signatures.push(entry);
    cascade.completedSigners++;
    cert.lastUsedAt = new Date().toISOString();
    cert.usageCount++;

    if (cascade.completedSigners >= cascade.requiredSigners) {
      cascade.status = 'complete';
      cascade.completedAt = new Date().toISOString();
    } else {
      cascade.status = 'partial';
    }

    this.logAudit({
      certificateId: params.certificateId,
      action: 'cascade_sign',
      performedBy: cert.holderId,
      documentId: cascade.documentId,
      ipAddress: params.ipAddress,
      success: true,
      details: `Cascade ${params.cascadeId}: ${cascade.completedSigners}/${cascade.requiredSigners} signatures. Status: ${cascade.status}.`,
    });

    return { success: true, cascade };
  }

  getCascadeStatus(cascadeId: string): CascadeSignature | null {
    return this.cascadeSignatures.get(cascadeId) || null;
  }

  // ── Audit ──────────────────────────────────────────────

  private logAudit(params: Omit<CertificateAuditEntry, 'id' | 'timestamp' | 'resultHash'>): void {
    const timestamp = new Date().toISOString();
    const resultHash = CryptoJS.SHA256(`${params.certificateId}|${params.action}|${timestamp}`).toString();

    this.auditLog.push({
      id: `AUDIT-${Date.now().toString(36).toUpperCase()}`,
      timestamp,
      resultHash,
      ...params,
    });

    if (this.auditLog.length > 5000) {
      this.auditLog = this.auditLog.slice(-4000);
    }
  }

  getAuditLog(filters?: {
    certificateId?: string;
    action?: CertificateAuditEntry['action'];
    limit?: number;
  }): CertificateAuditEntry[] {
    let logs = [...this.auditLog];

    if (filters?.certificateId) {
      logs = logs.filter(l => l.certificateId === filters.certificateId);
    }
    if (filters?.action) {
      logs = logs.filter(l => l.action === filters.action);
    }

    return logs.slice(-(filters?.limit || 100));
  }

  // ── Stats ──────────────────────────────────────────────

  getVaultStats(): {
    totalCertificates: number;
    activeCertificates: number;
    totalSignatures: number;
    cascadesInProgress: number;
    cascadesCompleted: number;
    auditEntries: number;
    byRegion: Record<CertificateRegion, number>;
  } {
    const certs = Array.from(this.certificates.values());
    const cascades = Array.from(this.cascadeSignatures.values());

    return {
      totalCertificates: certs.length,
      activeCertificates: certs.filter(c => c.status === 'active').length,
      totalSignatures: certs.reduce((s, c) => s + c.usageCount, 0),
      cascadesInProgress: cascades.filter(c => c.status === 'partial' || c.status === 'pending').length,
      cascadesCompleted: cascades.filter(c => c.status === 'complete').length,
      auditEntries: this.auditLog.length,
      byRegion: {
        PA: certs.filter(c => c.region === 'PA').length,
        CR: certs.filter(c => c.region === 'CR').length,
        GT: certs.filter(c => c.region === 'GT').length,
      },
    };
  }

  destroy(): void {
    ComplianceVault.instance = null;
  }
}

export const complianceVault = ComplianceVault.getInstance();
