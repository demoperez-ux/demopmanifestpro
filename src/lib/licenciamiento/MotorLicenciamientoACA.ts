// ============================================
// Motor de Licenciamiento ACA (SOP-ACA-001)
// Zod Document Auditing, Stella Notifications, KPI Engine
// ============================================

import { ETAPAS_SOP, type ProcesoOnboarding } from '@/types/onboarding';

// ============================================
// Carpeta Maestra — Estructura 00 a 08
// ============================================
export interface CarpetaMaestraFolder {
  id: string;
  numero: string;
  nombre: string;
  fase: number;
  documentos: CarpetaDocumento[];
  estado: 'vacio' | 'parcial' | 'completo' | 'bloqueado';
}

export interface CarpetaDocumento {
  id: string;
  nombre: string;
  tipo: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  diasVigencia: number;
  estado: 'pendiente' | 'vigente' | 'vencido' | 'rechazado';
  zodAuditado: boolean;
  zodVeredicto?: string;
  storagePath?: string;
  fileSize?: number;
}

export const ESTRUCTURA_CARPETA_MAESTRA: Omit<CarpetaMaestraFolder, 'documentos' | 'estado'>[] = [
  { id: 'CM-00', numero: '00', nombre: 'Solicitud Inicial y KYC', fase: 0 },
  { id: 'CM-01', numero: '01', nombre: 'Verificación de Identidad', fase: 1 },
  { id: 'CM-02', numero: '02', nombre: 'Idoneidad Profesional ANA', fase: 2 },
  { id: 'CM-03', numero: '03', nombre: 'Constitución de Fianza', fase: 3 },
  { id: 'CM-04', numero: '04', nombre: 'Compliance & Due Diligence', fase: 4 },
  { id: 'CM-05', numero: '05', nombre: 'Expediente Builder', fase: 5 },
  { id: 'CM-06', numero: '06', nombre: 'Revisión Legal', fase: 6 },
  { id: 'CM-07', numero: '07', nombre: 'Aprobación Final y Registro', fase: 7 },
  { id: 'CM-08', numero: '08', nombre: 'Activación & Bienvenida', fase: 8 },
];

// ============================================
// Zod Document Expiry Auditor
// ============================================
export interface ZodDocumentAudit {
  documentoId: string;
  nombreDocumento: string;
  fechaEmision: string;
  diasDesdeEmision: number;
  limiteVigenciaDias: number;
  estado: 'vigente' | 'por_vencer' | 'vencido';
  veredicto: string;
  bloqueaFase: boolean;
  faseAfectada: number;
}

const VIGENCIA_DOCUMENTOS: Record<string, { diasMaximos: number; fase: number }> = {
  'antecedentes_penales': { diasMaximos: 60, fase: 4 },
  'constancia_css': { diasMaximos: 90, fase: 4 },
  'paz_y_salvo_dgi': { diasMaximos: 30, fase: 4 },
  'certificado_idoneidad': { diasMaximos: 365, fase: 2 },
  'foto_carnet': { diasMaximos: 180, fase: 1 },
  'declaracion_jurada': { diasMaximos: 60, fase: 4 },
};

export function zodAuditarVigenciaDocumentos(
  documentos: { id: string; nombre: string; tipo: string; fechaEmision?: string }[]
): ZodDocumentAudit[] {
  const ahora = new Date();
  const auditorias: ZodDocumentAudit[] = [];

  for (const doc of documentos) {
    const config = VIGENCIA_DOCUMENTOS[doc.tipo];
    if (!config || !doc.fechaEmision) continue;

    const emision = new Date(doc.fechaEmision);
    const diasTranscurridos = Math.floor((ahora.getTime() - emision.getTime()) / (1000 * 60 * 60 * 24));
    const porcentajeVigencia = diasTranscurridos / config.diasMaximos;

    let estado: ZodDocumentAudit['estado'] = 'vigente';
    let veredicto = '';
    let bloquea = false;

    if (diasTranscurridos > config.diasMaximos) {
      estado = 'vencido';
      bloquea = true;
      veredicto = `⛔ Veredicto de Zod: Documento "${doc.nombre}" VENCIDO. Emitido hace ${diasTranscurridos} días (límite: ${config.diasMaximos} días). Fase ${config.fase} BLOQUEADA hasta que se presente un documento actualizado.`;
    } else if (porcentajeVigencia > 0.8) {
      estado = 'por_vencer';
      const diasRestantes = config.diasMaximos - diasTranscurridos;
      veredicto = `⚠️ Alerta Zod: Documento "${doc.nombre}" próximo a vencer en ${diasRestantes} días. Se recomienda gestionar renovación inmediata.`;
    } else {
      veredicto = `✅ Documento "${doc.nombre}" vigente. ${config.diasMaximos - diasTranscurridos} días restantes.`;
    }

    auditorias.push({
      documentoId: doc.id,
      nombreDocumento: doc.nombre,
      fechaEmision: doc.fechaEmision,
      diasDesdeEmision: diasTranscurridos,
      limiteVigenciaDias: config.diasMaximos,
      estado,
      veredicto,
      bloqueaFase: bloquea,
      faseAfectada: config.fase,
    });
  }

  return auditorias;
}

