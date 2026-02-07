/**
 * MOTOR AFC (Acuerdo de Facilitación del Comercio — OMC)
 * 
 * Implementa los protocolos del AFC aplicados a la operación aduanera panameña:
 * - Art. 7.1: Procesamiento Pre-Arribo
 * - Art. 7.9: Mercancías Perecederas (Prioridad Periferia)
 * - Art. 3: Resoluciones Anticipadas (Consultas Clasificatorias)
 * - Art. 10.4: Ventanilla Única (Sello de Facilitación)
 * 
 * Base Legal: Ley 26 de 2016 (ratificación del AFC por Panamá)
 */

// ── Types ──────────────────────────────────────────────────
export interface CertificadoCumplimientoAnticipado {
  embarqueId: string;
  referencia: string;
  fechaEmision: string;
  estado: 'aprobado' | 'rechazado' | 'parcial';
  verificaciones: VerificacionAFC[];
  puntajeTotal: number;
  aptoDespachoAnticipado: boolean;
  fundamentoLegal: string;
  stellaResumen: string;
  hashCertificado: string;
}

interface VerificacionAFC {
  criterio: string;
  cumple: boolean;
  detalle: string;
  articuloAFC: string;
}

export interface AlertaPerecederaAFC {
  embarqueId: string;
  referencia: string;
  tipo: 'pre_arribo' | 'post_arribo' | 'critica';
  horasDesdeArribo: number;
  mensaje: string;
  accionRequerida: string;
  fundamentoLegal: string;
}

export interface ConsultaClasificatoria {
  id: string;
  numero_resolucion: string;
  fecha_resolucion: string;
  solicitante: string;
  descripcion_mercancia: string;
  hts_code: string;
  criterio_ana: string;
  fundamento_legal: string;
  estado: string;
  dai_percent: number;
  itbms_percent: number;
}

// ── Perishable Product Patterns ────────────────────────────
const PATRONES_PERECEDEROS = [
  // Alimentos frescos
  /\b(frutas?|verduras?|hortalizas?|legumbres?|vegetales?)\b/i,
  /\b(carne|pollo|pescado|mariscos?|camar[oó]n|langosta)\b/i,
  /\b(leche|l[aá]cteos?|queso|yogur|mantequilla|crema)\b/i,
  /\b(huevos?|embutidos?|jam[oó]n|chorizo)\b/i,
  // Flores y plantas
  /\b(flores?|plantas?|rosas?|orqu[ií]deas?|esquejes?)\b/i,
  // Fármacos termosensibles
  /\b(vacunas?|insulina|biol[oó]gicos?|sueros?)\b/i,
  /\b(reactivos?|cultivos?|muestras?\s+biol[oó]gicas?)\b/i,
  // Productos congelados
  /\b(congelados?|refrigerados?|cadena\s+fr[ií]o)\b/i,
  // Agroinsumos MIDA
  /\b(semillas?|fertilizantes?\s+org[aá]nicos?|abonos?\s+org[aá]nicos?)\b/i,
];

const AGENCIAS_PERECEDEROS = ['MIDA', 'AUPSA', 'APA'];

// ── Core Functions ─────────────────────────────────────────

/**
 * Evalúa si un embarque es apto para Despacho Anticipado (Art. 7.1 AFC)
 */
