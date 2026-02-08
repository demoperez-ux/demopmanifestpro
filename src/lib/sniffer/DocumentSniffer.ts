/**
 * DOCUMENT SNIFFER — ZENITH
 * 
 * Motor de detección de documentos con OCR ligero por keywords.
 * Identifica tipo de documento, extrae metadatos clave, y marca
 * documentos externos (no provenientes de Orión).
 */

// ─── Tipos ──────────────────────────────────────────────────────

export type TipoDocumentoSniffer =
  | 'factura_comercial'
  | 'bill_of_lading'
  | 'certificado_origen'
  | 'packing_list'
  | 'permiso_minsa'
  | 'permiso_mida'
  | 'permiso_aupsa'
  | 'certificado_fitosanitario'
  | 'poliza_seguro'
  | 'desconocido';

export type OrigenDocumento = 'ORION' | 'EXTERNO';

export type SemaforoEstado = 'rojo' | 'amarillo' | 'verde';

export interface MetadatosExtraidos {
  numeroDocumento?: string;
  fecha?: string;
  importador?: string;
  exportador?: string;
  paisOrigen?: string;
  hsCodePreliminar?: string;
  valorDeclarado?: number;
  pesoDeclarado?: number;
  moneda?: string;
}

export interface ResultadoSniffer {
  id: string;
  archivo: string;
  tipoDetectado: TipoDocumentoSniffer;
  confianza: number;
  metadatos: MetadatosExtraidos;
  origen: OrigenDocumento;
  fechaAnalisis: string;
  keywords: string[];
}

export interface ExpedienteExterno {
  id: string;
  referencia: string;
  importador: string;
  exportador: string;
  documentos: ResultadoSniffer[];
  semaforo: SemaforoEstado;
  documentosFaltantes: string[];
  permisosFaltantes: string[];
  listoParaZod: boolean;
  fechaCreacion: string;
  hsCodePreliminar?: string;
  consistenciaCruzada?: ResultadoConsistenciaCruzada;
}

export interface ResultadoConsistenciaCruzada {
  consistente: boolean;
  discrepancias: Discrepancia[];
  score: number;
  dictamen: string;
}

export interface Discrepancia {
  campo: string;
  valorFactura: string;
  valorBL: string;
  severidad: 'critica' | 'media' | 'baja';
  descripcion: string;
}

// ─── Keywords por tipo de documento ─────────────────────────────

const KEYWORD_MAP: Record<TipoDocumentoSniffer, { keywords: string[]; peso: number }> = {
  factura_comercial: {
    keywords: [
      'invoice', 'commercial invoice', 'factura comercial', 'factura',
      'proforma', 'unit price', 'total amount', 'bill to', 'sold to',
      'incoterms', 'fob', 'cif', 'cfr', 'payment terms',
    ],
    peso: 10,
  },
  bill_of_lading: {
    keywords: [
      'bill of lading', 'b/l', 'conocimiento de embarque', 'ocean bill',
      'shipper', 'consignee', 'notify party', 'port of loading',
      'port of discharge', 'vessel', 'voyage', 'container', 'seal',
      'freight prepaid', 'freight collect', 'airway bill', 'awb',
      'master air waybill', 'house air waybill',
    ],
    peso: 10,
  },
  certificado_origen: {
    keywords: [
      'certificate of origin', 'certificado de origen', 'origin',
      'country of origin', 'preferential', 'tlc', 'trade agreement',
      'chamber of commerce', 'camara de comercio',
    ],
    peso: 8,
  },
  packing_list: {
    keywords: [
      'packing list', 'lista de empaque', 'packing', 'carton',
      'net weight', 'gross weight', 'dimensions', 'marks and numbers',
      'number of packages', 'total packages',
    ],
    peso: 8,
  },
  permiso_minsa: {
    keywords: [
      'minsa', 'ministerio de salud', 'registro sanitario',
      'permiso sanitario', 'salud', 'notificación sanitaria',
      'alimento', 'medicamento', 'cosmético',
    ],
    peso: 12,
  },
  permiso_mida: {
    keywords: [
      'mida', 'ministerio de desarrollo agropecuario',
      'fitosanitario', 'zoosanitario', 'importación vegetal',
      'cuarentena agropecuaria',
    ],
    peso: 12,
  },
  permiso_aupsa: {
    keywords: [
      'aupsa', 'autoridad panameña de seguridad de alimentos',
      'inocuidad alimentaria', 'permiso de importación de alimentos',
    ],
    peso: 12,
  },
  certificado_fitosanitario: {
    keywords: [
      'phytosanitary certificate', 'certificado fitosanitario',
      'plant health', 'ippc', 'sanidad vegetal',
    ],
    peso: 9,
  },
  poliza_seguro: {
    keywords: [
      'insurance', 'policy', 'póliza', 'seguro', 'cobertura',
      'prima', 'certificate of insurance', 'cargo insurance',
    ],
    peso: 7,
  },
  desconocido: { keywords: [], peso: 0 },
};