export function zodVerificarFaseDesbloqueada(
  fase: number,
  auditorias: ZodDocumentAudit[]
): { desbloqueada: boolean; documentosBloqueantes: ZodDocumentAudit[] } {
  const bloqueantes = auditorias.filter(a => a.bloqueaFase && a.faseAfectada <= fase);
  return {
    desbloqueada: bloqueantes.length === 0,
    documentosBloqueantes: bloqueantes,
  };
}

// ============================================
// Anexo C — Declaración de Integridad
// ============================================
export interface AnexoCDeclaracion {
  procesoId: string;
  corredorNombre: string;
  corredorCedula: string;
  fechaDeclaracion: string;
  declaraciones: {
    id: string;
    texto: string;
    aceptada: boolean;
  }[];
  firmaDigital?: {
    hash: string;
    timestamp: string;
    ip: string;
  };
  estado: 'pendiente' | 'firmada' | 'rechazada';
}

export const DECLARACIONES_INTEGRIDAD = [
  { id: 'DI-01', texto: 'Declaro bajo juramento que toda la información proporcionada es veraz, completa y verificable, según lo establecido en el Artículo 79 del Decreto Ley 1 de 2008.' },
  { id: 'DI-02', texto: 'Me comprometo a cumplir con las disposiciones del Código de Ética de los Corredores de Aduana establecido por la Autoridad Nacional de Aduanas (ANA).' },
  { id: 'DI-03', texto: 'Acepto que cualquier declaración falsa o incompleta constituye causal de revocación inmediata de la licencia de idoneidad, conforme al Artículo 85 del DL 1/2008.' },
  { id: 'DI-04', texto: 'Declaro no estar inhabilitado para ejercer funciones públicas ni tener antecedentes penales que impidan el ejercicio de la profesión de corredor de aduanas.' },
  { id: 'DI-05', texto: 'Me comprometo a mantener la fianza aduanera vigente durante todo el período de ejercicio profesional, conforme al Artículo 80 del DL 1/2008.' },
  { id: 'DI-06', texto: 'Acepto la supervisión y auditoría periódica por parte de la ANA y del sistema ZENITH para garantizar el cumplimiento normativo continuo.' },
  { id: 'DI-07', texto: 'Declaro que no incurriré en prácticas de lavado de dinero, financiamiento del terrorismo, ni contrabando, conforme a la Ley 23 de 2015 y sus reglamentaciones.' },
];