export function evaluarDespachoAnticipado(embarque: {
  salud_documental: number;
  zod_validado: boolean;
  zod_hallazgos: string[];
  pre_liquidacion: Record<string, unknown> | null;
  valor_fob: number | null;
  consignatario_ruc: string | null;
  eta: string | null;
  descripcion_carga: string | null;
}): CertificadoCumplimientoAnticipado {
  const verificaciones: VerificacionAFC[] = [];
  let puntaje = 0;

  // 1. Documentación completa (>= 80%)
  const docCompleta = embarque.salud_documental >= 80;
  verificaciones.push({
    criterio: 'Documentación Completa',
    cumple: docCompleta,
    detalle: docCompleta
      ? `Salud documental al ${embarque.salud_documental}%. Cumple umbral AFC.`
      : `Salud documental al ${embarque.salud_documental}%. Requiere ≥80% para despacho anticipado.`,
    articuloAFC: 'Art. 7.1 AFC — Procesamiento Pre-Arribo',
  });
  if (docCompleta) puntaje += 25;

  // 2. Validación Zod sin hallazgos críticos
  const zodOk = embarque.zod_validado || embarque.zod_hallazgos.length === 0;
  verificaciones.push({
    criterio: 'Integridad Zod',
    cumple: zodOk,
    detalle: zodOk
      ? 'Sin hallazgos de integridad. Datos verificados.'
      : `${embarque.zod_hallazgos.length} hallazgo(s) pendientes de resolución.`,
    articuloAFC: 'Art. 10.4 AFC — Ventanilla Única',
  });
  if (zodOk) puntaje += 25;

  // 3. Pre-liquidación disponible
  const preLiqOk = embarque.pre_liquidacion !== null;
  verificaciones.push({
    criterio: 'Pre-Liquidación Calculada',
    cumple: preLiqOk,
    detalle: preLiqOk
      ? 'Pre-liquidación SIGA generada automáticamente.'
      : 'Pre-liquidación pendiente. Se requieren datos de valor.',
    articuloAFC: 'Art. 7.1 AFC — Despacho antes del arribo',
  });
  if (preLiqOk) puntaje += 25;

  // 4. Identificación fiscal del consignatario
  const fiscalOk = !!embarque.consignatario_ruc;
  verificaciones.push({
    criterio: 'Identificación Fiscal',
    cumple: fiscalOk,
    detalle: fiscalOk
      ? `RUC/Cédula verificada: ${embarque.consignatario_ruc}`
      : 'Consignatario sin RUC/Cédula. Requerido para destinación aduanera.',
    articuloAFC: 'Art. 10.1 AFC — Formalidades de importación',
  });
  if (fiscalOk) puntaje += 25;

  const aptoDespacho = puntaje >= 75;
  const estado = puntaje === 100 ? 'aprobado' : puntaje >= 75 ? 'parcial' : 'rechazado';

  // Generate hash for certificate
  const hashInput = `${embarque.eta}-${puntaje}-${Date.now()}`;
  const hashCertificado = Array.from(
    new Uint8Array(new TextEncoder().encode(hashInput))
  ).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);

  const stellaResumen = aptoDespacho
    ? `Jefe, este embarque cumple ${puntaje}% de los criterios AFC. Está listo para despacho anticipado. Puedes iniciar la destinación aduanera antes del arribo.`
    : `Jefe, este embarque solo cumple ${puntaje}% de los criterios AFC. Faltan requisitos para el despacho anticipado. Revisa los hallazgos pendientes.`;

  return {
    embarqueId: '',
    referencia: '',
    fechaEmision: new Date().toISOString(),
    estado,
    verificaciones,
    puntajeTotal: puntaje,
    aptoDespachoAnticipado: aptoDespacho,
    fundamentoLegal: 'Ley 26 de 2016 (Ratificación AFC-OMC por Panamá) — Art. 7.1: Los Miembros adoptarán procedimientos que permitan la presentación de documentos de importación antes del arribo de las mercancías.',
    stellaResumen,
    hashCertificado: `AFC-${hashCertificado.toUpperCase()}`,
  };
}

/**
 * Detecta si un embarque contiene mercancías perecederas (Art. 7.9 AFC)
 */
export function detectarPerecedero(descripcionCarga: string | null, agencia?: string): boolean {
  if (!descripcionCarga) return false;
  
  // Check if agency is perishable-related
  if (agencia && AGENCIAS_PERECEDEROS.includes(agencia.toUpperCase())) {
    return true;
  }

  return PATRONES_PERECEDEROS.some(patron => patron.test(descripcionCarga));
}

/**
 * Genera alertas para mercancías perecederas post-arribo (Art. 7.9 AFC)
 */
