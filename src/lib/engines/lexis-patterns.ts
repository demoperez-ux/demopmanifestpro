/**
 * LEXIS — Extraction Patterns & Prompts (Regional)
 * Defines regex patterns for document identification and field extraction.
 * Supports PA, CR, GT document types including DUCA-F and DUCA-T.
 */

export interface DocumentPattern {
  regex: string;
  confidence: number;
  type: 'string' | 'number' | 'date';
  sqlColumn?: string;
}

export interface DocumentIdentifier {
  type: 'INVOICE' | 'BL' | 'CP' | 'MANIFEST' | 'PACKING_LIST' | 'DUCA_F' | 'DUCA_T' | 'DUA' | 'FEL';
  keywords: string[];
  weight: number;
  /** Regions where this document type is applicable */
  regions?: ('PA' | 'CR' | 'GT')[];
}

export const LEXIS_PATTERNS = {
  // ── Document Type Identification (Regional) ───────────────
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
    // ── Central American Regional Documents ──────────────────
    {
      type: 'DUCA_F' as const,
      keywords: [
        'DUCA-F', 'DUCA F', 'DECLARACION UNICA CENTROAMERICANA',
        'DECLARACIÓN ÚNICA CENTROAMERICANA', 'FORMULARIO ADUANERO',
        'FACTURA Y DECLARACION', 'SIECA', 'DUCA FORMATO F',
      ],
      weight: 12,
      regions: ['CR', 'GT'],
    },
    {
      type: 'DUCA_T' as const,
      keywords: [
        'DUCA-T', 'DUCA T', 'DUCA TRANSITO', 'DUCA TRÁNSITO',
        'TRANSITO ADUANERO', 'TRÁNSITO ADUANERO',
        'DECLARACION DE TRANSITO', 'DECLARACIÓN DE TRÁNSITO',
        'TRANSITO TERRESTRE', 'TRÁNSITO TERRESTRE',
      ],
      weight: 12,
      regions: ['CR', 'GT'],
    },
    {
      type: 'DUA' as const,
      keywords: [
        'DUA', 'DECLARACION UNICA ADUANERA', 'DECLARACIÓN ÚNICA ADUANERA',
        'DECLARACION DE IMPORTACION', 'FORMULARIO DUA',
      ],
      weight: 10,
      regions: ['PA'],
    },
    {
      type: 'FEL' as const,
      keywords: [
        'FEL', 'FACTURA ELECTRONICA EN LINEA', 'FACTURA ELECTRÓNICA EN LÍNEA',
        'DTE', 'DOCUMENTO TRIBUTARIO ELECTRONICO', 'SAT GUATEMALA',
      ],
      weight: 10,
      regions: ['GT'],
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
    // ── DUCA-F (Factura y Declaración Centroamericana) ──────
    DUCA_F: {
      declarationNumber: [
        { regex: '(?:NO\\.?\\s*DUCA|DUCA\\s*NO|NÚMERO\\s*DUCA)[.:\\s]*([A-Z0-9\\-/]{5,25})', confidence: 92, type: 'string', sqlColumn: 'referencia' },
      ],
      exporter: [
        { regex: '(?:EXPORTADOR|EXPORTER|REMITENTE)[:\\s]*([^\\n]{5,80})', confidence: 85, type: 'string', sqlColumn: 'shipper' },
      ],
      importer: [
        { regex: '(?:IMPORTADOR|CONSIGNATARIO|DESTINATARIO)[:\\s]*([^\\n]{5,80})', confidence: 85, type: 'string', sqlColumn: 'consignatario' },
      ],
      nit: [
        { regex: '(?:NIT|RTN|CÉDULA\\s*JURÍDICA)[.:\\s]*([\\d\\-Kk]{5,15})', confidence: 88, type: 'string', sqlColumn: 'consignatario_ruc' },
      ],
      aduanaDestino: [
        { regex: '(?:ADUANA\\s*(?:DE\\s*)?DESTINO|CUSTOMS\\s*OFFICE)[:\\s]*([^\\n]{3,50})', confidence: 82, type: 'string', sqlColumn: 'recinto_destino' },
      ],
      aduanaOrigen: [
        { regex: '(?:ADUANA\\s*(?:DE\\s*)?ORIGEN|ADUANA\\s*(?:DE\\s*)?PARTIDA)[:\\s]*([^\\n]{3,50})', confidence: 82, type: 'string' },
      ],
      regimen: [
        { regex: '(?:RÉGIMEN|REGIMEN|MODALIDAD)[:\\s]*([^\\n]{3,40})', confidence: 80, type: 'string' },
      ],
      pesoNeto: [
        { regex: '(?:PESO\\s*NETO|NET\\s*WEIGHT)[:\\s]*([\\d,.]+)\\s*(?:KG|KGS)?', confidence: 85, type: 'number' },
      ],
      pesoBruto: [
        { regex: '(?:PESO\\s*BRUTO|GROSS\\s*WEIGHT)[:\\s]*([\\d,.]+)\\s*(?:KG|KGS)?', confidence: 85, type: 'number' },
      ],
      fob: [
        { regex: '(?:FOB|VALOR\\s*FOB)[:\\s]*\\$?\\s*([\\d,]+\\.?\\d*)', confidence: 85, type: 'number', sqlColumn: 'valor_fob' },
      ],
      cif: [
        { regex: '(?:CIF|VALOR\\s*CIF|TOTAL\\s*CIF)[:\\s]*\\$?\\s*([\\d,]+\\.?\\d*)', confidence: 90, type: 'number', sqlColumn: 'valor_cif' },
      ],
      partida: [
        { regex: '(?:PARTIDA|INCISO|SAC|CÓDIGO\\s*ARANCELARIO)[.:\\s]*(\\d{4}[.\\s]?\\d{2}[.\\s]?\\d{2}[.\\s]?\\d{0,2})', confidence: 88, type: 'string' },
      ],
    },
    // ── DUCA-T (Tránsito Terrestre Centroamericano) ─────────
    DUCA_T: {
      declarationNumber: [
        { regex: '(?:NO\\.?\\s*DUCA|DUCA\\s*(?:T|TRÁNSITO)\\s*NO)[.:\\s]*([A-Z0-9\\-/]{5,25})', confidence: 92, type: 'string', sqlColumn: 'referencia' },
      ],
      transportista: [
        { regex: '(?:TRANSPORTISTA|CARRIER|PORTEADOR)[:\\s]*([^\\n]{5,80})', confidence: 85, type: 'string', sqlColumn: 'shipper' },
      ],
      conductor: [
        { regex: '(?:CONDUCTOR|DRIVER|PILOTO)[:\\s]*([^\\n]{5,60})', confidence: 80, type: 'string' },
      ],
      placaVehiculo: [
        { regex: '(?:PLACA|MATRÍCULA|PLATE)[:\\s]*([A-Z0-9\\-]{4,12})', confidence: 85, type: 'string' },
      ],
      aduanaPartida: [
        { regex: '(?:ADUANA\\s*(?:DE\\s*)?PARTIDA|ORIGIN\\s*CUSTOMS)[:\\s]*([^\\n]{3,50})', confidence: 82, type: 'string' },
      ],
      aduanaDestino: [
        { regex: '(?:ADUANA\\s*(?:DE\\s*)?DESTINO|DESTINATION\\s*CUSTOMS)[:\\s]*([^\\n]{3,50})', confidence: 82, type: 'string', sqlColumn: 'recinto_destino' },
      ],
      aduanasTransito: [
        { regex: '(?:ADUANAS?\\s*(?:DE\\s*)?TRÁNSITO|TRANSIT\\s*CUSTOMS)[:\\s]*([^\\n]{3,80})', confidence: 78, type: 'string' },
      ],
      rutaAutorizada: [
        { regex: '(?:RUTA|ROUTE|ITINERARIO)[:\\s]*([^\\n]{5,100})', confidence: 75, type: 'string' },
      ],
      precintos: [
        { regex: '(?:PRECINTO|SELLO|SEAL)[:\\s]*([A-Z0-9\\-]{3,20})', confidence: 85, type: 'string' },
      ],
      pesoBruto: [
        { regex: '(?:PESO\\s*BRUTO|GROSS\\s*WEIGHT)[:\\s]*([\\d,.]+)\\s*(?:KG|KGS)?', confidence: 85, type: 'number' },
      ],
      bultos: [
        { regex: '(?:BULTOS|PACKAGES|COLLI)[:\\s]*(\\d+)', confidence: 85, type: 'number' },
      ],
    },
    // ── FEL Guatemala ───────────────────────────────────────
    FEL: {
      autorizacion: [
        { regex: '(?:AUTORIZACIÓN|NÚMERO\\s*DE\\s*AUTORIZACIÓN|UUID)[.:\\s]*([A-F0-9\\-]{32,40})', confidence: 92, type: 'string' },
      ],
      serie: [
        { regex: '(?:SERIE)[.:\\s]*([A-Z0-9]{1,10})', confidence: 85, type: 'string' },
      ],
      numero: [
        { regex: '(?:NÚMERO\\s*DTE|DTE\\s*NO)[.:\\s]*(\\d{5,15})', confidence: 88, type: 'string', sqlColumn: 'referencia' },
      ],
      nitEmisor: [
        { regex: '(?:NIT\\s*(?:DEL\\s*)?EMISOR)[.:\\s]*([\\d\\-Kk]{5,15})', confidence: 90, type: 'string', sqlColumn: 'shipper' },
      ],
      nitReceptor: [
        { regex: '(?:NIT\\s*(?:DEL\\s*)?RECEPTOR)[.:\\s]*([\\d\\-Kk]{5,15})', confidence: 90, type: 'string', sqlColumn: 'consignatario_ruc' },
      ],
    },
  } as Record<string, Record<string, DocumentPattern[]>>,

  // ── AI Prompts for OCR Enhancement (Regional) ─────────────
  aiPrompts: {
    documentClassification: `You are LEXIS, an intelligent document classifier for customs operations in Central America (Panama, Costa Rica, Guatemala). 
Analyze the text and determine the document type: INVOICE, BL (Bill of Lading), CP (Air Waybill/Carta Porte), MANIFEST, PACKING_LIST, DUCA_F (Factura y Declaración Centroamericana), DUCA_T (Tránsito Terrestre), DUA (Declaración Única Aduanera), or FEL (Factura Electrónica Guatemala).
Return a JSON with: { type, confidence, reasoning, region }`,

    fieldExtraction: `You are LEXIS, an intelligent data extractor for international trade documents in Central America.
Extract the following fields from the document:
- Supplier/Shipper (name, address, country)
- Consignee/Buyer (name, RUC/NIT/Cédula Jurídica, address)
- Invoice/Declaration Number and Date
- Incoterm (EXW, FOB, CIF, etc.)
- Line Items (description, quantity, unit price, total, SAC/HTS code)
- FOB Value, Freight, Insurance, CIF Value
- Currency
- Country of Origin
- Transport details (MAWB/HAWB/BL number, vessel/flight, truck plate)
- For DUCA: Aduana de origen/destino, régimen, precintos
Return structured JSON. Flag any missing critical fields.`,

    cifValidation: `Verify the CIF calculation: CIF = FOB + Freight + Insurance.
Apply the regional theoretical insurance rate if insurance is missing:
- Panama: 1.5%
- Costa Rica: 1.75%
- Guatemala: 1.5%
Flag any mathematical discrepancies.`,
  },
} as const;
