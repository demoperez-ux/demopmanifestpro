/**
 * BASE NORMATIVA DE PANAMÁ — ZENITH Core
 * Motor de Consultoría Normativa (Stella)
 * 
 * Base de conocimientos: RECAUCA, Decreto Ley 1/2008, TLC vigentes
 * Cada nota técnica cita la base legal panameña
 */

// ============ TIPOS ============

export interface NotaTecnica {
  id: string;
  titulo: string;
  baseLegal: string;
  articulo?: string;
  resumen: string;
  aplicacion: string;
  categoria: CategoriaLegal;
  relevancia: 'alta' | 'media' | 'baja';
}

export type CategoriaLegal =
  | 'clasificacion'
  | 'valoracion'
  | 'origen'
  | 'restriccion'
  | 'liquidacion'
  | 'despacho'
  | 'responsabilidad'
  | 'exoneracion'
  | 'transporte'
  | 'regimen';

// ============ BASE LEGAL PRINCIPAL ============

const LEYES_PANAMA: Record<string, { nombre: string; tipo: string; fecha: string }> = {
  'DL1-2008': {
    nombre: 'Decreto Ley 1 de 13 de febrero de 2008',
    tipo: 'Régimen Aduanero de la República de Panamá',
    fecha: '2008-02-13',
  },
  'RECAUCA': {
    nombre: 'Reglamento del Código Aduanero Uniforme Centroamericano',
    tipo: 'Código Regional Arancelario',
    fecha: '2008-06-25',
  },
  'DE266-2006': {
    nombre: 'Decreto Ejecutivo No. 266 de 2006',
    tipo: 'Reglamento de la Ley Aduanera',
    fecha: '2006-12-19',
  },
  'L23-1997': {
    nombre: 'Ley 23 de 15 de julio de 1997',
    tipo: 'Medicamentos y otros productos para la salud humana',
    fecha: '1997-07-15',
  },
  'L81-2019': {
    nombre: 'Ley 81 de 26 de marzo de 2019',
    tipo: 'Protección de Datos Personales',
    fecha: '2019-03-26',
  },
  'TLC-USA': {
    nombre: 'Tratado de Promoción Comercial Panamá–EE.UU.',
    tipo: 'Tratado de Libre Comercio',
    fecha: '2012-10-31',
  },
  'TLC-UE': {
    nombre: 'Acuerdo de Asociación Centroamérica–UE',
    tipo: 'Tratado de Libre Comercio',
    fecha: '2013-08-01',
  },
  'TLC-MEXICO': {
    nombre: 'Tratado de Libre Comercio Panamá–México',
    tipo: 'Tratado de Libre Comercio',
    fecha: '2015-07-01',
  },
  'TLC-TAIWAN': {
    nombre: 'Tratado de Libre Comercio Panamá–Taiwán',
    tipo: 'Tratado de Libre Comercio',
    fecha: '2004-01-01',
  },
  'TLC-CHILE': {
    nombre: 'Tratado de Libre Comercio Panamá–Chile',
    tipo: 'Tratado de Libre Comercio',
    fecha: '2008-03-07',
  },
  'RES222-ANA': {
    nombre: 'Resolución No. 222 de la ANA',
    tipo: 'Tabla de Honorarios del Corredor de Aduanas',
    fecha: '2020-01-01',
  },
  'L30-1984': {
    nombre: 'Ley 30 de 8 de noviembre de 1984',
    tipo: 'Ley que regula la actividad de los Corredores de Aduanas',
    fecha: '1984-11-08',
  },
};

// ============ NOTAS TÉCNICAS ============

