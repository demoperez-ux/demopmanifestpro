/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  ZOD — The Integrity Engine                                   ║
 * ║  Validador Forense de Integridad Aduanera                     ║
 * ║  © IPL / Orion Freight System — ZENITH Platform               ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * ZOD es el guardián inmutable de la verdad documental.
 * Reglas de validación basadas en legislación aduanera de Panamá:
 *   - Decreto Ley 1 de 2008 (Ley General de Aduanas)
 *   - CAUCA IV / RECAUCA
 *   - Resoluciones ANA vigentes
 *
 * Principio: CIF = FOB + Flete + Seguro (inmutable)
 */

import CryptoJS from 'crypto-js';

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
}

export interface ZodValidationResult {
  documentId: string;
  timestamp: string;
  hash: string;
  previousHash: string | null;
  isValid: boolean;
  score: number; // 0-100
  findings: ZodFinding[];
  correctionsMade: number;
  blockingIssues: number;
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
// ZOD ENGINE (Immutable Rules)
// ═══════════════════════════════════════════════════════════════

export class ZodEngine {
  private static instance: ZodEngine | null = null;
  private findingCounter = 0;
  private lastHash: string | null = null;
  private validationHistory: ZodValidationResult[] = [];

  /** Theoretical insurance rate per ANA regulation when not declared */
  private static readonly INSURANCE_RATE = 0.015;
  /** System fee per ANA */
  private static readonly SYSTEM_FEE = 3.00;
  /** ITBMS standard rate */
  private static readonly ITBMS_RATE = 0.07;
  /** Tolerance for rounding differences (USD) */
  private static readonly TOLERANCE = 0.02;

  private constructor() {}

  static getInstance(): ZodEngine {
    if (!ZodEngine.instance) {
      ZodEngine.instance = new ZodEngine();
    }
    return ZodEngine.instance;
  }

  // ── CIF Validation (Core Rule) ───────────────────────────

  validateCIF(input: ZodCIFInput): ZodFinding[] {
    const findings: ZodFinding[] = [];
    let insurance = input.insurance;

    // Rule 1: If insurance is null/zero, apply theoretical 1.5%
    if (insurance === null || insurance === 0) {
      insurance = input.fob * ZodEngine.INSURANCE_RATE;
      findings.push(this.createFinding({
        rule: 'ZOD-CIF-001',
        severity: 'info',
        message: 'Seguro teórico aplicado (1.5% FOB)',
        detail: `Seguro no declarado. Se aplica seguro teórico de $${insurance.toFixed(2)} (1.5% sobre FOB $${input.fob.toFixed(2)}) conforme al Decreto Ley 1/2008 Art. 60.`,
        field: 'insurance',
        expected: insurance,
        actual: input.insurance ?? 0,
        legalBasis: 'Decreto Ley 1 de 2008, Art. 60 — Valor en Aduana',
        autoCorrection: { field: 'insurance', value: insurance },
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
        legalBasis: 'CAUCA IV Art. 45 — Determinación del Valor en Aduana',
        autoCorrection: { field: 'cif', value: calculatedCIF },
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
        legalBasis: 'Decreto Ley 1/2008 Art. 63 — Métodos de Valoración',
      }));
    }

    return findings;
  }

  // ── Tax Cascade Validation ───────────────────────────────

  validateTaxCascade(input: ZodDeclarationInput): ZodFinding[] {
    const findings: ZodFinding[] = [];

    const expectedDAI = input.cif * (input.daiPercent / 100);
    const expectedISC = (input.cif + expectedDAI) * (input.iscPercent / 100);
    const expectedITBMS = (input.cif + expectedDAI + expectedISC) * (input.itbmsPercent / 100);
    const expectedTotal = input.cif + expectedDAI + expectedISC + expectedITBMS + ZodEngine.SYSTEM_FEE;

    if (input.declaredDAI !== undefined) {
      const daiDiff = Math.abs(expectedDAI - input.declaredDAI);
      if (daiDiff > ZodEngine.TOLERANCE) {
        findings.push(this.createFinding({
          rule: 'ZOD-TAX-001',
          severity: 'critical',
          message: `DAI: Δ $${daiDiff.toFixed(2)}`,
          detail: `DAI declarado ($${input.declaredDAI.toFixed(2)}) ≠ esperado ($${expectedDAI.toFixed(2)})`,
          field: 'dai', expected: expectedDAI, actual: input.declaredDAI,
          legalBasis: 'Arancel Nacional de Importación de Panamá',
          autoCorrection: { field: 'dai', value: expectedDAI },
        }));
      }
    }

    if (input.declaredITBMS !== undefined) {
      const itbmsDiff = Math.abs(expectedITBMS - input.declaredITBMS);
      if (itbmsDiff > ZodEngine.TOLERANCE) {
        findings.push(this.createFinding({
          rule: 'ZOD-TAX-002',
          severity: 'critical',
          message: `ITBMS: Δ $${itbmsDiff.toFixed(2)}`,
          detail: `ITBMS declarado ($${input.declaredITBMS.toFixed(2)}) ≠ esperado ($${expectedITBMS.toFixed(2)}). Base: CIF + DAI + ISC.`,
          field: 'itbms', expected: expectedITBMS, actual: input.declaredITBMS,
          legalBasis: 'Código Fiscal de Panamá, Art. 1057-V (ITBMS 7%)',
          autoCorrection: { field: 'itbms', value: expectedITBMS },
        }));
      }
    }

    if (input.declaredTotal !== undefined) {
      const totalDiff = Math.abs(expectedTotal - input.declaredTotal);
      if (totalDiff > ZodEngine.TOLERANCE) {
        findings.push(this.createFinding({
          rule: 'ZOD-TAX-003',
          severity: 'warning',
          message: `Total liquidación: Δ $${totalDiff.toFixed(2)}`,
          detail: `Total declarado ($${input.declaredTotal.toFixed(2)}) ≠ esperado ($${expectedTotal.toFixed(2)}). Incluye Tasa de Sistema B/. ${ZodEngine.SYSTEM_FEE.toFixed(2)}.`,
          field: 'total', expected: expectedTotal, actual: input.declaredTotal,
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

  validate(documentId: string, data: Record<string, unknown>): ZodValidationResult {
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