export async function firmarAnexoC(
  declaracion: AnexoCDeclaracion
): Promise<{ hash: string; timestamp: string }> {
  const payload = `ZENITH-ANEXO-C|${declaracion.procesoId}|${declaracion.corredorCedula}|${declaracion.fechaDeclaracion}|${declaracion.declaraciones.filter(d => d.aceptada).length}/${declaracion.declaraciones.length}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return { hash, timestamp: new Date().toISOString() };
}

// ============================================
// Stella Notifications Engine
// ============================================
export interface StellaNotificacion {
  id: string;
  tipo: 'acompanamiento' | 'recordatorio' | 'alerta' | 'felicitacion';
  fase: number;
  mensaje: string;
  prioridad: 'baja' | 'media' | 'alta';
  accionSugerida?: string;
  timestamp: string;
}

export function stellaGenerarNotificacionesFase(
  proceso: ProcesoOnboarding,
  auditorias: ZodDocumentAudit[]
): StellaNotificacion[] {
  const notificaciones: StellaNotificacion[] = [];
  const ahora = new Date();
  const fase = proceso.etapaActual;

  // Mensajes de acompañamiento por fase
  const mensajesFase: Record<number, { mensaje: string; accion: string }> = {
    0: { mensaje: 'Jefe, hemos recibido la solicitud inicial. Estoy verificando el formulario KYC contra las bases de datos de cumplimiento.', accion: 'Revisar formulario KYC' },
    1: { mensaje: 'Jefe, estamos en la Fase 1 — Verificación de Identidad. He validado la cédula y estoy esperando el récord policivo actualizado.', accion: 'Verificar documento de identidad' },
    2: { mensaje: 'Jefe, estamos en la Fase 2. El certificado de idoneidad ya fue recibido. ¿Desea que verifique los antecedentes del aspirante con la ANA?', accion: 'Verificar idoneidad ANA' },
    3: { mensaje: 'Jefe, estamos en la Fase 3. He solicitado la cotización de la fianza a Finanzas, ¿desea revisar los términos?', accion: 'Revisar términos de fianza' },
    4: { mensaje: 'Jefe, la Fase 4 requiere due diligence ampliada. He preparado el análisis AML/CFT y las verificaciones de listas restrictivas están en proceso.', accion: 'Revisar análisis AML/CFT' },
    5: { mensaje: 'Jefe, el Expediente Builder está ensamblando el expediente foliado. Verifico que todos los documentos cumplan con los requisitos de forma.', accion: 'Revisar expediente foliado' },
    6: { mensaje: 'Jefe, el expediente ha sido enviado a Revisión Legal. El departamento jurídico tiene 72 horas para emitir el dictamen.', accion: 'Consultar estado del dictamen' },
    7: { mensaje: 'Jefe, estamos en aprobación final. Una vez firmado, procedo al registro en el sistema SIGA de la ANA.', accion: 'Iniciar registro SIGA' },
    8: { mensaje: '¡Felicidades, Jefe! El corredor ha sido habilitado exitosamente. Las credenciales operativas de ZENITH ya fueron generadas.', accion: 'Ver credenciales' },
  };

  const faseMsg = mensajesFase[fase];
  if (faseMsg) {
    notificaciones.push({
      id: `stella-fase-${fase}`,
      tipo: fase === 8 ? 'felicitacion' : 'acompanamiento',
      fase,
      mensaje: faseMsg.mensaje,
      prioridad: 'media',
      accionSugerida: faseMsg.accion,
      timestamp: ahora.toISOString(),
    });
  }

  // Alertas de documentos vencidos
  for (const audit of auditorias) {
    if (audit.estado === 'vencido') {
      notificaciones.push({
        id: `stella-vencido-${audit.documentoId}`,
        tipo: 'alerta',
        fase: audit.faseAfectada,
        mensaje: `⚠️ Jefe, el documento "${audit.nombreDocumento}" ha vencido (${audit.diasDesdeEmision} días desde emisión, límite: ${audit.limiteVigenciaDias} días). La Fase ${audit.faseAfectada} está bloqueada hasta presentar un documento actualizado.`,
        prioridad: 'alta',
        accionSugerida: `Solicitar renovación de ${audit.nombreDocumento}`,
        timestamp: ahora.toISOString(),
      });
    } else if (audit.estado === 'por_vencer') {
      notificaciones.push({
        id: `stella-porvencer-${audit.documentoId}`,
        tipo: 'recordatorio',
        fase: audit.faseAfectada,
        mensaje: `📋 Jefe, el documento "${audit.nombreDocumento}" vencerá en ${audit.limiteVigenciaDias - audit.diasDesdeEmision} días. Recomiendo gestionar la renovación preventivamente.`,
        prioridad: 'media',
        accionSugerida: `Gestionar renovación preventiva`,
        timestamp: ahora.toISOString(),
      });
    }
  }

  // Recordatorio semanal SLA
  const slaTimestamp = proceso.slaTimestamps[fase];
  if (slaTimestamp) {
    const etapa = ETAPAS_SOP[fase];
    if (etapa) {
      const inicio = new Date(slaTimestamp).getTime();
      const transcurridoHoras = (ahora.getTime() - inicio) / (1000 * 60 * 60);
      if (transcurridoHoras > etapa.slaHoras * 0.75) {
        notificaciones.push({
          id: `stella-sla-${fase}`,
          tipo: 'recordatorio',
          fase,
          mensaje: `⏰ Jefe, el SLA de la Fase ${fase} (${etapa.nombre}) está al ${Math.round((transcurridoHoras / etapa.slaHoras) * 100)}%. Quedan aproximadamente ${Math.max(0, Math.round(etapa.slaHoras - transcurridoHoras))} horas.`,
          prioridad: transcurridoHoras > etapa.slaHoras ? 'alta' : 'media',
          accionSugerida: 'Priorizar cierre de fase',
          timestamp: ahora.toISOString(),
        });
      }
    }
  }

  return notificaciones;
}

// ============================================
// Simulador de Examen Técnico (Fase 5)
// ============================================
export interface PreguntaExamen {
  id: string;
  categoria: 'clasificacion' | 'valoracion' | 'normativa';
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number;
  fundamentoLegal?: string;
}

export const BANCO_PREGUNTAS: PreguntaExamen[] = [
  // CLASIFICACIÓN (17 preguntas)
  { id: 'CL-01', categoria: 'clasificacion', pregunta: '¿Cuál es el sistema de clasificación arancelaria utilizado en Panamá?', opciones: ['Sistema Armonizado de la OMA', 'NAICS', 'CIIU Rev. 4', 'SITC'], respuestaCorrecta: 0, fundamentoLegal: 'Art. 8 del DL 1/2008' },
  { id: 'CL-02', categoria: 'clasificacion', pregunta: '¿Cuántos dígitos tiene una partida arancelaria en el arancel nacional?', opciones: ['4 dígitos', '6 dígitos', '8 dígitos', '10 dígitos'], respuestaCorrecta: 3, fundamentoLegal: 'Decreto 390/2019' },
  { id: 'CL-03', categoria: 'clasificacion', pregunta: '¿Qué regla general de interpretación se aplica cuando una mercancía puede clasificarse en dos o más partidas?', opciones: ['Regla 1', 'Regla 2(b)', 'Regla 3', 'Regla 6'], respuestaCorrecta: 2, fundamentoLegal: 'RGI 3 del SA' },
  { id: 'CL-04', categoria: 'clasificacion', pregunta: 'Los productos farmacéuticos para uso humano se clasifican generalmente en el capítulo:', opciones: ['Capítulo 28', 'Capítulo 29', 'Capítulo 30', 'Capítulo 33'], respuestaCorrecta: 2 },
  { id: 'CL-05', categoria: 'clasificacion', pregunta: '¿Qué sección del SA cubre los productos del reino vegetal?', opciones: ['Sección I', 'Sección II', 'Sección III', 'Sección IV'], respuestaCorrecta: 1 },
  { id: 'CL-06', categoria: 'clasificacion', pregunta: '¿Cuál es la función de las Notas de Sección y Capítulo en el SA?', opciones: ['Son meramente informativas', 'Tienen fuerza legal y prevalecen sobre las RGI', 'Solo aplican a importaciones', 'Se usan solo para estadísticas'], respuestaCorrecta: 1 },
  { id: 'CL-07', categoria: 'clasificacion', pregunta: 'La Regla General de Interpretación 1 establece que la clasificación se determina por:', opciones: ['El precio del producto', 'Los textos de partida y notas legales', 'El país de origen', 'El uso final'], respuestaCorrecta: 1 },
  { id: 'CL-08', categoria: 'clasificacion', pregunta: '¿Qué capítulo del SA cubre "máquinas y aparatos eléctricos"?', opciones: ['Capítulo 84', 'Capítulo 85', 'Capítulo 90', 'Capítulo 95'], respuestaCorrecta: 1 },
  { id: 'CL-09', categoria: 'clasificacion', pregunta: 'Un conjunto de artículos acondicionados para la venta al por menor se clasifica según:', opciones: ['RGI 1', 'RGI 2(a)', 'RGI 3(b)', 'RGI 5'], respuestaCorrecta: 2 },
  { id: 'CL-10', categoria: 'clasificacion', pregunta: '¿Cuál es la diferencia entre una partida residual y una partida específica?', opciones: ['No hay diferencia', 'La específica describe el producto con mayor precisión', 'La residual tiene prioridad siempre', 'Solo aplica a alimentos'], respuestaCorrecta: 1 },
  { id: 'CL-11', categoria: 'clasificacion', pregunta: 'Los vehículos automóviles se clasifican en el capítulo:', opciones: ['Capítulo 85', 'Capítulo 86', 'Capítulo 87', 'Capítulo 89'], respuestaCorrecta: 2 },
  { id: 'CL-12', categoria: 'clasificacion', pregunta: '¿Qué es una consulta clasificatoria ante la ANA?', opciones: ['Una denuncia de contrabando', 'Una solicitud de opinión vinculante sobre clasificación', 'Un recurso de apelación', 'Una solicitud de exoneración'], respuestaCorrecta: 1, fundamentoLegal: 'Art. 17 DL 1/2008' },
  { id: 'CL-13', categoria: 'clasificacion', pregunta: 'La materia constitutiva es el criterio principal cuando se aplica:', opciones: ['RGI 1', 'RGI 3(b)', 'RGI 4', 'RGI 6'], respuestaCorrecta: 1 },
  { id: 'CL-14', categoria: 'clasificacion', pregunta: '¿Qué sección del SA cubre las materias textiles?', opciones: ['Sección VIII', 'Sección X', 'Sección XI', 'Sección XII'], respuestaCorrecta: 2 },
  { id: 'CL-15', categoria: 'clasificacion', pregunta: 'Los productos alimenticios preparados se encuentran generalmente en:', opciones: ['Sección I', 'Sección II', 'Sección IV', 'Sección V'], respuestaCorrecta: 2 },
  { id: 'CL-16', categoria: 'clasificacion', pregunta: '¿Qué es el GTIN y cómo se relaciona con la clasificación arancelaria?', opciones: ['Es un código de barras sin relación', 'Es un identificador global que puede mapear a partidas arancelarias', 'Es un sistema de la OMA', 'Es una licencia de importación'], respuestaCorrecta: 1 },
  { id: 'CL-17', categoria: 'clasificacion', pregunta: 'La Regla General 2(a) trata sobre:', opciones: ['Artículos incompletos o sin terminar', 'Mezclas y combinaciones', 'Estuches y envases', 'Partes y accesorios'], respuestaCorrecta: 0 },

  // VALORACIÓN (17 preguntas)
  { id: 'VA-01', categoria: 'valoracion', pregunta: '¿Cuál es el método primario de valoración aduanera según el Acuerdo de la OMC?', opciones: ['Valor de transacción', 'Valor deductivo', 'Valor reconstruido', 'Último recurso'], respuestaCorrecta: 0, fundamentoLegal: 'Art. 1 Acuerdo de Valoración OMC' },
  { id: 'VA-02', categoria: 'valoracion', pregunta: '¿Qué es el valor CIF?', opciones: ['Solo el costo de la mercancía', 'Costo + seguro', 'Costo + seguro + flete', 'Precio de venta al público'], respuestaCorrecta: 2 },
  { id: 'VA-03', categoria: 'valoracion', pregunta: 'El DAI (Derecho de Importación) en Panamá se calcula sobre:', opciones: ['Valor FOB', 'Valor CIF', 'Valor de venta', 'Valor en aduana'], respuestaCorrecta: 1, fundamentoLegal: 'Art. 35 DL 1/2008' },
  { id: 'VA-04', categoria: 'valoracion', pregunta: '¿Cuál es la tasa general del ITBMS en Panamá?', opciones: ['5%', '7%', '10%', '12%'], respuestaCorrecta: 1, fundamentoLegal: 'Ley 8 de 2010' },
  { id: 'VA-05', categoria: 'valoracion', pregunta: '¿Qué elementos se incluyen obligatoriamente en el valor de transacción?', opciones: ['Solo el precio pagado', 'Precio + comisiones + embalajes + asistencias', 'Solo el precio y flete', 'El precio más un margen de ganancia'], respuestaCorrecta: 1 },
  { id: 'VA-06', categoria: 'valoracion', pregunta: '¿Cuántos métodos de valoración establece el Acuerdo de la OMC?', opciones: ['4 métodos', '5 métodos', '6 métodos', '8 métodos'], respuestaCorrecta: 2 },
  { id: 'VA-07', categoria: 'valoracion', pregunta: 'El ISC (Impuesto Selectivo al Consumo) aplica a:', opciones: ['Todas las importaciones', 'Solo alimentos', 'Productos específicos como alcohol y tabaco', 'Solo vehículos'], respuestaCorrecta: 2 },
  { id: 'VA-08', categoria: 'valoracion', pregunta: '¿Qué es la subvaluación aduanera?', opciones: ['Declarar un valor mayor al real', 'Declarar un valor menor al real para pagar menos impuestos', 'No presentar factura comercial', 'Importar sin licencia'], respuestaCorrecta: 1 },
  { id: 'VA-09', categoria: 'valoracion', pregunta: 'Las regalías y derechos de licencia se incluyen en el valor de transacción cuando:', opciones: ['Nunca se incluyen', 'Siempre se incluyen', 'Están relacionadas con la mercancía y son condición de venta', 'Solo si superan el 5%'], respuestaCorrecta: 2 },
  { id: 'VA-10', categoria: 'valoracion', pregunta: '¿Qué es el Método del Valor Deductivo?', opciones: ['Se basa en el costo de producción', 'Se basa en el precio de reventa menos deducciones', 'Se basa en el precio de mercancías idénticas', 'Se basa en criterios razonables'], respuestaCorrecta: 1 },
  { id: 'VA-11', categoria: 'valoracion', pregunta: 'La tasa de cambio para la liquidación aduanera se toma de:', opciones: ['El Banco Nacional de Panamá', 'La tasa del día de la declaración', 'La tasa publicada por la ANA', 'El promedio mensual'], respuestaCorrecta: 2 },
  { id: 'VA-12', categoria: 'valoracion', pregunta: '¿Qué son los gastos de carga, descarga y manipulación en la valoración?', opciones: ['Se incluyen siempre', 'Se excluyen del valor CIF', 'Se incluyen hasta el puerto de importación', 'No existen en la legislación panameña'], respuestaCorrecta: 2 },
  { id: 'VA-13', categoria: 'valoracion', pregunta: '¿Cuál es el honorario mínimo de corredor según la Resolución 222?', opciones: ['$40 USD', '$60 USD', '$80 USD', '$100 USD'], respuestaCorrecta: 1, fundamentoLegal: 'Res. 222/2025' },
  { id: 'VA-14', categoria: 'valoracion', pregunta: 'El Método del Último Recurso permite:', opciones: ['Usar cualquier valor arbitrario', 'Usar criterios flexibles basados en los métodos anteriores', 'No pagar impuestos', 'Solicitar exoneración total'], respuestaCorrecta: 1 },
  { id: 'VA-15', categoria: 'valoracion', pregunta: '¿Qué porcentaje de CIF aplica para honorarios mínimos en importaciones ≥ $2,500?', opciones: ['0.15%', '0.20%', '0.27%', '0.35%'], respuestaCorrecta: 2, fundamentoLegal: 'Res. 222/2025' },
  { id: 'VA-16', categoria: 'valoracion', pregunta: 'Los intereses por pago diferido se excluyen del valor de transacción cuando:', opciones: ['Nunca', 'Son distinguibles del precio pagado', 'Superan el 10%', 'El importador lo solicita'], respuestaCorrecta: 1 },
  { id: 'VA-17', categoria: 'valoracion', pregunta: '¿Cuál es el fundamento legal para la liquidación SIGA en Panamá?', opciones: ['Ley 8 de 2010', 'Decreto Ley 1 de 2008', 'Resolución 222/2025', 'Código Fiscal'], respuestaCorrecta: 1 },

  // NORMATIVA ANA (16 preguntas)
  { id: 'NO-01', categoria: 'normativa', pregunta: '¿Cuál es la ley orgánica de la Autoridad Nacional de Aduanas de Panamá?', opciones: ['Ley 8 de 2010', 'Decreto Ley 1 de 2008', 'Ley 30 de 1984', 'Decreto 390 de 2019'], respuestaCorrecta: 1 },
  { id: 'NO-02', categoria: 'normativa', pregunta: '¿Qué es la "Potestad Aduanera"?', opciones: ['El poder de los importadores', 'La facultad de la ANA para controlar la entrada/salida de mercancías', 'Una licencia de importación', 'Un tipo de fianza'], respuestaCorrecta: 1, fundamentoLegal: 'Art. 4 DL 1/2008' },
  { id: 'NO-03', categoria: 'normativa', pregunta: '¿Cuánto tiempo debe mantenerse vigente la fianza de un corredor de aduanas?', opciones: ['1 año', '2 años', 'Todo el período de ejercicio', '5 años'], respuestaCorrecta: 2, fundamentoLegal: 'Art. 80 DL 1/2008' },
  { id: 'NO-04', categoria: 'normativa', pregunta: '¿Qué es el "Levante" en el contexto aduanero panameño?', opciones: ['La inspección física', 'La autorización para retirar mercancía del recinto', 'El pago de impuestos', 'La clasificación arancelaria'], respuestaCorrecta: 1 },
  { id: 'NO-05', categoria: 'normativa', pregunta: '¿Cuáles son las causales de revocación de la licencia de corredor?', opciones: ['Solo fraude', 'Fraude, negligencia grave, y condena penal', 'Solo condena penal', 'No existen causales'], respuestaCorrecta: 1, fundamentoLegal: 'Art. 85 DL 1/2008' },
  { id: 'NO-06', categoria: 'normativa', pregunta: '¿Qué es un Operador Económico Autorizado (OEA)?', opciones: ['Un importador frecuente', 'Un operador certificado con facilidades aduaneras por cumplimiento', 'Un empleado de la ANA', 'Un tipo de zona franca'], respuestaCorrecta: 1, fundamentoLegal: 'Marco SAFE OMA' },
  { id: 'NO-07', categoria: 'normativa', pregunta: '¿Cuál es el plazo para interponer un recurso de reconsideración ante la ANA?', opciones: ['5 días hábiles', '10 días hábiles', '15 días hábiles', '30 días hábiles'], respuestaCorrecta: 0, fundamentoLegal: 'Art. 294 DL 1/2008' },
  { id: 'NO-08', categoria: 'normativa', pregunta: 'La responsabilidad solidaria del corredor de aduanas se refiere a:', opciones: ['Que solo responde por sus errores', 'Que responde junto al importador por la veracidad de la declaración', 'Que no tiene responsabilidad alguna', 'Que responde solo penalmente'], respuestaCorrecta: 1, fundamentoLegal: 'Art. 82 DL 1/2008' },
  { id: 'NO-09', categoria: 'normativa', pregunta: '¿Qué documento se requiere para el despacho anticipado de mercancías?', opciones: ['Solo la factura', 'La declaración anticipada con documentos de soporte', 'El contrato de compraventa', 'Nada, es automático'], respuestaCorrecta: 1 },
  { id: 'NO-10', categoria: 'normativa', pregunta: '¿Qué es la "Destinación Aduanera"?', opciones: ['El puerto de llegada', 'El régimen al que se somete la mercancía', 'La dirección del importador', 'El tipo de transporte'], respuestaCorrecta: 1, fundamentoLegal: 'Art. 96 DL 1/2008' },
  { id: 'NO-11', categoria: 'normativa', pregunta: '¿Qué es el régimen de tránsito aduanero?', opciones: ['Mercancía en zona libre', 'Transporte de mercancía bajo control aduanero entre dos puntos', 'Exportación temporal', 'Importación definitiva'], respuestaCorrecta: 1 },
  { id: 'NO-12', categoria: 'normativa', pregunta: '¿Qué es el Manifiesto de Carga?', opciones: ['Una factura comercial', 'Un documento que detalla toda la carga transportada', 'Un permiso de importación', 'Un certificado de origen'], respuestaCorrecta: 1 },
  { id: 'NO-13', categoria: 'normativa', pregunta: '¿Qué ley regula la prevención del blanqueo de capitales en Panamá?', opciones: ['Ley 8 de 2010', 'Ley 23 de 2015', 'Decreto 390 de 2019', 'Ley 81 de 2019'], respuestaCorrecta: 1 },
  { id: 'NO-14', categoria: 'normativa', pregunta: '¿Cuál es la función del SIGA?', opciones: ['Sistema de gestión de aeropuertos', 'Sistema Integrado de Gestión Aduanera', 'Sistema de inventario general', 'Sistema de información geográfica'], respuestaCorrecta: 1 },
  { id: 'NO-15', categoria: 'normativa', pregunta: '¿Qué es una zona franca en Panamá?', opciones: ['Una zona sin impuestos de ningún tipo', 'Un área delimitada con régimen aduanero y fiscal especial', 'Un barrio de la ciudad', 'Una zona de libre comercio internacional'], respuestaCorrecta: 1 },
  { id: 'NO-16', categoria: 'normativa', pregunta: '¿Qué norma BASC aplica a las operaciones de comercio exterior?', opciones: ['ISO 9001', 'BASC v6-2022', 'ISO 27001', 'CTPAT'], respuestaCorrecta: 1 },
];

export function generarExamenAleatorio(numPreguntas: number = 50): PreguntaExamen[] {
  const porCategoria = {
    clasificacion: Math.ceil(numPreguntas * 0.34),
    valoracion: Math.ceil(numPreguntas * 0.34),
    normativa: numPreguntas - Math.ceil(numPreguntas * 0.34) * 2,
  };

  const clasificacion = BANCO_PREGUNTAS.filter(p => p.categoria === 'clasificacion');
  const valoracion = BANCO_PREGUNTAS.filter(p => p.categoria === 'valoracion');
  const normativa = BANCO_PREGUNTAS.filter(p => p.categoria === 'normativa');

  const shuffled = (arr: PreguntaExamen[]) => [...arr].sort(() => Math.random() - 0.5);

  return [
    ...shuffled(clasificacion).slice(0, porCategoria.clasificacion),
    ...shuffled(valoracion).slice(0, porCategoria.valoracion),
    ...shuffled(normativa).slice(0, porCategoria.normativa),
  ].sort(() => Math.random() - 0.5);
}

export function evaluarExamen(
  preguntas: PreguntaExamen[],
  respuestas: Record<string, number>
): {
  total: number;
  correctas: number;
  incorrectas: number;
  porcentaje: number;
  aprobado: boolean;
  porCategoria: Record<string, { correctas: number; total: number; porcentaje: number }>;
} {
  let correctas = 0;
  const categorias: Record<string, { correctas: number; total: number }> = {
    clasificacion: { correctas: 0, total: 0 },
    valoracion: { correctas: 0, total: 0 },
    normativa: { correctas: 0, total: 0 },
  };

  for (const pregunta of preguntas) {
    categorias[pregunta.categoria].total++;
    if (respuestas[pregunta.id] === pregunta.respuestaCorrecta) {
      correctas++;
      categorias[pregunta.categoria].correctas++;
    }
  }

  const porcentaje = (correctas / preguntas.length) * 100;

  return {
    total: preguntas.length,
    correctas,
    incorrectas: preguntas.length - correctas,
    porcentaje,
    aprobado: porcentaje >= 70,
    porCategoria: Object.fromEntries(
      Object.entries(categorias).map(([cat, val]) => [
        cat,
        { ...val, porcentaje: val.total > 0 ? (val.correctas / val.total) * 100 : 0 },
      ])
    ),
  };
}

// ============================================
// KPI Engine (Punto 12 SOP)
// ============================================
export interface KPILicenciamiento {
  tiempoPromedioSubsanacionHoras: number;
  porcentajeAceptadosSinPrevencion: number;
  totalProcesos: number;
  procesosActivos: number;
  procesosCompletados: number;
  procesosRechazados: number;
  tiempoPromedioTotalDias: number;
  tasaAprobacion: number;
  documentosConRevisionManual: number;
  slaCumplimientoPorcentaje: number;
}

export function calcularKPIs(
  procesos: ProcesoOnboarding[],
  auditLogs: { procesoId: string; accion: string; fecha: string; etapa?: number }[]
): KPILicenciamiento {
  const completados = procesos.filter(p => p.estado === 'aprobado');
  const rechazados = procesos.filter(p => p.estado === 'rechazado');
  const activos = procesos.filter(p => p.estado === 'en_progreso');

  // Tiempo promedio de subsanación (tiempo entre "rechazado documento" → "resubido")
  const tiemposSubsanacion: number[] = [];
  const subsanaciones = auditLogs.filter(l => l.accion === 'subsanacion_completada');
  const rechazosDoc = auditLogs.filter(l => l.accion === 'documento_rechazado');

  for (const sub of subsanaciones) {
    const rechazo = rechazosDoc.find(r => r.procesoId === sub.procesoId && r.etapa === sub.etapa);
    if (rechazo) {
      const diff = new Date(sub.fecha).getTime() - new Date(rechazo.fecha).getTime();
      tiemposSubsanacion.push(diff / (1000 * 60 * 60));
    }
  }

  const tiempoPromedioSubsanacion = tiemposSubsanacion.length > 0
    ? tiemposSubsanacion.reduce((a, b) => a + b, 0) / tiemposSubsanacion.length
    : 0;

  // % Expedientes aceptados sin prevención (primera vez)
  const sinPrevencion = completados.filter(p => {
    const rechazosDelProceso = auditLogs.filter(l => l.procesoId === p.id && l.accion === 'documento_rechazado');
    return rechazosDelProceso.length === 0;
  });

  const porcentajeAceptadosSinPrevencion = completados.length > 0
    ? (sinPrevencion.length / completados.length) * 100
    : 0;

  // Tiempo promedio total (creación → aprobación)
  const tiemposTotal = completados.map(p => {
    const diff = new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime();
    return diff / (1000 * 60 * 60 * 24);
  });
  const tiempoPromedioTotal = tiemposTotal.length > 0
    ? tiemposTotal.reduce((a, b) => a + b, 0) / tiemposTotal.length
    : 0;

  // SLA Cumplimiento
  let slaCumplido = 0;
  let slaTotal = 0;
  for (const p of procesos) {
    for (const [etapaStr, timestamp] of Object.entries(p.slaTimestamps)) {
      const etapaId = parseInt(etapaStr);
      const etapa = ETAPAS_SOP[etapaId];
      if (etapa && etapaId < p.etapaActual) {
        slaTotal++;
        const inicio = new Date(timestamp).getTime();
        const nextTimestamp = p.slaTimestamps[etapaId + 1];
        if (nextTimestamp) {
          const duracion = (new Date(nextTimestamp).getTime() - inicio) / (1000 * 60 * 60);
          if (duracion <= etapa.slaHoras) slaCumplido++;
        }
      }
    }
  }

  return {
    tiempoPromedioSubsanacionHoras: Math.round(tiempoPromedioSubsanacion * 10) / 10,
    porcentajeAceptadosSinPrevencion: Math.round(porcentajeAceptadosSinPrevencion * 10) / 10,
    totalProcesos: procesos.length,
    procesosActivos: activos.length,
    procesosCompletados: completados.length,
    procesosRechazados: rechazados.length,
    tiempoPromedioTotalDias: Math.round(tiempoPromedioTotal * 10) / 10,
    tasaAprobacion: procesos.length > 0 ? Math.round((completados.length / procesos.length) * 1000) / 10 : 0,
    documentosConRevisionManual: 0,
    slaCumplimientoPorcentaje: slaTotal > 0 ? Math.round((slaCumplido / slaTotal) * 1000) / 10 : 100,
  };
}