const NOTAS_TECNICAS: NotaTecnica[] = [
  // ─── CLASIFICACIÓN ───
  {
    id: 'NT-CL-001',
    titulo: 'Clasificación arancelaria bajo Sistema Armonizado',
    baseLegal: 'DL1-2008',
    articulo: 'Art. 30-35',
    resumen: 'La clasificación se basa en las Reglas Generales Interpretativas del Sistema Armonizado (SA) adoptado por el Decreto Ley 1 de 2008.',
    aplicacion: 'Toda mercancía importada debe clasificarse conforme a las 6 Reglas Generales. Si la partida arancelaria tiene duda, prevalece la Regla 3(c) — última posición en orden numérico.',
    categoria: 'clasificacion',
    relevancia: 'alta',
  },
  {
    id: 'NT-CL-002',
    titulo: 'Merceología y descripción mínima obligatoria',
    baseLegal: 'DE266-2006',
    articulo: 'Art. 98',
    resumen: 'La declaración de importación debe contener una descripción merceológica suficiente para determinar la clasificación arancelaria.',
    aplicacion: 'Descripciones genéricas como "mercancía general", "varios" o "artículos personales" son insuficientes. El corredor debe especificar composición, uso, marca y modelo cuando aplique.',
    categoria: 'clasificacion',
    relevancia: 'alta',
  },
  // ─── VALORACIÓN ───
  {
    id: 'NT-VA-001',
    titulo: 'Métodos de valoración aduanera (OMC/GATT)',
    baseLegal: 'DL1-2008',
    articulo: 'Art. 45-55',
    resumen: 'El valor en aduana se determina por el Método del Valor de Transacción (Art. VII GATT). Panamá aplica los 6 métodos secuenciales del Acuerdo de Valoración de la OMC.',
    aplicacion: 'Si la factura comercial no refleja el valor real, ANA puede ajustar el valor CIF aplicando métodos alternativos. El corredor debe documentar cualquier ajuste.',
    categoria: 'valoracion',
    relevancia: 'alta',
  },
  {
    id: 'NT-VA-002',
    titulo: 'Detección de subvaluación y responsabilidad del corredor',
    baseLegal: 'DL1-2008',
    articulo: 'Art. 52, Art. 205',
    resumen: 'La declaración de un valor inferior al real constituye fraude aduanero. El corredor tiene responsabilidad solidaria en la determinación del valor.',
    aplicacion: 'Si el valor declarado es inferior al 60% del valor de referencia de la mercancía, el sistema genera alerta de subvaluación. El corredor debe justificar con documentación de soporte.',
    categoria: 'valoracion',
    relevancia: 'alta',
  },
  // ─── ORIGEN ───
  {
    id: 'NT-OR-001',
    titulo: 'Certificado de origen y preferencias arancelarias TLC',
    baseLegal: 'TLC-USA',
    articulo: 'Cap. 4',
    resumen: 'Las mercancías originarias de EE.UU. pueden beneficiarse de tasa preferencial DAI 0% bajo el TPA, siempre que se presente certificado de origen válido.',
    aplicacion: 'El certificado debe presentarse antes del levante. Si se omite, la mercancía tributa la tasa NMF (Nación Más Favorecida). El corredor puede solicitar trato preferencial retroactivo dentro de 1 año.',
    categoria: 'origen',
    relevancia: 'alta',
  },
  {
    id: 'NT-OR-002',
    titulo: 'Reglas de origen — Transformación sustancial',
    baseLegal: 'RECAUCA',
    articulo: 'Art. 18-24',
    resumen: 'Para que una mercancía sea considerada originaria, debe cumplir con las reglas de transformación sustancial o el porcentaje de valor de contenido regional.',
    aplicacion: 'En courier, si el remitente no es el fabricante, puede no aplicar el trato preferencial TLC. Verificar que el certificado de origen sea emitido por el exportador o productor.',
    categoria: 'origen',
    relevancia: 'media',
  },
  // ─── RESTRICCIONES ───
  {
    id: 'NT-RS-001',
    titulo: 'Requisitos sanitarios MINSA para productos farmacéuticos',
    baseLegal: 'L23-1997',
    articulo: 'Art. 5-15',
    resumen: 'Todo medicamento o producto farmacéutico importado requiere registro sanitario vigente ante el MINSA previo a su nacionalización.',
    aplicacion: 'Aplica a partidas del Capítulo 30 del arancel. El corredor debe verificar la existencia del registro sanitario. Sin permiso, la mercancía queda en custodia del recinto hasta regularización.',
    categoria: 'restriccion',
    relevancia: 'alta',
  },
  {
    id: 'NT-RS-002',
    titulo: 'Mercancías de uso dual y precursores químicos',
    baseLegal: 'DL1-2008',
    articulo: 'Art. 65',
    resumen: 'Los precursores químicos (listados por CONAPRED) requieren permiso previo de importación y están sujetos a inspección obligatoria.',
    aplicacion: 'Productos que contengan efedrina, seudoefedrina, ácido sulfúrico, acetona, entre otros, requieren la licencia CONAPRED antes del levante. El corredor NO puede declarar estos productos sin la licencia vigente.',
    categoria: 'restriccion',
    relevancia: 'alta',
  },
  // ─── LIQUIDACIÓN ───
  {
    id: 'NT-LQ-001',
    titulo: 'Liquidación de tributos aduaneros (DAI, ITBMS, ISC)',
    baseLegal: 'DL1-2008',
    articulo: 'Art. 80-95',
    resumen: 'Los tributos aduaneros se calculan sobre el valor CIF (Costo + Seguro + Flete). El DAI se aplica según la partida arancelaria, el ITBMS (7%) sobre el valor CIF + DAI, y el ISC aplica a mercancías específicas.',
    aplicacion: 'La base imponible del ITBMS es el valor CIF + DAI + ISC. Para envíos De Minimis (≤$100 CIF), aplica Categoría B con tasa fija. El corredor debe verificar la correcta aplicación de las tasas vigentes.',
    categoria: 'liquidacion',
    relevancia: 'alta',
  },
  {
    id: 'NT-LQ-002',
    titulo: 'Honorarios del corredor — Resolución 222 ANA',
    baseLegal: 'RES222-ANA',
    articulo: 'Tabla Oficial',
    resumen: 'Los honorarios del corredor de aduanas están regulados por la Resolución 222 de la ANA, con escalas mínimas basadas en el valor CIF de la mercancía.',
    aplicacion: 'Los honorarios incluyen: gestión de documentos, clasificación arancelaria, presentación de la declaración. No incluyen servicios adicionales como almacenaje, transporte interno o inspecciones especiales.',
    categoria: 'liquidacion',
    relevancia: 'alta',
  },
  // ─── RESPONSABILIDAD ───
  {
    id: 'NT-RP-001',
    titulo: 'Responsabilidad solidaria del corredor de aduanas',
    baseLegal: 'L30-1984',
    articulo: 'Art. 12, 15, 22',
    resumen: 'El corredor de aduanas ejerce como auxiliar de la función pública y es solidariamente responsable con el importador ante la ANA por la veracidad de las declaraciones.',
    aplicacion: 'Cualquier error en la clasificación, valoración o descripción de la mercancía puede generar responsabilidad penal y administrativa. ZENITH protege la licencia del corredor mediante auditorías preventivas.',
    categoria: 'responsabilidad',
    relevancia: 'alta',
  },
  {
    id: 'NT-RP-002',
    titulo: 'Rectificación voluntaria de la declaración',
    baseLegal: 'DL1-2008',
    articulo: 'Art. 126',
    resumen: 'El corredor puede rectificar voluntariamente errores en la declaración antes de la intervención de ANA, sin multa, siempre que no se haya iniciado un proceso de fiscalización.',
    aplicacion: 'Si ZENITH detecta una discrepancia post-declaración, el corredor debe iniciar la rectificación voluntaria de inmediato. Después de la notificación de ANA, la rectificación genera multa del 100% de los tributos dejados de pagar.',
    categoria: 'responsabilidad',
    relevancia: 'alta',
  },
  // ─── DESPACHO ───
  {
    id: 'NT-DS-001',
    titulo: 'Modalidades de despacho: Anticipado, Urgente, Normal',
    baseLegal: 'DL1-2008',
    articulo: 'Art. 100-105',
    resumen: 'Panamá reconoce tres modalidades de despacho aduanero: Anticipado (previo al arribo), Normal (posterior al arribo) y Urgente (perecederos, emergencias).',
    aplicacion: 'Para courier, se utiliza generalmente el despacho anticipado. El corredor debe presentar la declaración antes del arribo para agilizar el levante.',
    categoria: 'despacho',
    relevancia: 'media',
  },
  {
    id: 'NT-DS-002',
    titulo: 'De Minimis — Umbral $100 CIF',
    baseLegal: 'DL1-2008',
    articulo: 'Art. 84',
    resumen: 'Los envíos con valor CIF igual o inferior a $100.00 se clasifican como Categoría B (De Minimis) y están exentos de tributos aduaneros, pagando solo una tasa fija.',
    aplicacion: 'El umbral aplica por envío individual, no por consolidado. Si un mismo consignatario recibe múltiples envíos que sumen más de $100, ANA puede considerarlos como una sola importación (fraccionamiento).',
    categoria: 'despacho',
    relevancia: 'alta',
  },
  // ─── TRANSPORTE ───
  {
    id: 'NT-TR-001',
    titulo: 'Manifiesto de carga aérea y terrestre',
    baseLegal: 'RECAUCA',
    articulo: 'Art. 95-100',
    resumen: 'Todo medio de transporte debe presentar el manifiesto de carga ante la aduana de ingreso. El MAWB (Master Air Waybill) identifica el embarque consolidado.',
    aplicacion: 'Cada paquete individual se identifica por su HAWB (House Air Waybill) o número de tracking. El MAWB es solo una referencia del consolidado y NO puede usarse como identificador individual.',
    categoria: 'transporte',
    relevancia: 'alta',
  },
];

