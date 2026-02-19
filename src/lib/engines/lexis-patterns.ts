/**
 * LEXIS — Extraction Patterns & Prompts
 * Defines regex patterns for document identification and field extraction.
 * This file replaces lexis-prompts.json with typed TypeScript patterns.
 */

export interface DocumentPattern {
  regex: string;
  confidence: number;
  type: 'string' | 'number' | 'date';
  sqlColumn?: string;
}

export interface DocumentIdentifier {
  type: 'INVOICE' | 'BL' | 'CP' | 'MANIFEST' | 'PACKING_LIST';
  keywords: string[];
  weight: number;
}

export const LEXIS_PATTERNS = {
  // ── Document Type Identification ──────────────────────────
  documentIdentifiers: [
    {
      type: 'INVOICE' as const,
      keywords: ['COMMERCIAL INVOICE', 'FACTURA COMERCIAL', 'INVOICE NO', 'INVOICE DATE', 'PROFORMA', 'INV-', 'BILL TO', 'SOLD TO'],
      weight: 10,
    },
    {
      type: 'BL' as const,
      keywords: ['BILL OF LADING', 'B/L', 'CONOCIMIENTO DE EMBARQUE', 'OCEAN BILL', 'SEA WAYBILL', 'MASTER B/L', 'HOUSE B/L'],
      weight: 10,
    },
    {
      type: 'CP' as const,
      keywords: ['AIR WAYBILL', 'AWB', 'AIRWAY BILL', 'CARTA PORTE', 'MAWB', 'HAWB', 'HOUSE AIR WAYBILL'],
      weight: 10,
    },
    {
      type: 'MANIFEST' as const,
      keywords: ['MANIFEST', 'MANIFIESTO', 'CARGO MANIFEST', 'FLIGHT MANIFEST', 'VESSEL MANIFEST', 'INWARD MANIFEST'],
      weight: 10,
    },
    {
      type: 'PACKING_LIST' as const,
      keywords: ['PACKING LIST', 'LISTA DE EMPAQUE', 'PACK LIST', 'P/L'],
      weight: 8,
    },
  ] as DocumentIdentifier[],

  // ── Field Extraction Patterns by Document Type ────────────
  fieldPatterns: {
    INVOICE: {
      supplier: [
        { regex: '(?:SHIPPER|EXPORTER|SELLER|FROM|REMITENTE)[:\\s]*([^\\n]{5,80})', confidence: 85, type: 'string', sqlColumn: 'shipper' },
        { regex: '(?:EXPORTED BY|VENDOR)[:\\s]*([^\\n]{5,80})', confidence: 75, type: 'string', sqlColumn: 'shipper' },
      ],
      client: [
        { regex: '(?:CONSIGNEE|BUYER|BILL TO|SOLD TO|CONSIGNATARIO|IMPORTADOR)[:\\s]*([^\\n]{5,80})', confidence: 85, type: 'string', sqlColumn: 'consignatario' },
        { regex: '(?:SHIP TO|DELIVER TO|DESTINATARIO)[:\\s]*([^\\n]{5,80})', confidence: 75, type: 'string', sqlColumn: 'consignatario' },
      ],
      invoiceNumber: [
        { regex: '(?:INVOICE\\s*(?:NO|NUM|NUMBER|#))[.:\\s]*([A-Z0-9\\-/]{3,30})', confidence: 90, type: 'string', sqlColumn: 'referencia' },
        { regex: '(?:FACTURA\\s*(?:NO|NUM|NÚMERO))[.:\\s]*([A-Z0-9\\-/]{3,30})', confidence: 85, type: 'string', sqlColumn: 'referencia' },
      ],
      invoiceDate: [
        { regex: '(?:INVOICE\\s*DATE|DATE|FECHA)[:\\s]*(\\d{1,2}[/\\-.]\\d{1,2}[/\\-.]\\d{2,4})', confidence: 85, type: 'date' },
        { regex: '(?:DATE)[:\\s]*(\\w+\\s+\\d{1,2},?\\s+\\d{4})', confidence: 80, type: 'date' },
      ],
      incoterm: [
        { regex: '(?:INCOTERM|TERMS|CONDICIÓN)[:\\s]*(EXW|FOB|FCA|CIF|CIP|CFR|CPT|DAP|DPU|DDP)', confidence: 95, type: 'string' },
      ],
      currency: [
        { regex: '(?:CURRENCY|MONEDA)[:\\s]*(USD|EUR|GBP|JPY|CNY|PAB)', confidence: 90, type: 'string', sqlColumn: 'moneda' },
      ],
      origin: [
        { regex: '(?:COUNTRY\\s*OF\\s*ORIGIN|ORIGIN|ORIGEN|PAÍS\\s*DE\\s*ORIGEN)[:\\s]*([A-Z]{2,3}|[A-Za-z\\s]{3,30})', confidence: 80, type: 'string', sqlColumn: 'origin_country' },
      ],
      fob: [
        { regex: '(?:FOB|TOTAL\\s*FOB)[:\\s]*\\$?\\s*([\\d,]+\\.?\\d*)', confidence: 85, type: 'number', sqlColumn: 'valor_fob' },
      ],
      freight: [
        { regex: '(?:FREIGHT|FLETE|FLETE\\s*INTERNACIONAL)[:\\s]*\\$?\\s*([\\d,]+\\.?\\d*)', confidence: 85, type: 'number', sqlColumn: 'valor_flete' },
      ],
      insurance: [
        { regex: '(?:INSURANCE|SEGURO)[:\\s]*\\$?\\s*([\\d,]+\\.?\\d*)', confidence: 85, type: 'number', sqlColumn: 'valor_seguro' },
      ],
      cif: [
        { regex: '(?:CIF|TOTAL\\s*CIF|VALOR\\s*CIF)[:\\s]*\\$?\\s*([\\d,]+\\.?\\d*)', confidence: 90, type: 'number', sqlColumn: 'valor_cif' },
      ],
      subtotal: [
        { regex: '(?:SUBTOTAL|SUB-?TOTAL)[:\\s]*\\$?\\s*([\\d,]+\\.?\\d*)', confidence: 85, type: 'number' },
        { regex: '(?:TOTAL)[:\\s]*\\$?\\s*([\\d,]+\\.?\\d*)', confidence: 70, type: 'number' },
      ],
    },
    BL: {
      supplier: [
        { regex: '(?:SHIPPER|EXPORTER)[:\\s]*([^\\n]{5,80})', confidence: 85, type: 'string', sqlColumn: 'shipper' },
      ],
      client: [
        { regex: '(?:CONSIGNEE)[:\\s]*([^\\n]{5,80})', confidence: 90, type: 'string', sqlColumn: 'consignatario' },
      ],
      invoiceNumber: [
        { regex: '(?:B/?L\\s*(?:NO|NUMBER))[.:\\s]*([A-Z0-9\\-/]{3,30})', confidence: 90, type: 'string', sqlColumn: 'referencia' },
      ],
      vessel: [
        { regex: '(?:VESSEL|BUQUE|OCEAN VESSEL)[:\\s]*([^\\n]{3,50})', confidence: 85, type: 'string', sqlColumn: 'buque_vuelo' },
      ],
      portOfLoading: [
        { regex: '(?:PORT\\s*OF\\s*LOADING|POL|PUERTO\\s*DE\\s*EMBARQUE)[:\\s]*([^\\n]{3,50})', confidence: 85, type: 'string' },
      ],
      portOfDischarge: [
        { regex: '(?:PORT\\s*OF\\s*DISCHARGE|POD|PUERTO\\s*DE\\s*DESTINO)[:\\s]*([^\\n]{3,50})', confidence: 85, type: 'string', sqlColumn: 'recinto_destino' },
      ],
    },
    CP: {
      supplier: [
        { regex: '(?:SHIPPER|REMITENTE)[:\\s]*([^\\n]{5,80})', confidence: 85, type: 'string', sqlColumn: 'shipper' },
      ],
      client: [
        { regex: '(?:CONSIGNEE|DESTINATARIO)[:\\s]*([^\\n]{5,80})', confidence: 90, type: 'string', sqlColumn: 'consignatario' },
      ],
      mawb: [
        { regex: '(?:MAWB|MASTER\\s*AWB|AWB\\s*(?:NO|NUMBER))[.:\\s]*(\\d{3}[\\-\\s]?\\d{8})', confidence: 95, type: 'string', sqlColumn: 'referencia' },
      ],
      hawb: [
        { regex: '(?:HAWB|HOUSE\\s*AWB)[.:\\s]*([A-Z0-9\\-]{5,20})', confidence: 90, type: 'string' },
      ],
    },
  } as Record<string, Record<string, DocumentPattern[]>>,

  // ── AI Prompts for OCR Enhancement ────────────────────────
  aiPrompts: {
    documentClassification: `You are LEXIS, an intelligent document classifier for customs operations in Panama. 
Analyze the text and determine the document type: INVOICE, BL (Bill of Lading), CP (Air Waybill/Carta Porte), MANIFEST, or PACKING_LIST.
Return a JSON with: { type, confidence, reasoning }`,

    fieldExtraction: `You are LEXIS, an intelligent data extractor for international trade documents.
Extract the following fields from the document:
- Supplier/Shipper (name, address, country)
- Consignee/Buyer (name, RUC/ID, address)
- Invoice Number and Date
- Incoterm (EXW, FOB, CIF, etc.)
- Line Items (description, quantity, unit price, total)
- FOB Value, Freight, Insurance, CIF Value
- Currency
- Country of Origin
- Transport details (MAWB/HAWB/BL number, vessel/flight)
Return structured JSON. Flag any missing critical fields.`,

    cifValidation: `Verify the CIF calculation: CIF = FOB + Freight + Insurance.
If insurance is missing, apply the 1.5% theoretical insurance per Panama customs regulation.
Flag any mathematical discrepancies.`,
  },
} as const;
