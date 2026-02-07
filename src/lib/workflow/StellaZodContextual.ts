// ============================================
// STELLA & ZOD — Mensajería Contextual por Rol
// Stella = Entrenadora del Operador
// Zod = Filtro Profesional del Corredor
// ============================================

import { AppRole } from '@/contexts/AuthContext';
import { EstadoExpediente, ResumenAuditoriaZod, HallazgoZod } from './MotorPreparacionValidacion';

// Mensajes de Stella según rol y contexto
export interface MensajeStella {
  id: string;
  texto: string;
  tipo: 'instruccion' | 'validacion' | 'alerta' | 'celebracion' | 'guia';
  prioridad: 'baja' | 'media' | 'alta';
}

// Informe de confianza de Zod para el corredor
export interface InformeConfianzaZod {
  porcentajeValidado: number;
  resumen: string;
  puntosCriticos: PuntoCriticoZod[];
  recomendacion: string;
  selloHash: string;
}

export interface PuntoCriticoZod {
  area: string;
  estado: 'validado' | 'duda' | 'bloqueado';
  detalle: string;
  requiereCriterio: boolean;
}

/**
 * Genera mensajes de Stella según el rol del usuario
 */
export function generarMensajesStella(
  rol: AppRole | null,
  estado: EstadoExpediente,
  contexto: {
    totalItems?: number;
    itemsPendientes?: number;
    erroresDetectados?: number;
    permisosPendientes?: number;
    valorCIF?: number;
    tieneRegistroSanitario?: boolean;
  }
): MensajeStella[] {
  const mensajes: MensajeStella[] = [];

  // === STELLA PARA OPERADOR (Entrenadora) ===
  if (rol === 'operador') {
    if (estado === 'borrador') {
      if (!contexto.totalItems || contexto.totalItems === 0) {
        mensajes.push({
          id: 'stella-op-inicio',
          texto: 'Comencemos con la carga del manifiesto. Sube el archivo Excel y yo me encargo de la detección automática de columnas. Tú verificas que todo esté correcto.',
          tipo: 'instruccion',
          prioridad: 'alta',
        });
      }

      if (contexto.itemsPendientes && contexto.itemsPendientes > 0) {
        mensajes.push({
          id: 'stella-op-pendientes',
          texto: `Tienes ${contexto.itemsPendientes} ítems sin clasificar. He preparado sugerencias de partida arancelaria basadas en la descripción. Revísalas y confirma antes de enviar al Corredor.`,
          tipo: 'instruccion',
          prioridad: 'alta',
        });
      }

      if (contexto.permisosPendientes && contexto.permisosPendientes > 0) {
        mensajes.push({
          id: 'stella-op-permisos',
          texto: `Hay ${contexto.permisosPendientes} ítems que requieren permiso de órgano anuente (MINSA/MIDA/AUPSA). Asegúrate de verificar el registro sanitario antes de enviar a revisión.`,
          tipo: 'alerta',
          prioridad: 'alta',
        });
      }

      if (contexto.valorCIF && contexto.valorCIF > 0) {
        mensajes.push({
          id: 'stella-op-cif',
          texto: `He preparado el cálculo de impuestos basado en la factura. Valor CIF estimado: $${contexto.valorCIF.toFixed(2)}. Verifica que los montos coincidan con la documentación original.`,
          tipo: 'validacion',
          prioridad: 'media',
        });
      }

      if (contexto.erroresDetectados && contexto.erroresDetectados > 0) {
        mensajes.push({
          id: 'stella-op-errores',
          texto: `Zod detectó ${contexto.erroresDetectados} discrepancias que debes corregir antes de enviar a revisión. Haz clic en cada alerta para ver los detalles y cómo resolverlo.`,
          tipo: 'alerta',
          prioridad: 'alta',
        });
      }
    }

    if (estado === 'requiere_correccion') {
      mensajes.push({
        id: 'stella-op-correccion',
        texto: 'El Corredor devolvió el expediente con observaciones. Revisa los comentarios del Veredicto Profesional, aplica las correcciones y reenvía cuando estés listo.',
        tipo: 'instruccion',
        prioridad: 'alta',
      });
    }

    if (estado === 'listo_para_revision') {
      mensajes.push({
        id: 'stella-op-enviado',
        texto: '¡Excelente trabajo! El expediente fue enviado al Corredor para su Veredicto Profesional. Te notificaré cuando haya una respuesta.',
        tipo: 'celebracion',
        prioridad: 'baja',
      });
    }
  }

  // === STELLA PARA CORREDOR (Enlace Proactivo) ===
  if (rol === 'revisor' || rol === 'admin') {
    if (estado === 'listo_para_revision') {
      mensajes.push({
        id: 'stella-cor-nuevo',
        texto: 'Tiene un expediente pendiente de su Veredicto Profesional. Zod ya completó la auditoría preliminar. Revise el Informe de Confianza de Datos para los puntos que requieren su criterio.',
        tipo: 'guia',
        prioridad: 'alta',
      });
    }

    if (estado === 'en_revision') {
      mensajes.push({
        id: 'stella-cor-revision',
        texto: 'Está revisando el expediente. Los puntos marcados en amarillo requieren su criterio profesional. Los puntos en verde fueron validados con alta confianza por Zod.',
        tipo: 'guia',
        prioridad: 'media',
      });
    }

    if (estado === 'aprobado') {
      mensajes.push({
        id: 'stella-cor-firma',
        texto: 'Expediente aprobado. Proceda con la Firma Digital Calificada para autorizar la transmisión oficial a la Autoridad Nacional de Aduanas.',
        tipo: 'instruccion',
        prioridad: 'alta',
      });
    }
  }

  return mensajes;
}