// ============ MOTOR DE CONSULTORÍA ============

export class BaseNormativaPanama {
  /**
   * Busca notas técnicas relevantes para un contexto dado
   */
  static buscarNotas(categoria: CategoriaLegal, maxResultados = 5): NotaTecnica[] {
    return NOTAS_TECNICAS
      .filter(n => n.categoria === categoria)
      .sort((a, b) => {
        const relevancias = { alta: 0, media: 1, baja: 2 };
        return relevancias[a.relevancia] - relevancias[b.relevancia];
      })
      .slice(0, maxResultados);
  }

  /**
   * Obtiene una nota técnica por ID
   */
  static obtenerNota(id: string): NotaTecnica | undefined {
    return NOTAS_TECNICAS.find(n => n.id === id);
  }

  /**
   * Genera la nota técnica de Stella para un contexto de clasificación
   */
  static generarNotaClasificacion(descripcion: string, htsCode: string): NotaTecnica {
    const base = NOTAS_TECNICAS.find(n => n.id === 'NT-CL-001')!;
    return {
      ...base,
      id: `NT-CL-DYN-${Date.now()}`,
      titulo: `Clasificación ${htsCode} — Nota de Stella`,
      aplicacion: `La mercancía "${descripcion.substring(0, 60)}..." se clasifica bajo la partida ${htsCode} conforme a las Reglas Generales Interpretativas del SA (Art. 30 DL 1/2008). El corredor debe verificar que la descripción corresponda a la naturaleza real del producto.`,
    };
  }

