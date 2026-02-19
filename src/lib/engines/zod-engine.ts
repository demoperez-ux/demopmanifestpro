/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  ZOD — The Integrity Engine                                   ║
 * ║  Validador Forense de Integridad Aduanera Regional            ║
 * ║  © IPL / Orion Freight System — ZENITH Platform               ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * ZOD es el guardián inmutable de la verdad documental.
 * Soporta validación fiscal para tres jurisdicciones:
 *   - PA: Panamá — ITBMS 7%, Decreto Ley 1/2008, CAUCA IV
 *   - CR: Costa Rica — IVA 13%, Ley General de Aduanas 7557
 *   - GT: Guatemala — IVA 12%, Ley Aduanera Nacional (SAT)
 *
 * Principio: CIF = FOB + Flete + Seguro (inmutable, universal)
 */

import CryptoJS from 'crypto-js';

// ═══════════════════════════════════════════════════════════════
// REGIONAL CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export type ZodRegion = 'PA' | 'CR' | 'GT';

export interface RegionalTaxConfig {
  code: ZodRegion;
  name: string;
  vatRate: number;
  vatName: string;
  insuranceRate: number;
  systemFee: number;
  legalBasis: {
    cif: string;
    vat: string;
    valuation: string;
    general: string;
  };
  fiscalIdPatterns: { name: string; regex: RegExp; example: string }[];
  customsAuthority: string;
}