export function generarAlertaPerecedero(embarque: {
  id: string;
  referencia: string;
  eta: string | null;
  ata: string | null;
  estado: string;
  descripcion_carga: string | null;
}): AlertaPerecederaAFC | null {
  if (!embarque.ata && !embarque.eta) return null;

  const ahora = Date.now();
  let horasDesdeArribo = 0;
  let arriboOcurrio = false;

  if (embarque.ata) {
    horasDesdeArribo = (ahora - new Date(embarque.ata).getTime()) / (1000 * 60 * 60);
    arriboOcurrio = true;
  } else if (embarque.eta) {
    const etaTime = new Date(embarque.eta).getTime();
    if (ahora > etaTime) {
      horasDesdeArribo = (ahora - etaTime) / (1000 * 60 * 60);
      arriboOcurrio = true;
    }
  }

  // Only alert if already arrived and not yet cleared
  if (!arriboOcurrio || embarque.estado === 'aprobado') return null;

  if (horasDesdeArribo >= 2) {
    return {
      embarqueId: embarque.id,
      referencia: embarque.referencia,
      tipo: 'critica',
      horasDesdeArribo: Math.round(horasDesdeArribo * 10) / 10,
      mensaje: `⚠️ ALERTA PERECEDERO: ${embarque.referencia} lleva ${horasDesdeArribo.toFixed(1)}h sin liquidación desde el arribo. Art. 7.9 AFC exige despacho prioritario.`,
      accionRequerida: 'Liquidar inmediatamente o solicitar extensión al Administrador de Recinto.',
      fundamentoLegal: 'Art. 7.9 AFC (OMC) — Los Miembros darán prioridad a las mercancías perecederas en sus procedimientos de despacho. Decreto Ley 1 de 2008, Art. 45 — Plazo máximo de despacho para perecederos.',
    };
  }

  if (horasDesdeArribo >= 0.5) {
    return {
      embarqueId: embarque.id,
      referencia: embarque.referencia,
      tipo: 'post_arribo',
      horasDesdeArribo: Math.round(horasDesdeArribo * 10) / 10,
      mensaje: `Embarque perecedero ${embarque.referencia} arribó hace ${horasDesdeArribo.toFixed(1)}h. Priorizar liquidación.`,
      accionRequerida: 'Iniciar proceso de liquidación prioritario.',
      fundamentoLegal: 'Art. 7.9 AFC (OMC) — Despacho prioritario para perecederos.',
    };
  }

  return null;
}

/**
 * Consulta la base de resoluciones anticipadas antes de clasificar
 */
export function buscarResolucionAnticipada(
  consultas: ConsultaClasificatoria[],
  descripcionMercancia: string,
  htsCode?: string
): ConsultaClasificatoria | null {
  if (!consultas.length) return null;

  // Priority 1: Exact HTS match on active rulings
  if (htsCode) {
    const porHTS = consultas.find(
      c => c.hts_code === htsCode && c.estado === 'vigente'
    );
    if (porHTS) return porHTS;
  }

  // Priority 2: Text similarity on description
  const descLower = descripcionMercancia.toLowerCase();
  const palabras = descLower.split(/\s+/).filter(p => p.length > 3);

  let mejorMatch: ConsultaClasificatoria | null = null;
  let mejorPuntaje = 0;

  for (const consulta of consultas.filter(c => c.estado === 'vigente')) {
    const consultaDesc = consulta.descripcion_mercancia.toLowerCase();
    let puntaje = 0;

    for (const palabra of palabras) {
      if (consultaDesc.includes(palabra)) puntaje++;
    }

    const porcentaje = palabras.length > 0 ? puntaje / palabras.length : 0;
    if (porcentaje > 0.5 && puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejorMatch = consulta;
    }
  }

  return mejorMatch;
}

/**
 * Generates the AFC facilitation seal data
 */
export function generarSelloFacilitacion(embarque: {
  referencia: string;
  afc_apto_despacho_anticipado: boolean;
  salud_documental: number;
  zod_validado: boolean;
}): {
  activo: boolean;
  texto: string;
  fundamentoLegal: string;
} {
  const activo = embarque.afc_apto_despacho_anticipado && 
                 embarque.salud_documental >= 80 && 
                 embarque.zod_validado;

  return {
    activo,
    texto: activo
      ? 'Procesado bajo estándares AFC-OMC'
      : 'Pendiente de cumplimiento AFC',
    fundamentoLegal: 'Ley 26 de 2016 — Ratificación del Acuerdo sobre Facilitación del Comercio (AFC) de la OMC por la República de Panamá.',
  };
}
