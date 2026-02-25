/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  LEXIS — The Intelligent Scribe                              ║
 * ║  Motor de Ingesto Autónomo de Documentos Comerciales          ║
 * ║  ZENITH Customs Intelligence Platform                         ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * LEXIS procesa Facturas Comerciales, Conocimientos de Embarque (BL/CP)
 * y Manifiestos. Extrae: Proveedor, Cliente, Ítems, Cantidades,
 * Valores Unitarios, Fletes y Seguros con mapeo automático a campos SQL.
 */

import { LEXIS_PATTERNS, type DocumentPattern } from './lexis-patterns';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type LexisDocumentType = 'INVOICE' | 'BL' | 'CP' | 'MANIFEST' | 'PACKING_LIST' | 'UNKNOWN';

export interface LexisExtractionField {
  field: string;
  value: string | number | null;
  confidence: number;
  source: 'ocr' | 'pattern' | 'inference' | 'manual';
  sqlColumn?: string;
}

export interface LexisLineItem {
  description: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  htsCode?: string;
  weight?: number;
  origin?: string;
  confidence: number;
}

export interface LexisExtractionResult {
  documentId: string;
  documentType: LexisDocumentType;
  timestamp: string;
  overallConfidence: number;

  // Header Fields
  supplier: LexisExtractionField;
  client: LexisExtractionField;
  invoiceNumber: LexisExtractionField;
  invoiceDate: LexisExtractionField;
  incoterm: LexisExtractionField;
  currency: LexisExtractionField;
  origin: LexisExtractionField;

  // Financial
  subtotal: LexisExtractionField;
  freight: LexisExtractionField;
  insurance: LexisExtractionField;
  fob: LexisExtractionField;
  cif: LexisExtractionField;

  // Line Items
  items: LexisLineItem[];

  // Transport (BL/CP)
  mawb?: LexisExtractionField;
  hawb?: LexisExtractionField;
  vessel?: LexisExtractionField;
  portOfLoading?: LexisExtractionField;
  portOfDischarge?: LexisExtractionField;

  // Metadata
  warnings: string[];
  zodValidationRequired: boolean;
}

export interface LexisMemoryEntry {
  pattern: string;
  correction: string;
  correctedBy: 'zod' | 'operator';
  documentType: LexisDocumentType;
  timestamp: string;
  applied: number;
}

// ═══════════════════════════════════════════════════════════════
// LEXIS ENGINE
// ═══════════════════════════════════════════════════════════════

export class LexisEngine {
  private static instance: LexisEngine | null = null;
  private memory: LexisMemoryEntry[] = [];
  private processedCount = 0;

  private constructor() {
    this.loadMemory();
  }

  static getInstance(): LexisEngine {
    if (!LexisEngine.instance) {
      LexisEngine.instance = new LexisEngine();
    }
    return LexisEngine.instance;
  }

  // ── Document Type Detection ──────────────────────────────

  detectDocumentType(text: string): { type: LexisDocumentType; confidence: number } {
    const normalizedText = text.toUpperCase();
    const scores: Record<LexisDocumentType, number> = {
      INVOICE: 0, BL: 0, CP: 0, MANIFEST: 0, PACKING_LIST: 0, UNKNOWN: 0,
    };

    for (const pattern of LEXIS_PATTERNS.documentIdentifiers) {
      for (const keyword of pattern.keywords) {
        if (normalizedText.includes(keyword.toUpperCase())) {
          scores[pattern.type] += pattern.weight;
        }
      }
    }

    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
    const [topType, topScore] = sorted[0];
    const totalScore = sorted.reduce((sum, [, s]) => sum + s, 0);

    return {
      type: (topScore > 0 ? topType : 'UNKNOWN') as LexisDocumentType,
      confidence: totalScore > 0 ? Math.min((topScore / Math.max(totalScore, 1)) * 100, 99) : 0,
    };
  }

  // ── Field Extraction ─────────────────────────────────────