/**
 * Genera el informe de confianza de Zod para el corredor
 */
export function generarInformeConfianzaZod(
  resumen: ResumenAuditoriaZod
): InformeConfianzaZod {
  const puntosCriticos: PuntoCriticoZod[] = [];

  // Clasificar hallazgos en puntos críticos por área
  const areas = new Map<string, HallazgoZod[]>();
  resumen.hallazgos.forEach(h => {
    const key = h.tipo;
    if (!areas.has(key)) areas.set(key, []);
    areas.get(key)!.push(h);
  });

  const AREA_LABELS: Record<string, string> = {
    valoracion: 'Valoración Aduanera',
    clasificacion: 'Clasificación Arancelaria',
    permisos: 'Permisos y Órganos Anuentes',
    peso: 'Verificación de Pesos',
    origen: 'País de Origen / TLC',
    gs1: 'Integridad GS1 (GTIN/GLN)',
  };

  // Si no hay hallazgos en un área, marcarla como validada
  ['valoracion', 'clasificacion', 'permisos', 'peso', 'origen'].forEach(area => {
    const hallazgos = areas.get(area) || [];
    
    if (hallazgos.length === 0) {
      puntosCriticos.push({
        area: AREA_LABELS[area] || area,
        estado: 'validado',
        detalle: 'Sin discrepancias detectadas',
        requiereCriterio: false,
      });
    } else {
      const tieneCriticos = hallazgos.some(h => h.severidad === 'critico');
      const tieneAdvertencias = hallazgos.some(h => h.severidad === 'advertencia');
      
      puntosCriticos.push({
        area: AREA_LABELS[area] || area,
        estado: tieneCriticos ? 'bloqueado' : tieneAdvertencias ? 'duda' : 'validado',
        detalle: hallazgos.map(h => h.titulo).join('; '),
        requiereCriterio: hallazgos.some(h => h.requiereCriterio),
      });
    }
  });

  // Generar recomendación
  let recomendacion: string;
  if (resumen.recomendacion === 'aprobar') {
    recomendacion = `He validado el ${resumen.confianzaGeneral}% de este expediente. Todos los ítems pasaron las verificaciones de integridad. Recomiendo proceder con la aprobación.`;
  } else if (resumen.recomendacion === 'revisar_parcial') {
    recomendacion = `He validado el ${resumen.confianzaGeneral}% de este expediente. Detecté ${resumen.itemsConDuda} punto(s) que requieren su criterio profesional. Los demás ítems están en orden.`;
  } else {
    recomendacion = `He validado el ${resumen.confianzaGeneral}% de este expediente. Detecté ${resumen.itemsBloqueados} error(es) crítico(s) que impiden la aprobación. Recomiendo devolver al operador para corrección.`;
  }

  const selloData = `zod-informe:${resumen.confianzaGeneral}:${resumen.totalItems}:${Date.now()}`;
  const selloHash = Array.from(
    new Uint8Array(new TextEncoder().encode(selloData))
  ).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);

  return {
    porcentajeValidado: resumen.confianzaGeneral,
    resumen: recomendacion,
    puntosCriticos,
    recomendacion,
    selloHash: `ZOD-${selloHash.toUpperCase()}`,
  };
}

/**
 * Mensaje de bloqueo de transmisión para operadores
 */
export function mensajeBloqueaTransmision(): MensajeStella {
  return {
    id: 'zod-bloqueo-transmision',
    texto: 'La transmisión a la Autoridad Nacional de Aduanas requiere la Firma Digital Calificada exclusiva del Corredor de Aduana. Esta función no está disponible para el rol de Operador.',
    tipo: 'alerta',
    prioridad: 'alta',
  };
}
