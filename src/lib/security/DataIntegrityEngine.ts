/**
 * Data Integrity Engine — Sanitización, Validación Matemática y HS Code Verification
 * 
 * Pilares:
 * 1. Sanitización de inputs (SQL Injection Prevention)
 * 2. Validación de coherencia matemática de liquidaciones
 * 3. Validación de HS Code (10 dígitos, existencia en arancel oficial)
 */

import { CacheAranceles } from '@/lib/aduanas/cacheAranceles';

// ─── Sanitización ───────────────────────────────────────

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE|UNION|TRUNCATE)\b)/gi,
  /(-{2}|\/\*|\*\/)/g,
  /(;|\bOR\b\s+\d+=\d+|\bAND\b\s+\d+=\d+)/gi,
  /(\bxp_\w+)/gi,
  /(\bsp_\w+)/gi,
  /(CHAR\(\d+\))/gi,
  /(\bCAST\s*\()/gi,
  /(\bCONVERT\s*\()/gi,
  /(\bDECLARE\b)/gi,
  /(\bWAITFOR\b)/gi,
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /javascript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /<\s*iframe/gi,
  /<\s*object/gi,
  /<\s*embed/gi,
  /<\s*form/gi,
];

export interface SanitizationResult {
  clean: string;
  hadThreats: boolean;
  threatsDetected: string[];
}

export interface LiquidationValidation {
  valid: boolean;
  errors: LiquidationError[];
  warnings: LiquidationWarning[];
}

export interface LiquidationError {
  code: string;
  field: string;
  message: string;
  expected?: number;
  actual?: number;
}

export interface LiquidationWarning {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface HSCodeValidation {
  valid: boolean;
  code: string;
  errors: string[];
  arancelMatch?: {
    descripcion: string;
    dai: number;
    itbms: number;
    isc: number;
  };
}

export interface ManifestTaxValidation {
  valid: boolean;
  hawbTotalTaxes: number;
  manifestTotalTaxes: number;
  difference: number;
  percentDiff: number;
  flagged: boolean;
}

export class DataIntegrityEngine {
  
  // ─── Input Sanitization ─────────────────────────────

  /**
   * Sanitiza un string eliminando patrones de SQL injection y XSS
   */
  static sanitizeInput(input: string): SanitizationResult {
    if (!input || typeof input !== 'string') {
      return { clean: '', hadThreats: false, threatsDetected: [] };
    }

    const threats: string[] = [];
    let clean = input.trim();

    // Detect SQL injection
    for (const pattern of SQL_INJECTION_PATTERNS) {
      const matches = clean.match(pattern);
      if (matches) {
        threats.push(`SQL_INJECTION: ${matches.join(', ')}`);
        clean = clean.replace(pattern, '');
      }
    }

    // Detect XSS
    for (const pattern of XSS_PATTERNS) {
      const matches = clean.match(pattern);
      if (matches) {
        threats.push(`XSS: ${matches.join(', ')}`);
        clean = clean.replace(pattern, '');
      }
    }

    // Remove null bytes
    if (clean.includes('\0')) {
      threats.push('NULL_BYTE_INJECTION');
      clean = clean.replace(/\0/g, '');
    }

    // Normalize whitespace
    clean = clean.replace(/\s+/g, ' ').trim();

    // Limit length (prevent buffer overflow attacks)
    if (clean.length > 10000) {
      threats.push('BUFFER_OVERFLOW_ATTEMPT');
      clean = clean.substring(0, 10000);
    }

    return {
      clean,
      hadThreats: threats.length > 0,
      threatsDetected: threats,
    };
  }

  /**
   * Sanitiza un objeto recursivamente
   */
  static sanitizeObject<T extends Record<string, unknown>>(obj: T): { clean: T; threats: string[] } {
    const allThreats: string[] = [];
    const clean = { ...obj } as Record<string, unknown>;

    for (const [key, value] of Object.entries(clean)) {
      if (typeof value === 'string') {
        const result = this.sanitizeInput(value);
        clean[key] = result.clean;
        if (result.hadThreats) {
          allThreats.push(...result.threatsDetected.map(t => `[${key}] ${t}`));
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nested = this.sanitizeObject(value as Record<string, unknown>);
        clean[key] = nested.clean;
        allThreats.push(...nested.threats);
      }
    }

    return { clean: clean as T, threats: allThreats };
  }

  // ─── Liquidation Math Validation ────────────────────

  /**
   * Valida coherencia matemática de una liquidación
   * Regla: IF (Sum(HAWBs.Taxes) != Manifest.TotalTaxes) THEN FLAG_ERROR
   */
  static validateLiquidationMath(params: {
    hawbs: Array<{
      trackingNumber: string;
      valorFOB: number;
      valorFlete: number;
      valorSeguro: number;
      valorCIF: number;
      dai: number;
      itbms: number;
      isc: number;
      totalImpuestos: number;
    }>;
    manifestTotals: {
      totalFOB: number;
      totalFlete: number;
      totalSeguro: number;
      totalCIF: number;
      totalDAI: number;
      totalITBMS: number;
      totalISC: number;
      totalImpuestos: number;
    };
  }): LiquidationValidation {
    const errors: LiquidationError[] = [];
    const warnings: LiquidationWarning[] = [];
    const TOLERANCE = 0.01; // 1 centavo de tolerancia por redondeo

    // Sum individual HAWBs
    const sumFOB = params.hawbs.reduce((s, h) => s + h.valorFOB, 0);
    const sumFlete = params.hawbs.reduce((s, h) => s + h.valorFlete, 0);
    const sumSeguro = params.hawbs.reduce((s, h) => s + h.valorSeguro, 0);
    const sumCIF = params.hawbs.reduce((s, h) => s + h.valorCIF, 0);
    const sumDAI = params.hawbs.reduce((s, h) => s + h.dai, 0);
    const sumITBMS = params.hawbs.reduce((s, h) => s + h.itbms, 0);
    const sumISC = params.hawbs.reduce((s, h) => s + h.isc, 0);
    const sumTotalTax = params.hawbs.reduce((s, h) => s + h.totalImpuestos, 0);

    // Validate CIF = FOB + Flete + Seguro for each HAWB
    for (const hawb of params.hawbs) {
      const expectedCIF = hawb.valorFOB + hawb.valorFlete + hawb.valorSeguro;
      if (Math.abs(hawb.valorCIF - expectedCIF) > TOLERANCE) {
        errors.push({
          code: 'CIF_MISMATCH',
          field: `hawb.${hawb.trackingNumber}.valorCIF`,
          message: `CIF no coincide: FOB(${hawb.valorFOB}) + Flete(${hawb.valorFlete}) + Seguro(${hawb.valorSeguro}) ≠ CIF(${hawb.valorCIF})`,
          expected: expectedCIF,
          actual: hawb.valorCIF,
        });
      }

      // Validate individual tax sum
      const expectedTax = hawb.dai + hawb.itbms + hawb.isc;
      if (Math.abs(hawb.totalImpuestos - expectedTax) > TOLERANCE) {
        errors.push({
          code: 'HAWB_TAX_SUM',
          field: `hawb.${hawb.trackingNumber}.totalImpuestos`,
          message: `Impuestos individuales no cuadran: DAI(${hawb.dai}) + ITBMS(${hawb.itbms}) + ISC(${hawb.isc}) ≠ Total(${hawb.totalImpuestos})`,
          expected: expectedTax,
          actual: hawb.totalImpuestos,
        });
      }

      // Negative values check
      if (hawb.valorFOB < 0 || hawb.valorCIF < 0 || hawb.totalImpuestos < 0) {
        errors.push({
          code: 'NEGATIVE_VALUE',
          field: `hawb.${hawb.trackingNumber}`,
          message: `Valores negativos detectados en guía ${hawb.trackingNumber}`,
        });
      }
    }

    // Sum(HAWBs) vs Manifest totals
    const checkField = (label: string, field: string, sum: number, manifest: number) => {
      const diff = Math.abs(sum - manifest);
      if (diff > TOLERANCE) {
        errors.push({
          code: 'MANIFEST_MISMATCH',
          field,
          message: `Sum(HAWBs.${label}) = ${sum.toFixed(2)} ≠ Manifest.${label} = ${manifest.toFixed(2)} (Δ${diff.toFixed(2)})`,
          expected: manifest,
          actual: sum,
        });
      }
    };

    checkField('FOB', 'manifestTotals.totalFOB', sumFOB, params.manifestTotals.totalFOB);
    checkField('Flete', 'manifestTotals.totalFlete', sumFlete, params.manifestTotals.totalFlete);
    checkField('Seguro', 'manifestTotals.totalSeguro', sumSeguro, params.manifestTotals.totalSeguro);
    checkField('CIF', 'manifestTotals.totalCIF', sumCIF, params.manifestTotals.totalCIF);
    checkField('DAI', 'manifestTotals.totalDAI', sumDAI, params.manifestTotals.totalDAI);
    checkField('ITBMS', 'manifestTotals.totalITBMS', sumITBMS, params.manifestTotals.totalITBMS);
    checkField('ISC', 'manifestTotals.totalISC', sumISC, params.manifestTotals.totalISC);
    checkField('TotalImpuestos', 'manifestTotals.totalImpuestos', sumTotalTax, params.manifestTotals.totalImpuestos);

    // Warnings for suspicious values
    for (const hawb of params.hawbs) {
      if (hawb.valorFOB > 0 && hawb.valorFOB < 1) {
        warnings.push({
          code: 'SUSPICIOUS_LOW_VALUE',
          message: `Guía ${hawb.trackingNumber}: valor FOB sospechosamente bajo ($${hawb.valorFOB})`,
          severity: 'high',
        });
      }
      if (hawb.valorCIF > 50000) {
        warnings.push({
          code: 'HIGH_VALUE_SHIPMENT',
          message: `Guía ${hawb.trackingNumber}: valor CIF alto ($${hawb.valorCIF.toFixed(2)}) — requiere revisión`,
          severity: 'medium',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Valida que Sum(HAWBs.Taxes) == Manifest.TotalTaxes
   */
  static validateManifestTaxCoherence(
    hawbTaxes: number[],
    manifestTotalTaxes: number
  ): ManifestTaxValidation {
    const hawbTotal = hawbTaxes.reduce((sum, t) => sum + t, 0);
    const difference = Math.abs(hawbTotal - manifestTotalTaxes);
    const percentDiff = manifestTotalTaxes > 0 ? (difference / manifestTotalTaxes) * 100 : 0;

    return {
      valid: difference <= 0.01,
      hawbTotalTaxes: hawbTotal,
      manifestTotalTaxes,
      difference,
      percentDiff,
      flagged: difference > 0.01,
    };
  }

  // ─── HS Code Validation ─────────────────────────────

  /**
   * Valida un código HS (Partida Arancelaria)
   * - Verifica formato (10 dígitos)
   * - Verifica existencia en arancel oficial de Panamá
   */
  static validateHSCode(code: string): HSCodeValidation {
    const errors: string[] = [];
    const cleanCode = code.replace(/[\s.-]/g, '');

    // Check format: must be numeric
    if (!/^\d+$/.test(cleanCode)) {
      errors.push('El código HS debe contener solo dígitos');
    }

    // Check length: must be 10 digits for full classification
    if (cleanCode.length < 4) {
      errors.push('El código HS debe tener al menos 4 dígitos (capítulo + partida)');
    }
    if (cleanCode.length > 10) {
      errors.push('El código HS no puede exceder 10 dígitos');
    }
    if (cleanCode.length !== 10 && cleanCode.length >= 4) {
      errors.push(`El código HS debe tener exactamente 10 dígitos para clasificación completa (tiene ${cleanCode.length})`);
    }

    // Validate chapter (first 2 digits: 01-99)
    const chapter = parseInt(cleanCode.substring(0, 2), 10);
    if (chapter < 1 || chapter > 99) {
      errors.push(`Capítulo inválido: ${chapter}. Debe estar entre 01 y 99`);
    }

    // Check against Panama's official tariff database
    let arancelMatch: HSCodeValidation['arancelMatch'];
    
    // Try exact match with various code lengths
    const searchCodes = [
      cleanCode,
      cleanCode.substring(0, 8),
      cleanCode.substring(0, 6),
      `${cleanCode.substring(0, 4)}.${cleanCode.substring(4, 6)}`,
      `${cleanCode.substring(0, 4)}.${cleanCode.substring(4, 6)}.${cleanCode.substring(6, 8)}`,
    ];

    for (const searchCode of searchCodes) {
      const arancel = CacheAranceles.buscarPorCodigo(searchCode);
      if (arancel) {
        arancelMatch = {
          descripcion: arancel.descripcion,
          dai: arancel.daiPercent,
          itbms: arancel.itbmsPercent,
          isc: arancel.iscPercent || 0,
        };
        break;
      }
    }

    if (!arancelMatch && errors.length === 0) {
      errors.push('Código HS no encontrado en el Arancel Nacional de Panamá 2026');
    }

    return {
      valid: errors.length === 0,
      code: cleanCode,
      errors,
      arancelMatch,
    };
  }

  /**
   * Valida un lote de códigos HS
   */
  static validateHSCodeBatch(codes: string[]): { results: HSCodeValidation[]; allValid: boolean } {
    const results = codes.map(code => this.validateHSCode(code));
    return {
      results,
      allValid: results.every(r => r.valid),
    };
  }

  // ─── Device Fingerprint ────────────────────────────

  /**
   * Genera un fingerprint básico del dispositivo (no invasivo)
   */
  static generateDeviceFingerprint(): string {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.hardwareConcurrency || 'unknown',
    ];

    // Simple hash
    const str = components.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).padStart(8, '0');
  }
}