export const REGIONAL_TAX_CONFIG: Record<ZodRegion, RegionalTaxConfig> = {
  PA: {
    code: 'PA',
    name: 'Panamá',
    vatRate: 0.07,
    vatName: 'ITBMS',
    insuranceRate: 0.015,
    systemFee: 3.00,
    legalBasis: {
      cif: 'Decreto Ley 1 de 2008, Art. 60 — Valor en Aduana',
      vat: 'Código Fiscal de Panamá, Art. 1057-V (ITBMS 7%)',
      valuation: 'CAUCA IV Art. 45 — Determinación del Valor en Aduana',
      general: 'Decreto Ley 1 de 2008 — Ley General de Aduanas',
    },
    fiscalIdPatterns: [
      { name: 'Cédula', regex: /^\d{1,2}-\d{1,4}-\d{1,6}$/, example: '8-814-52' },
      { name: 'RUC (Persona Jurídica)', regex: /^\d{1,7}-\d{1,4}-\d{1,6}(?: DV\d{2})?$/, example: '155608832-2-2015' },
      { name: 'Pasaporte', regex: /^[A-Z]{1,2}\d{6,9}$/, example: 'PE123456' },
    ],
    customsAuthority: 'ANA (Autoridad Nacional de Aduanas)',
  },
  CR: {
    code: 'CR',
    name: 'Costa Rica',
    vatRate: 0.13,
    vatName: 'IVA',
    insuranceRate: 0.0175,
    systemFee: 2.50,
    legalBasis: {
      cif: 'Ley General de Aduanas 7557, Art. 252 — Valor en Aduana',
      vat: 'Ley del Impuesto al Valor Agregado 9635, Art. 2 (IVA 13%)',
      valuation: 'CAUCA IV Art. 45 — Determinación del Valor en Aduana',
      general: 'Ley General de Aduanas 7557 y Reglamento RECAUCA',
    },
    fiscalIdPatterns: [
      { name: 'Cédula Física', regex: /^\d{1}-\d{4}-\d{4}$/, example: '1-0234-0567' },
      { name: 'Cédula Jurídica', regex: /^3-\d{3}-\d{6}$/, example: '3-101-123456' },
      { name: 'DIMEX', regex: /^\d{11,12}$/, example: '15560883212' },
    ],
    customsAuthority: 'DGA (Dirección General de Aduanas — Ministerio de Hacienda)',
  },
  GT: {
    code: 'GT',
    name: 'Guatemala',
    vatRate: 0.12,
    vatName: 'IVA',
    insuranceRate: 0.015,
    systemFee: 0,
    legalBasis: {
      cif: 'CAUCA IV Art. 45 — Determinación del Valor en Aduana',
      vat: 'Ley del IVA, Decreto 27-92, Art. 10 (IVA 12%)',
      valuation: 'Reglamento del CAUCA (RECAUCA) Art. 323',
      general: 'Ley Aduanera Nacional y Código Aduanero Uniforme Centroamericano',
    },
    fiscalIdPatterns: [
      { name: 'NIT', regex: /^\d{6,9}-?[0-9Kk]$/, example: '1234567-K' },
      { name: 'CUI/DPI', regex: /^\d{4}\s?\d{5}\s?\d{4}$/, example: '1234 56789 0101' },
    ],
    customsAuthority: 'SAT (Superintendencia de Administración Tributaria)',
  },
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ZodSeverity = 'info' | 'warning' | 'critical' | 'blocking';

export interface ZodFinding {
  id: string;
  rule: string;
  severity: ZodSeverity;
  message: string;
  detail: string;
  field?: string;
  expected?: string | number;
  actual?: string | number;
  legalBasis?: string;
  autoCorrection?: { field: string; value: string | number };
  region?: ZodRegion;
}

export interface ZodValidationResult {
  documentId: string;
  timestamp: string;
  hash: string;
  previousHash: string | null;
  isValid: boolean;
  score: number;
  findings: ZodFinding[];
  correctionsMade: number;
  blockingIssues: number;
  region: ZodRegion;
}

export interface ZodCIFInput {
  fob: number;
  freight: number;
  insurance: number | null;
  declaredCIF: number;
  currency: string;
  incoterm?: string;
}

export interface ZodDeclarationInput {
  cif: number;
  daiPercent: number;
  iscPercent: number;
  itbmsPercent: number;
  declaredDAI?: number;
  declaredISC?: number;
  declaredITBMS?: number;
  declaredTotal?: number;
}

// ═══════════════════════════════════════════════════════════════
// ZOD ENGINE (Immutable Rules — Regional)
// ═══════════════════════════════════════════════════════════════

export class ZodEngine {
  private static instance: ZodEngine | null = null;
  private findingCounter = 0;
  private lastHash: string | null = null;
  private validationHistory: ZodValidationResult[] = [];
  private _currentRegion: ZodRegion = 'PA';

  /** Tolerance for rounding differences (USD) */
  private static readonly TOLERANCE = 0.02;

  private constructor() {}

  static getInstance(): ZodEngine {
    if (!ZodEngine.instance) {
      ZodEngine.instance = new ZodEngine();
    }
    return ZodEngine.instance;
  }

  // ── Region Management ───────────────────────────────────

  get currentRegion(): ZodRegion {
    return this._currentRegion;
  }

  setRegion(region: ZodRegion): void {
    this._currentRegion = region;
  }

  getRegionConfig(): RegionalTaxConfig {
    return REGIONAL_TAX_CONFIG[this._currentRegion];
  }

  // ── Fiscal ID Validation (Regional) ─────────────────────

  validateFiscalId(id: string, region?: ZodRegion): ZodFinding[] {
    const findings: ZodFinding[] = [];
    const config = REGIONAL_TAX_CONFIG[region || this._currentRegion];
    const trimmedId = id.trim();

    if (!trimmedId) {
      findings.push(this.createFinding({
        rule: 'ZOD-FISCAL-001',
        severity: 'blocking',
        message: `ID fiscal vacío — ${config.customsAuthority}`,
        detail: `Se requiere un identificador fiscal válido para operar en ${config.name}.`,
        field: 'fiscal_id',
        legalBasis: config.legalBasis.general,
        region: config.code,
      }));
      return findings;
    }

    const matched = config.fiscalIdPatterns.some(p => p.regex.test(trimmedId));
    if (!matched) {
      const examples = config.fiscalIdPatterns.map(p => `${p.name}: ${p.example}`).join(', ');
      findings.push(this.createFinding({
        rule: 'ZOD-FISCAL-002',
        severity: 'critical',
        message: `ID fiscal inválido para ${config.name}`,
        detail: `"${trimmedId}" no coincide con los formatos aceptados en ${config.name}: ${examples}.`,
        field: 'fiscal_id',
        actual: trimmedId,
        legalBasis: config.legalBasis.general,
        region: config.code,
      }));
    }

    return findings;
  }

  // ── CIF Validation (Core Rule — Universal) ──────────────

  validateCIF(input: ZodCIFInput): ZodFinding[] {
    const findings: ZodFinding[] = [];
    const config = this.getRegionConfig();
    let insurance = input.insurance;

    // Rule 1: If insurance is null/zero, apply theoretical rate
    if (insurance === null || insurance === 0) {
      insurance = input.fob * config.insuranceRate;
      findings.push(this.createFinding({
        rule: 'ZOD-CIF-001',
        severity: 'info',
        message: `Seguro teórico aplicado (${(config.insuranceRate * 100).toFixed(1)}% FOB)`,
        detail: `Seguro no declarado. Se aplica seguro teórico de $${insurance.toFixed(2)} (${(config.insuranceRate * 100).toFixed(1)}% sobre FOB $${input.fob.toFixed(2)}) conforme a ${config.legalBasis.cif}.`,
        field: 'insurance',
        expected: insurance,
        actual: input.insurance ?? 0,
        legalBasis: config.legalBasis.cif,
        autoCorrection: { field: 'insurance', value: insurance },
        region: config.code,
      }));
    }

    // Rule 2: CIF = FOB + Freight + Insurance (IMMUTABLE)
    const calculatedCIF = input.fob + input.freight + insurance;
    const diff = Math.abs(calculatedCIF - input.declaredCIF);

    if (diff > ZodEngine.TOLERANCE) {
      findings.push(this.createFinding({
        rule: 'ZOD-CIF-002',
        severity: 'critical',
        message: `Discrepancia CIF: Δ $${diff.toFixed(2)}`,
        detail: `CIF declarado ($${input.declaredCIF.toFixed(2)}) ≠ FOB ($${input.fob.toFixed(2)}) + Flete ($${input.freight.toFixed(2)}) + Seguro ($${insurance.toFixed(2)}) = $${calculatedCIF.toFixed(2)}`,
        field: 'cif',
        expected: calculatedCIF,
        actual: input.declaredCIF,
        legalBasis: config.legalBasis.valuation,
        autoCorrection: { field: 'cif', value: calculatedCIF },
        region: config.code,
      }));
    }

    // Rule 3: Negative values check
    if (input.fob < 0 || input.freight < 0 || (insurance && insurance < 0)) {
      findings.push(this.createFinding({
        rule: 'ZOD-CIF-003',
        severity: 'blocking',
        message: 'Valores negativos detectados en componentes CIF',
        detail: 'FOB, Flete y Seguro deben ser valores positivos. Documento bloqueado.',
        legalBasis: 'RECAUCA Art. 323 — Declaración de Valor',
        region: config.code,
      }));
    }

    // Rule 4: Subvaluation alert
    if (input.fob > 0 && input.fob < 1) {
      findings.push(this.createFinding({
        rule: 'ZOD-CIF-004',
        severity: 'warning',
        message: 'Posible subvaluación detectada',
        detail: `FOB declarado ($${input.fob.toFixed(2)}) es sospechosamente bajo. Requiere verificación manual.`,
        field: 'fob',
        legalBasis: config.legalBasis.valuation,
        region: config.code,
      }));
    }

    return findings;
  }

  // ── Tax Cascade Validation (Regional) ───────────────────

  validateTaxCascade(input: ZodDeclarationInput): ZodFinding[] {
    const findings: ZodFinding[] = [];
    const config = this.getRegionConfig();

    const expectedDAI = input.cif * (input.daiPercent / 100);
    const expectedISC = (input.cif + expectedDAI) * (input.iscPercent / 100);
    const expectedVAT = (input.cif + expectedDAI + expectedISC) * config.vatRate;
    const expectedTotal = input.cif + expectedDAI + expectedISC + expectedVAT + config.systemFee;

    if (input.declaredDAI !== undefined) {
      const daiDiff = Math.abs(expectedDAI - input.declaredDAI);
      if (daiDiff > ZodEngine.TOLERANCE) {
        findings.push(this.createFinding({
          rule: 'ZOD-TAX-001',
          severity: 'critical',
          message: `DAI: Δ $${daiDiff.toFixed(2)}`,
          detail: `DAI declarado ($${input.declaredDAI.toFixed(2)}) ≠ esperado ($${expectedDAI.toFixed(2)})`,
          field: 'dai', expected: expectedDAI, actual: input.declaredDAI,
          legalBasis: `Arancel Nacional de Importación — ${config.name}`,
          autoCorrection: { field: 'dai', value: expectedDAI },
          region: config.code,
        }));
      }
    }

    if (input.declaredITBMS !== undefined) {
      const vatDiff = Math.abs(expectedVAT - input.declaredITBMS);
      if (vatDiff > ZodEngine.TOLERANCE) {
        findings.push(this.createFinding({
          rule: 'ZOD-TAX-002',
          severity: 'critical',
          message: `${config.vatName}: Δ $${vatDiff.toFixed(2)}`,
          detail: `${config.vatName} declarado ($${input.declaredITBMS.toFixed(2)}) ≠ esperado ($${expectedVAT.toFixed(2)}). Base: CIF + DAI + ISC. Tasa: ${(config.vatRate * 100).toFixed(0)}%.`,
          field: 'itbms', expected: expectedVAT, actual: input.declaredITBMS,
          legalBasis: config.legalBasis.vat,
          autoCorrection: { field: 'itbms', value: expectedVAT },
          region: config.code,
        }));
      }
    }

    if (input.declaredTotal !== undefined) {
      const totalDiff = Math.abs(expectedTotal - input.declaredTotal);
      if (totalDiff > ZodEngine.TOLERANCE) {
        const feeNote = config.systemFee > 0 ? ` Incluye Tasa de Sistema $${config.systemFee.toFixed(2)}.` : '';
        findings.push(this.createFinding({
          rule: 'ZOD-TAX-003',
          severity: 'warning',
          message: `Total liquidación: Δ $${totalDiff.toFixed(2)}`,
          detail: `Total declarado ($${input.declaredTotal.toFixed(2)}) ≠ esperado ($${expectedTotal.toFixed(2)}).${feeNote}`,
          field: 'total', expected: expectedTotal, actual: input.declaredTotal,
          region: config.code,
        }));
      }
    }

    return findings;
  }

  // ── Document Integrity Hash ──────────────────────────────

  generateIntegrityHash(data: Record<string, unknown>): string {
    const canonical = JSON.stringify(data, Object.keys(data).sort());
    return CryptoJS.SHA256(canonical).toString();
  }

  // ── Full Validation Pipeline ─────────────────────────────

  validate(documentId: string, data: Record<string, unknown>, region?: ZodRegion): ZodValidationResult {
    if (region) this.setRegion(region);

    const hash = this.generateIntegrityHash(data);
    const allFindings: ZodFinding[] = [];

    // Run CIF validation if applicable
    if ('fob' in data && 'freight' in data && 'declaredCIF' in data) {
      allFindings.push(...this.validateCIF({
        fob: data.fob as number,
        freight: data.freight as number,
        insurance: (data.insurance as number) ?? null,
        declaredCIF: data.declaredCIF as number,
        currency: (data.currency as string) || 'USD',
        incoterm: data.incoterm as string,
      }));
    }

    // Run tax cascade if applicable
    if ('cif' in data && 'daiPercent' in data) {
      allFindings.push(...this.validateTaxCascade(data as unknown as ZodDeclarationInput));
    }

    // Run fiscal ID validation if applicable
    if ('fiscalId' in data && typeof data.fiscalId === 'string') {
      allFindings.push(...this.validateFiscalId(data.fiscalId as string));
    }

    const blockingIssues = allFindings.filter(f => f.severity === 'blocking').length;
    const correctionsMade = allFindings.filter(f => f.autoCorrection).length;
    const score = this.calculateScore(allFindings);

    const result: ZodValidationResult = {
      documentId,
      timestamp: new Date().toISOString(),
      hash,
      previousHash: this.lastHash,
      isValid: blockingIssues === 0,
      score,
      findings: allFindings,
      correctionsMade,
      blockingIssues,
      region: this._currentRegion,
    };

    this.lastHash = hash;
    this.validationHistory.push(result);
    if (this.validationHistory.length > 200) this.validationHistory.shift();

    return result;
  }

  // ── Score Calculation ────────────────────────────────────

  private calculateScore(findings: ZodFinding[]): number {
    let score = 100;
    for (const f of findings) {
      switch (f.severity) {
        case 'blocking': score -= 50; break;
        case 'critical': score -= 20; break;
        case 'warning': score -= 5; break;
        case 'info': score -= 1; break;
      }
    }
    return Math.max(0, score);
  }

  // ── Queries ──────────────────────────────────────────────

  getHistory(): ZodValidationResult[] {
    return [...this.validationHistory];
  }

  getStats(): { totalValidations: number; avgScore: number; blockingRate: number } {
    const total = this.validationHistory.length;
    if (total === 0) return { totalValidations: 0, avgScore: 100, blockingRate: 0 };
    const avgScore = this.validationHistory.reduce((s, v) => s + v.score, 0) / total;
    const blocking = this.validationHistory.filter(v => v.blockingIssues > 0).length;
    return { totalValidations: total, avgScore: Math.round(avgScore), blockingRate: (blocking / total) * 100 };
  }

  // ── Internals ────────────────────────────────────────────

  private createFinding(data: Omit<ZodFinding, 'id'>): ZodFinding {
    return { id: `ZOD-${++this.findingCounter}`, ...data };
  }

  destroy(): void {
    ZodEngine.instance = null;
  }
}

// ── Singleton Export ────────────────────────────────────────
export const zodEngine = ZodEngine.getInstance();