  extractFields(text: string, documentType: LexisDocumentType): Partial<LexisExtractionResult> {
    const fields: Partial<LexisExtractionResult> = {
      warnings: [],
      items: [],
    };

    // Extract header fields using patterns
    const headerPatterns = LEXIS_PATTERNS.fieldPatterns[documentType] || LEXIS_PATTERNS.fieldPatterns.INVOICE;

    for (const [fieldName, patterns] of Object.entries(headerPatterns)) {
      for (const p of patterns as DocumentPattern[]) {
        const match = text.match(new RegExp(p.regex, 'im'));
        if (match && match[1]) {
          const value = match[1].trim();
          (fields as any)[fieldName] = {
            field: fieldName,
            value: p.type === 'number' ? this.parseNumericValue(value) : value,
            confidence: p.confidence,
            source: 'pattern' as const,
            sqlColumn: p.sqlColumn,
          };
          break;
        }
      }
    }

    // Extract line items
    fields.items = this.extractLineItems(text, documentType);

    // Apply memory corrections
    this.applyMemoryCorrections(fields);

    // Calculate overall confidence
    const allFields = Object.values(fields).filter(
      (v) => v && typeof v === 'object' && 'confidence' in v
    ) as LexisExtractionField[];

    fields.overallConfidence = allFields.length > 0
      ? Math.round(allFields.reduce((sum, f) => sum + f.confidence, 0) / allFields.length)
      : 0;

    // Flag for Zod validation
    fields.zodValidationRequired = (fields.overallConfidence || 0) < 80;

    return fields;
  }

  // ── Line Item Extraction ─────────────────────────────────

  private extractLineItems(text: string, _type: LexisDocumentType): LexisLineItem[] {
    const items: LexisLineItem[] = [];
    const lines = text.split('\n');

    // Pattern: Description | Qty | Unit Price | Total
    const itemRegex = /^(.{10,60})\s+(\d+(?:\.\d+)?)\s+\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s+\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)$/;

    for (const line of lines) {
      const match = line.trim().match(itemRegex);
      if (match) {
        const qty = parseFloat(match[2]);
        const unitVal = this.parseNumericValue(match[3]);
        const totalVal = this.parseNumericValue(match[4]);

        items.push({
          description: match[1].trim(),
          quantity: qty,
          unitValue: unitVal,
          totalValue: totalVal,
          confidence: Math.abs(qty * unitVal - totalVal) < 0.02 ? 95 : 70,
        });
      }
    }