  /**
   * Genera la nota técnica de Stella para restricciones
   */
  static generarNotaRestriccion(tipo: 'MINSA' | 'MIDA' | 'CONAPRED' | 'AUPSA'): NotaTecnica {
    const mapeo: Record<string, NotaTecnica> = {
      MINSA: { ...NOTAS_TECNICAS.find(n => n.id === 'NT-RS-001')! },
      CONAPRED: { ...NOTAS_TECNICAS.find(n => n.id === 'NT-RS-002')! },
      MIDA: {
        id: 'NT-RS-MIDA',
        titulo: 'Requisitos fitosanitarios MIDA',
        baseLegal: 'DL1-2008',
        articulo: 'Art. 66',
        resumen: 'Los productos agrícolas y de origen animal requieren permiso fitosanitario o zoosanitario del MIDA.',
        aplicacion: 'El corredor debe presentar el certificado fitosanitario del país de origen y el permiso de importación MIDA antes del levante.',
        categoria: 'restriccion',
        relevancia: 'alta',
      },
      AUPSA: {
        id: 'NT-RS-AUPSA',
        titulo: 'Requisitos AUPSA para alimentos',
        baseLegal: 'DL1-2008',
        articulo: 'Art. 67',
        resumen: 'Los alimentos y suplementos alimenticios requieren notificación sanitaria ante la AUPSA.',
        aplicacion: 'Se requiere etiquetado en español, certificado de libre venta del país de origen y análisis de laboratorio cuando aplique.',
        categoria: 'restriccion',
        relevancia: 'alta',
      },
    };
    return mapeo[tipo] || mapeo.MINSA;
  }