// ─── Patrones de extracción ─────────────────────────────────────

const EXTRACTION_PATTERNS = {
  numeroDocumento: [
    /(?:invoice\s*(?:no|#|number|num)\.?\s*:?\s*)([A-Z0-9\-\/]+)/i,
    /(?:b\/l\s*(?:no|#|number)\.?\s*:?\s*)([A-Z0-9\-]+)/i,
    /(?:doc(?:ument)?\s*(?:no|#)\.?\s*:?\s*)([A-Z0-9\-\/]+)/i,
    /(?:ref(?:erence)?\.?\s*:?\s*)([A-Z0-9\-\/]+)/i,
    /(?:N[°o]\.\s*:?\s*)([A-Z0-9\-\/]+)/i,
  ],
  fecha: [
    /(?:date\s*:?\s*)(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:fecha\s*:?\s*)(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(\d{4}[\/\-]\d{2}[\/\-]\d{2})/,
    /(\d{2}[\/\-]\w{3}[\/\-]\d{4})/i,
  ],
  importador: [
    /(?:consignee|importador|import(?:er)?|destinatario)\s*:?\s*(.{3,60}?)(?:\n|$)/i,
    /(?:bill\s*to|sold\s*to|comprador)\s*:?\s*(.{3,60}?)(?:\n|$)/i,
  ],
  exportador: [
    /(?:shipper|exportador|export(?:er)?|remitente)\s*:?\s*(.{3,60}?)(?:\n|$)/i,
    /(?:seller|vendedor|ship\s*from)\s*:?\s*(.{3,60}?)(?:\n|$)/i,
  ],
  hsCode: [
    /(?:hs\s*code|partida|tariff|arancel)\s*:?\s*(\d{4}[\.\s]?\d{2}[\.\s]?\d{2})/i,
    /\b(\d{4}\.\d{2}\.\d{2})\b/,
    /\b(\d{8,10})\b/,
  ],
  valor: [
    /(?:total\s*(?:amount|value)|valor\s*total|grand\s*total)\s*:?\s*(?:USD|US\$|\$)?\s*([\d,]+\.?\d*)/i,
    /(?:fob|cif|cfr)\s*:?\s*(?:USD|US\$|\$)?\s*([\d,]+\.?\d*)/i,
  ],
  peso: [
    /(?:gross\s*weight|peso\s*bruto|total\s*weight)\s*:?\s*([\d,]+\.?\d*)\s*(?:kg|kgs)?/i,
    /(?:net\s*weight|peso\s*neto)\s*:?\s*([\d,]+\.?\d*)\s*(?:kg|kgs)?/i,
  ],
  paisOrigen: [
    /(?:country\s*of\s*origin|país\s*de\s*origen|origin)\s*:?\s*([A-Za-z\s]{2,30})/i,
    /(?:made\s*in|fabricado\s*en)\s*:?\s*([A-Za-z\s]{2,30})/i,
  ],
};

// ─── Document Sniffer Core ──────────────────────────────────────

export class DocumentSniffer {
  /**
   * Analiza el contenido textual de un archivo para detectar tipo y metadatos.
   * Usa OCR ligero (keyword matching) sobre el texto extraído.
   */
  static analizar(
    nombreArchivo: string,
    contenidoTexto: string,
    orionShipmentIds: string[] = []
  ): ResultadoSniffer {
    const texto = contenidoTexto.toLowerCase();
    const nombre = nombreArchivo.toLowerCase();

    // 1. Detectar tipo de documento
    const { tipo, confianza, keywordsEncontradas } = this.detectarTipo(nombre, texto);

    // 2. Extraer metadatos
    const metadatos = this.extraerMetadatos(contenidoTexto);

    // 3. Determinar origen (Orión vs Externo)
    const origen = this.determinarOrigen(contenidoTexto, orionShipmentIds);

    return {
      id: crypto.randomUUID(),
      archivo: nombreArchivo,
      tipoDetectado: tipo,
      confianza,
      metadatos,
      origen,
      fechaAnalisis: new Date().toISOString(),
      keywords: keywordsEncontradas,
    };
  }

  /**
   * Detecta el tipo de documento basado en keywords.
   */
  private static detectarTipo(
    nombre: string,
    textoLower: string
  ): {
    tipo: TipoDocumentoSniffer;
    confianza: number;
    keywordsEncontradas: string[];
  } {
    let mejorTipo: TipoDocumentoSniffer = 'desconocido';
    let mejorScore = 0;
    let mejorKeywords: string[] = [];

    for (const [tipo, config] of Object.entries(KEYWORD_MAP)) {
      if (tipo === 'desconocido') continue;

      const found: string[] = [];
      let score = 0;

      for (const kw of config.keywords) {
        if (textoLower.includes(kw) || nombre.includes(kw)) {
          found.push(kw);
          score += config.peso;
        }
      }

      // Bonus si el nombre del archivo tiene keywords directas
      if (nombre.includes('invoice') || nombre.includes('factura')) {
        if (tipo === 'factura_comercial') score += 20;
      }
      if (nombre.includes('bl') || nombre.includes('bill of lading') || nombre.includes('bol')) {
        if (tipo === 'bill_of_lading') score += 20;
      }
      if (nombre.includes('packing')) {
        if (tipo === 'packing_list') score += 20;
      }
      if (nombre.includes('origin') || nombre.includes('origen')) {
        if (tipo === 'certificado_origen') score += 20;
      }

      if (score > mejorScore) {
        mejorScore = score;
        mejorTipo = tipo as TipoDocumentoSniffer;
        mejorKeywords = found;
      }
    }

    // Calcular confianza normalizada (0-100)
    const confianza = Math.min(100, Math.round((mejorScore / 50) * 100));

    return {
      tipo: confianza >= 20 ? mejorTipo : 'desconocido',
      confianza,
      keywordsEncontradas: mejorKeywords,
    };
  }

  /**
   * Extrae metadatos del contenido textual usando patrones regex.
   */
  private static extraerMetadatos(texto: string): MetadatosExtraidos {
    const metadatos: MetadatosExtraidos = {};

    // Número de documento
    for (const pattern of EXTRACTION_PATTERNS.numeroDocumento) {
      const match = texto.match(pattern);
      if (match?.[1]) {
        metadatos.numeroDocumento = match[1].trim();
        break;
      }
    }

    // Fecha
    for (const pattern of EXTRACTION_PATTERNS.fecha) {
      const match = texto.match(pattern);
      if (match?.[1]) {
        metadatos.fecha = match[1].trim();
        break;
      }
    }

    // Importador
    for (const pattern of EXTRACTION_PATTERNS.importador) {
      const match = texto.match(pattern);
      if (match?.[1]) {
        metadatos.importador = match[1].trim().replace(/[\n\r]+/g, ' ');
        break;
      }
    }

    // Exportador
    for (const pattern of EXTRACTION_PATTERNS.exportador) {
      const match = texto.match(pattern);
      if (match?.[1]) {
        metadatos.exportador = match[1].trim().replace(/[\n\r]+/g, ' ');
        break;
      }
    }

    // HS Code
    for (const pattern of EXTRACTION_PATTERNS.hsCode) {
      const match = texto.match(pattern);
      if (match?.[1]) {
        metadatos.hsCodePreliminar = match[1].trim();
        break;
      }
    }

    // Valor
    for (const pattern of EXTRACTION_PATTERNS.valor) {
      const match = texto.match(pattern);
      if (match?.[1]) {
        metadatos.valorDeclarado = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }

    // Peso
    for (const pattern of EXTRACTION_PATTERNS.peso) {
      const match = texto.match(pattern);
      if (match?.[1]) {
        metadatos.pesoDeclarado = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }

    // País de origen
    for (const pattern of EXTRACTION_PATTERNS.paisOrigen) {
      const match = texto.match(pattern);
      if (match?.[1]) {
        metadatos.paisOrigen = match[1].trim();
        break;
      }
    }

    return metadatos;
  }

  /**
   * Determina si el documento proviene de Orión o es externo.
   */
  private static determinarOrigen(
    texto: string,
    orionShipmentIds: string[]
  ): OrigenDocumento {
    const textoLower = texto.toLowerCase();

    // Buscar cualquier referencia a Orión
    if (textoLower.includes('orion') || textoLower.includes('orión')) {
      return 'ORION';
    }

    // Buscar IDs de embarques Orión conocidos
    for (const id of orionShipmentIds) {
      if (texto.includes(id)) {
        return 'ORION';
      }
    }

    return 'EXTERNO';
  }

  /**
   * Agrupa documentos analizados en expedientes externos.
   */
  static agruparEnExpedientes(resultados: ResultadoSniffer[]): ExpedienteExterno[] {
    const externos = resultados.filter(r => r.origen === 'EXTERNO');
    if (externos.length === 0) return [];

    // Agrupar por importador/exportador
    const grupos = new Map<string, ResultadoSniffer[]>();
    for (const doc of externos) {
      const clave = doc.metadatos.importador?.toLowerCase() || 'sin-identificar';
      if (!grupos.has(clave)) grupos.set(clave, []);
      grupos.get(clave)!.push(doc);
    }

    return Array.from(grupos.entries()).map(([clave, docs]) => {
      const tiposPresentes = new Set(docs.map(d => d.tipoDetectado));

      // Calcular documentos base faltantes
      const documentosFaltantes: string[] = [];
      if (!tiposPresentes.has('factura_comercial')) documentosFaltantes.push('Factura Comercial');
      if (!tiposPresentes.has('bill_of_lading')) documentosFaltantes.push('Bill of Lading / AWB');

      // Calcular permisos faltantes según HS Code
      const permisosFaltantes = this.calcularPermisosFaltantes(docs, tiposPresentes);

      // Determinar semáforo
      const semaforo = this.calcularSemaforo(documentosFaltantes, permisosFaltantes);

      const primerDoc = docs[0];
      return {
        id: crypto.randomUUID(),
        referencia: primerDoc.metadatos.numeroDocumento || `EXT-${Date.now().toString(36).toUpperCase()}`,
        importador: primerDoc.metadatos.importador || 'Sin identificar',
        exportador: primerDoc.metadatos.exportador || 'Sin identificar',
        documentos: docs,
        semaforo,
        documentosFaltantes,
        permisosFaltantes,
        listoParaZod: semaforo === 'verde',
        fechaCreacion: new Date().toISOString(),
        hsCodePreliminar: primerDoc.metadatos.hsCodePreliminar,
      };
    });
  }

  /**
   * Calcula permisos faltantes según la partida arancelaria preliminar.
   */
  private static calcularPermisosFaltantes(
    docs: ResultadoSniffer[],
    tiposPresentes: Set<TipoDocumentoSniffer>
  ): string[] {
    const faltantes: string[] = [];
    const hsCode = docs.find(d => d.metadatos.hsCodePreliminar)?.metadatos.hsCodePreliminar || '';

    // Capítulos que requieren permisos específicos
    const cap = hsCode.substring(0, 4);

    // Alimentos (cap 01-24) → AUPSA, MIDA
    if (['01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
      '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
      '21', '22', '23', '24'].some(c => cap.startsWith(c))) {
      if (!tiposPresentes.has('permiso_aupsa')) faltantes.push('Permiso AUPSA');
      if (!tiposPresentes.has('permiso_mida')) faltantes.push('Permiso MIDA');
    }

    // Farmacéuticos (cap 30) → MINSA
    if (cap.startsWith('30') || cap.startsWith('29')) {
      if (!tiposPresentes.has('permiso_minsa')) faltantes.push('Registro Sanitario MINSA');
    }

    // Productos vegetales → Fitosanitario
    if (['06', '07', '08', '12', '14'].some(c => cap.startsWith(c))) {
      if (!tiposPresentes.has('certificado_fitosanitario')) faltantes.push('Certificado Fitosanitario');
    }

    return faltantes;
  }

  /**
   * Calcula el semáforo de documentación:
   * - Rojo: Faltan documentos base (Factura/BL)
   * - Amarillo: Base completa, faltan permisos
   * - Verde: Listo para validación Zod
   */
  private static calcularSemaforo(
    documentosFaltantes: string[],
    permisosFaltantes: string[]
  ): SemaforoEstado {
    if (documentosFaltantes.length > 0) return 'rojo';
    if (permisosFaltantes.length > 0) return 'amarillo';
    return 'verde';
  }

  /**
   * ZOD — Validación de Consistencia Cruzada entre BL y Factura.
   * Compara datos extraídos de diferentes fuentes externas.
   */
  static validarConsistenciaCruzada(expediente: ExpedienteExterno): ResultadoConsistenciaCruzada {
    const factura = expediente.documentos.find(d => d.tipoDetectado === 'factura_comercial');
    const bl = expediente.documentos.find(d => d.tipoDetectado === 'bill_of_lading');

    if (!factura || !bl) {
      return {
        consistente: false,
        discrepancias: [{
          campo: 'documentos_base',
          valorFactura: factura ? 'Presente' : 'Ausente',
          valorBL: bl ? 'Presente' : 'Ausente',
          severidad: 'critica',
          descripcion: 'No se puede realizar consistencia cruzada: faltan documentos base.',
        }],
        score: 0,
        dictamen: 'BLOQUEADO — Documentos base incompletos para Cross-Check.',
      };
    }

    const discrepancias: Discrepancia[] = [];
    let puntosTotales = 0;
    let puntosOk = 0;

    // 1. Comparar importador/consignatario
    puntosTotales += 3;
    if (factura.metadatos.importador && bl.metadatos.importador) {
      const simFact = factura.metadatos.importador.toLowerCase().trim();
      const simBL = bl.metadatos.importador.toLowerCase().trim();
      if (simFact === simBL || simFact.includes(simBL) || simBL.includes(simFact)) {
        puntosOk += 3;
      } else {
        discrepancias.push({
          campo: 'Importador/Consignatario',
          valorFactura: factura.metadatos.importador,
          valorBL: bl.metadatos.importador,
          severidad: 'critica',
          descripcion: 'El nombre del importador difiere entre la factura y el B/L.',
        });
      }
    }

    // 2. Comparar exportador/shipper
    puntosTotales += 3;
    if (factura.metadatos.exportador && bl.metadatos.exportador) {
      const expFact = factura.metadatos.exportador.toLowerCase().trim();
      const expBL = bl.metadatos.exportador.toLowerCase().trim();
      if (expFact === expBL || expFact.includes(expBL) || expBL.includes(expFact)) {
        puntosOk += 3;
      } else {
        discrepancias.push({
          campo: 'Exportador/Shipper',
          valorFactura: factura.metadatos.exportador,
          valorBL: bl.metadatos.exportador,
          severidad: 'critica',
          descripcion: 'El exportador/shipper difiere entre la factura y el B/L.',
        });
      }
    }

    // 3. Comparar peso
    puntosTotales += 2;
    if (factura.metadatos.pesoDeclarado && bl.metadatos.pesoDeclarado) {
      const diff = Math.abs(factura.metadatos.pesoDeclarado - bl.metadatos.pesoDeclarado);
      const tolerance = bl.metadatos.pesoDeclarado * 0.05; // 5% tolerancia
      if (diff <= tolerance) {
        puntosOk += 2;
      } else {
        discrepancias.push({
          campo: 'Peso Declarado',
          valorFactura: `${factura.metadatos.pesoDeclarado} kg`,
          valorBL: `${bl.metadatos.pesoDeclarado} kg`,
          severidad: diff > tolerance * 2 ? 'critica' : 'media',
          descripcion: `Diferencia de ${diff.toFixed(2)} kg (${((diff / bl.metadatos.pesoDeclarado) * 100).toFixed(1)}%) entre factura y B/L.`,
        });
      }
    }

    // 4. Comparar valor
    puntosTotales += 2;
    if (factura.metadatos.valorDeclarado && bl.metadatos.valorDeclarado) {
      const diffVal = Math.abs(factura.metadatos.valorDeclarado - bl.metadatos.valorDeclarado);
      const toleranceVal = factura.metadatos.valorDeclarado * 0.02; // 2% tolerancia
      if (diffVal <= toleranceVal) {
        puntosOk += 2;
      } else {
        discrepancias.push({
          campo: 'Valor Declarado',
          valorFactura: `$${factura.metadatos.valorDeclarado.toFixed(2)}`,
          valorBL: `$${bl.metadatos.valorDeclarado?.toFixed(2) || 'N/A'}`,
          severidad: 'media',
          descripcion: `Diferencia de valor entre documentos: $${diffVal.toFixed(2)}.`,
        });
      }
    }

    // 5. Comparar país de origen
    puntosTotales += 1;
    if (factura.metadatos.paisOrigen && bl.metadatos.paisOrigen) {
      if (factura.metadatos.paisOrigen.toLowerCase() === bl.metadatos.paisOrigen.toLowerCase()) {
        puntosOk += 1;
      } else {
        discrepancias.push({
          campo: 'País de Origen',
          valorFactura: factura.metadatos.paisOrigen,
          valorBL: bl.metadatos.paisOrigen,
          severidad: 'media',
          descripcion: 'El país de origen difiere entre documentos.',
        });
      }
    }

    const score = puntosTotales > 0 ? Math.round((puntosOk / puntosTotales) * 100) : 0;
    const consistente = discrepancias.filter(d => d.severidad === 'critica').length === 0;

    let dictamen: string;
    if (score >= 90 && consistente) {
      dictamen = 'APROBADO — Consistencia cruzada verificada. Datos coherentes entre Factura y B/L.';
    } else if (score >= 60) {
      dictamen = 'OBSERVADO — Se detectaron diferencias menores. Revisión manual recomendada.';
    } else {
      dictamen = 'BLOQUEADO — Discrepancias críticas detectadas. Corrección obligatoria antes de continuar.';
    }

    return { consistente, discrepancias, score, dictamen };
  }
}

// ─── Documentos requeridos por partida arancelaria ──────────────

export const DOCUMENTOS_OBLIGATORIOS_BASE = [
  'Factura Comercial',
  'Bill of Lading / AWB',
];

export const DOCUMENTOS_REQUERIDOS_POR_CAPITULO: Record<string, string[]> = {
  '01-05': ['Certificado Zoosanitario', 'Permiso MIDA'],
  '06-14': ['Certificado Fitosanitario', 'Permiso MIDA'],
  '15-24': ['Permiso AUPSA', 'Certificado de Análisis'],
  '28-29': ['Permiso CONAPRED', 'Hoja de Seguridad (MSDS)'],
  '30':    ['Registro Sanitario MINSA', 'Certificado de Libre Venta'],
  '33':    ['Notificación Sanitaria MINSA'],
  '38':    ['Permiso CONAPRED', 'Hoja de Seguridad (MSDS)'],
  '84-85': ['Certificado de Conformidad'],
  '87':    ['Homologación Vehicular ATTT'],
};

/**
 * Obtiene la lista de documentos requeridos según un HS code preliminar.
 */
export function obtenerDocumentosRequeridos(hsCode?: string): string[] {
  const base = [...DOCUMENTOS_OBLIGATORIOS_BASE];

  if (!hsCode) return [...base, 'Packing List (recomendado)'];

  const cap2 = hsCode.substring(0, 2);
  const capNum = parseInt(cap2, 10);

  for (const [rango, docs] of Object.entries(DOCUMENTOS_REQUERIDOS_POR_CAPITULO)) {
    const [min, max] = rango.split('-').map(s => parseInt(s, 10));
    if (capNum >= min && capNum <= (max || min)) {
      base.push(...docs);
    }
  }

  base.push('Packing List (recomendado)');
  base.push('Certificado de Origen (si aplica TLC)');

  return [...new Set(base)];
}