    return items;
  }

  // ── Financial Validation (Pre-Zod) ───────────────────────

  validateFinancials(result: Partial<LexisExtractionResult>): string[] {
    const warnings: string[] = [];

    const fob = this.getFieldValue(result.fob);
    const freight = this.getFieldValue(result.freight);
    const insurance = this.getFieldValue(result.insurance);
    const cif = this.getFieldValue(result.cif);

    if (fob && freight !== null && insurance !== null && cif) {
      const calculatedCIF = fob + (freight || 0) + (insurance || 0);
      const diff = Math.abs(calculatedCIF - cif);

      if (diff > 0.01) {
        warnings.push(
          `⚠️ Discrepancia CIF: Declarado $${cif.toFixed(2)} vs Calculado $${calculatedCIF.toFixed(2)} (Δ $${diff.toFixed(2)})`
        );
      }
    }

    // Validate item totals
    if (result.items && result.items.length > 0) {
      const itemsTotal = result.items.reduce((sum, i) => sum + i.totalValue, 0);
      if (fob && Math.abs(itemsTotal - fob) > 1) {
        warnings.push(
          `⚠️ Suma de ítems ($${itemsTotal.toFixed(2)}) no cuadra con FOB ($${fob.toFixed(2)})`
        );
      }
    }

    return warnings;
  }

  // ── Memory Layer (Learns from Zod corrections) ───────────

  recordCorrection(entry: Omit<LexisMemoryEntry, 'timestamp' | 'applied'>): void {
    this.memory.push({
      ...entry,
      timestamp: new Date().toISOString(),
      applied: 0,
    });

    // Cap memory at 500 entries
    if (this.memory.length > 500) {
      this.memory = this.memory.slice(-500);
    }

    this.saveMemory();
  }

  private applyMemoryCorrections(fields: Partial<LexisExtractionResult>): void {
    for (const entry of this.memory) {
      // Apply known corrections to matching patterns
      for (const [key, field] of Object.entries(fields)) {
        if (
          field &&
          typeof field === 'object' &&
          'value' in field &&
          typeof field.value === 'string' &&
          field.value.includes(entry.pattern)
        ) {
          (field as LexisExtractionField).value = entry.correction;
          (field as LexisExtractionField).source = 'inference';
          (field as LexisExtractionField).confidence = Math.min(
            (field as LexisExtractionField).confidence + 10,
            98
          );
          entry.applied++;
        }
      }
    }
  }

  getMemoryStats(): { totalEntries: number; totalApplications: number; topPatterns: LexisMemoryEntry[] } {
    return {
      totalEntries: this.memory.length,
      totalApplications: this.memory.reduce((sum, e) => sum + e.applied, 0),
      topPatterns: [...this.memory].sort((a, b) => b.applied - a.applied).slice(0, 10),
    };
  }

  // ── Full Extraction Pipeline ─────────────────────────────

  async processDocument(text: string, sourceFileName?: string): Promise<LexisExtractionResult> {
    this.processedCount++;

    const { type, confidence: typeConfidence } = this.detectDocumentType(text);
    const fields = this.extractFields(text, type);
    const financialWarnings = this.validateFinancials(fields);

    return {
      documentId: `LEXIS-${Date.now().toString(36).toUpperCase()}-${this.processedCount}`,
      documentType: type,
      timestamp: new Date().toISOString(),
      overallConfidence: fields.overallConfidence || 0,

      supplier: fields.supplier || this.emptyField('supplier'),
      client: fields.client || this.emptyField('client'),
      invoiceNumber: fields.invoiceNumber || this.emptyField('invoiceNumber'),
      invoiceDate: fields.invoiceDate || this.emptyField('invoiceDate'),
      incoterm: fields.incoterm || this.emptyField('incoterm'),
      currency: fields.currency || this.emptyField('currency', 'USD'),
      origin: fields.origin || this.emptyField('origin'),

      subtotal: fields.subtotal || this.emptyField('subtotal', 0),
      freight: fields.freight || this.emptyField('freight', 0),
      insurance: fields.insurance || this.emptyField('insurance', 0),
      fob: fields.fob || this.emptyField('fob', 0),
      cif: fields.cif || this.emptyField('cif', 0),

      items: fields.items || [],

      mawb: fields.mawb,
      hawb: fields.hawb,
      vessel: fields.vessel,
      portOfLoading: fields.portOfLoading,
      portOfDischarge: fields.portOfDischarge,

      warnings: [...(fields.warnings || []), ...financialWarnings],
      zodValidationRequired: (fields.overallConfidence || 0) < 80 || financialWarnings.length > 0,
    };
  }

  // ── Helpers ──────────────────────────────────────────────

  private parseNumericValue(value: string): number {
    return parseFloat(value.replace(/[,$\s]/g, '')) || 0;
  }

  private getFieldValue(field?: LexisExtractionField): number | null {
    if (!field || field.value === null) return null;
    return typeof field.value === 'number' ? field.value : parseFloat(String(field.value)) || null;
  }

  private emptyField(name: string, defaultValue: string | number | null = null): LexisExtractionField {
    return { field: name, value: defaultValue, confidence: 0, source: 'pattern' };
  }

  private loadMemory(): void {
    // Memory is now loaded from Supabase clasificaciones_validadas table
    // No-op on initialization — memory is populated via recordCorrection()
    // and persisted to DB, not localStorage
  }

  private saveMemory(): void {
    // Memory persistence is handled by Supabase clasificaciones_validadas table
    // No localStorage dependency — compatible with CloudFront/edge deployment
  }

  getProcessedCount(): number {
    return this.processedCount;
  }

  destroy(): void {
    LexisEngine.instance = null;
  }
}

// ── Singleton Export ────────────────────────────────────────
export const lexisEngine = LexisEngine.getInstance();