  /**
   * Genera nota sobre TLC aplicable según país de origen
   */
  static obtenerTLCAplicable(paisOrigen: string): NotaTecnica | null {
    const tlcMap: Record<string, string> = {
      US: 'TLC-USA',
      MX: 'TLC-MEXICO',
      TW: 'TLC-TAIWAN',
      CL: 'TLC-CHILE',
      // UE
      DE: 'TLC-UE', FR: 'TLC-UE', ES: 'TLC-UE', IT: 'TLC-UE', NL: 'TLC-UE',
    };

    const tlcKey = tlcMap[paisOrigen.toUpperCase()];
    if (!tlcKey) return null;

    const ley = LEYES_PANAMA[tlcKey];
    return {
      id: `NT-TLC-${paisOrigen}`,
      titulo: `TLC aplicable: ${ley.nombre}`,
      baseLegal: tlcKey,
      resumen: `Las mercancías originarias de ${paisOrigen} pueden beneficiarse de preferencias arancelarias bajo el ${ley.nombre}.`,
      aplicacion: 'Para acceder al trato preferencial, se requiere certificado de origen válido emitido por el exportador o productor. El corredor debe verificar que la mercancía cumpla con las reglas de origen del tratado.',
      categoria: 'origen',
      relevancia: 'alta',
    };
  }

  /**
   * Nota sobre responsabilidad solidaria del corredor
   */
  static obtenerNotaResponsabilidad(): NotaTecnica {
    return NOTAS_TECNICAS.find(n => n.id === 'NT-RP-001')!;
  }

  /**
   * Obtiene la nota de rectificación voluntaria
   */
  static obtenerNotaRectificacion(): NotaTecnica {
    return NOTAS_TECNICAS.find(n => n.id === 'NT-RP-002')!;
  }

  /**
   * Obtiene la referencia legal completa
   */
  static obtenerLey(clave: string): typeof LEYES_PANAMA[string] | undefined {
    return LEYES_PANAMA[clave];
  }

  /**
   * Genera el string de cita legal para Stella
   */
  static citarBaseLegal(nota: NotaTecnica): string {
    const ley = LEYES_PANAMA[nota.baseLegal];
    if (!ley) return `Base legal: ${nota.baseLegal}`;
    return `📜 ${ley.nombre}${nota.articulo ? ` — ${nota.articulo}` : ''} (${ley.tipo})`;
  }

  /**
   * Todas las categorías disponibles
   */
  static get categorias(): CategoriaLegal[] {
    return ['clasificacion', 'valoracion', 'origen', 'restriccion', 'liquidacion', 'despacho', 'responsabilidad', 'exoneracion', 'transporte', 'regimen'];
  }

  /**
   * Total de notas en la base
   */
  static get totalNotas(): number {
    return NOTAS_TECNICAS.length;
  }
}
