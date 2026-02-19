/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  ZOD — The Integrity Engine                                   ║
 * ║  Validador Forense de Integridad Aduanera Regional            ║
 * ║  ZENITH Customs Intelligence Platform                         ║
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
import { PrecedentEngine } from './precedent-engine';

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

  // ── Precedent Validation Step ─────────────────────────────

  /**
   * Validates an HS code against the PrecedentEngine before emitting a blocking finding.
   * If a ruling supports the declared code, downgrades severity to 'info'.
   */
  async validateByPrecedent(
    declaredHsCode: string,
    productDescription: string,
    region?: ZodRegion
  ): Promise<ZodFinding[]> {
    const findings: ZodFinding[] = [];
    const config = REGIONAL_TAX_CONFIG[region || this._currentRegion];

    try {
      const precedentEngine = PrecedentEngine.getInstance();
      precedentEngine.setRegion(region || this._currentRegion);
      const validation = await precedentEngine.validateByPrecedent(declaredHsCode, productDescription, region);

      if (validation.found && validation.precedent) {
        const p = validation.precedent;
        if (p.hsCode === declaredHsCode) {
          findings.push(this.createFinding({
            rule: 'ZOD-PREC-001',
            severity: 'info',
            message: `Clasificación avalada por precedente: ${p.rulingId}`,
            detail: validation.legalCitation,
            field: 'hs_code',
            legalBasis: `Resolución Anticipada ${p.rulingId} — ${p.authority}`,
            region: config.code,
          }));
        } else {
          findings.push(this.createFinding({
            rule: 'ZOD-PREC-002',
            severity: 'warning',
            message: `Precedente sugiere partida ${p.hsCode} (declarado: ${declaredHsCode})`,
            detail: validation.legalCitation,
            field: 'hs_code',
            expected: p.hsCode,
            actual: declaredHsCode,
            legalBasis: `Resolución ${p.rulingId} — ${p.authority}. ${config.legalBasis.general}`,
            region: config.code,
          }));
        }
      } else {
        const griInfo = validation.griAnalysis
          ? ` Sustentación por ${validation.griAnalysis.appliedRule} (confianza: ${Math.round(validation.griAnalysis.confidence * 100)}%).`
          : '';
        findings.push(this.createFinding({
          rule: 'ZOD-PREC-003',
          severity: 'info',
          message: `Sin precedente registrado para ${declaredHsCode}`,
          detail: `No se encontró resolución anticipada en ${config.customsAuthority}.${griInfo}`,
          field: 'hs_code',
          legalBasis: config.legalBasis.general,
          region: config.code,
        }));
      }
    } catch {
      // Non-blocking: precedent search failure should not halt validation
      findings.push(this.createFinding({
        rule: 'ZOD-PREC-ERR',
        severity: 'info',
        message: 'Búsqueda de precedentes no disponible',
        detail: 'No se pudo consultar la base de precedentes. La validación continúa sin verificación de resoluciones anticipadas.',
        region: config.code,
      }));
    }

    return findings;
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

  // ── MarginGuardian — Revenue Leakage Detection ───────────

  /**
   * ZOD MarginGuardian: Validates profitability per shipment/expediente.
   * Emits ZOD-MARGIN-LOW if margin falls below threshold (default 15%).
   * Revenue Leakage = costs exceed acceptable ratio vs. revenue.
   */
  validateMargin(input: {
    ingresos: number;
    costos: number;
    expedienteId: string;
    umbralMinimo?: number;
  }): ZodFinding[] {
    const findings: ZodFinding[] = [];
    const config = this.getRegionConfig();
    const umbral = input.umbralMinimo ?? 15;

    if (input.ingresos <= 0) {
      findings.push(this.createFinding({
        rule: 'ZOD-MARGIN-ERR',
        severity: 'blocking',
        message: 'Ingresos nulos o negativos — imposible calcular margen',
        detail: `Expediente ${input.expedienteId}: ingresos declarados $${input.ingresos.toFixed(2)}. No se puede proceder sin ingresos positivos.`,
        field: 'ingresos',
        actual: input.ingresos,
        region: config.code,
      }));
      return findings;
    }

    const margen = ((input.ingresos - input.costos) / input.ingresos) * 100;
    const deficit = input.costos - (input.ingresos * (1 - umbral / 100));

    if (margen < 0) {
      findings.push(this.createFinding({
        rule: 'ZOD-MARGIN-NEG',
        severity: 'critical',
        message: `Margen negativo: ${margen.toFixed(1)}% — Pérdida operativa`,
        detail: `Expediente ${input.expedienteId}: Ingresos $${input.ingresos.toFixed(2)} vs Costos $${input.costos.toFixed(2)}. Pérdida neta: $${Math.abs(input.ingresos - input.costos).toFixed(2)}.`,
        field: 'margen',
        expected: umbral,
        actual: margen,
        legalBasis: `Política de rentabilidad mínima — ${config.name}`,
        region: config.code,
      }));
    } else if (margen < umbral) {
      findings.push(this.createFinding({
        rule: 'ZOD-MARGIN-LOW',
        severity: 'warning',
        message: `Margen bajo: ${margen.toFixed(1)}% (mínimo: ${umbral}%)`,
        detail: `Expediente ${input.expedienteId}: Ingresos $${input.ingresos.toFixed(2)}, Costos $${input.costos.toFixed(2)}, Margen $${(input.ingresos - input.costos).toFixed(2)} (${margen.toFixed(1)}%). Se requiere ajuste de $${deficit.toFixed(2)} para alcanzar rentabilidad mínima.`,
        field: 'margen',
        expected: umbral,
        actual: margen,
        legalBasis: `Resolución 222/2025 — Honorarios mínimos del corredor. ${config.name}`,
        region: config.code,
      }));
    } else {
      findings.push(this.createFinding({
        rule: 'ZOD-MARGIN-OK',
        severity: 'info',
        message: `Margen saludable: ${margen.toFixed(1)}%`,
        detail: `Expediente ${input.expedienteId}: Rentabilidad $${(input.ingresos - input.costos).toFixed(2)} (${margen.toFixed(1)}%) supera el umbral de ${umbral}%.`,
        field: 'margen',
        region: config.code,
      }));
    }

    return findings;
  }

  /**
   * Batch margin analysis across multiple expedientes.
   * Returns aggregate leakage metrics.
   */
  analyzeRevenueLeakage(expedientes: Array<{
    id: string;
    ingresos: number;
    costos: number;
  }>): {
    findings: ZodFinding[];
    totalIngresos: number;
    totalCostos: number;
    margenPromedio: number;
    expedientesEnRiesgo: number;
    fugaEstimada: number;
  } {
    const allFindings: ZodFinding[] = [];
    let totalIngresos = 0;
    let totalCostos = 0;
    let enRiesgo = 0;
    let fugaTotal = 0;

    for (const exp of expedientes) {
      totalIngresos += exp.ingresos;
      totalCostos += exp.costos;
      const findings = this.validateMargin({
        ingresos: exp.ingresos,
        costos: exp.costos,
        expedienteId: exp.id,
      });
      allFindings.push(...findings);

      const margen = exp.ingresos > 0 ? ((exp.ingresos - exp.costos) / exp.ingresos) * 100 : 0;
      if (margen < 15) {
        enRiesgo++;
        const minIngreso = exp.costos / 0.85;
        fugaTotal += Math.max(0, minIngreso - exp.ingresos);
      }
    }

    const margenPromedio = totalIngresos > 0
      ? ((totalIngresos - totalCostos) / totalIngresos) * 100
      : 0;

    return {
      findings: allFindings,
      totalIngresos,
      totalCostos,
      margenPromedio,
      expedientesEnRiesgo: enRiesgo,
      fugaEstimada: fugaTotal,
    };
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
