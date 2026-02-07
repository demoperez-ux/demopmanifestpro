// ============================================
// MOTOR DE FLUJO PREPARACIÓN-VALIDACIÓN (90/10)
// Gestión del ciclo: Borrador → Listo para Revisión → Aprobado → Transmitido
// ============================================

import { AppRole } from '@/contexts/AuthContext';

// Estados del expediente en el flujo 90/10
export type EstadoExpediente = 
  | 'borrador'              // Operador trabajando (90%)
  | 'listo_para_revision'   // Operador completó, pendiente de corredor
  | 'en_revision'           // Corredor revisando
  | 'requiere_correccion'   // Corredor devolvió al operador
  | 'aprobado'              // Corredor aprobó
  | 'firmado'               // Corredor firmó digitalmente
  | 'transmitido';          // Enviado a ANA

// Transiciones válidas por rol
const TRANSICIONES_VALIDAS: Record<EstadoExpediente, { siguientes: EstadoExpediente[]; rolRequerido: AppRole[] }> = {
  borrador: {
    siguientes: ['listo_para_revision'],
    rolRequerido: ['operador', 'admin'],
  },
  listo_para_revision: {
    siguientes: ['en_revision'],
    rolRequerido: ['revisor', 'admin'],
  },
  en_revision: {
    siguientes: ['aprobado', 'requiere_correccion'],
    rolRequerido: ['revisor', 'admin'],
  },
  requiere_correccion: {
    siguientes: ['listo_para_revision'],
    rolRequerido: ['operador', 'admin'],
  },
  aprobado: {
    siguientes: ['firmado'],
    rolRequerido: ['revisor', 'admin'],
  },
  firmado: {
    siguientes: ['transmitido'],
    rolRequerido: ['revisor', 'admin'],
  },
  transmitido: {
    siguientes: [],
    rolRequerido: [],
  },
};

// Información de cada estado para UI
export const INFO_ESTADOS: Record<EstadoExpediente, {
  label: string;
  descripcion: string;
  fase: '90' | '10' | 'completado';
  color: string;
  icono: string;
}> = {
  borrador: {
    label: 'Borrador',
    descripcion: 'El operador está preparando el expediente',
    fase: '90',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    icono: '📝',
  },
  listo_para_revision: {
    label: 'Pendiente de Veredicto Profesional',
    descripcion: 'El expediente espera revisión del Corredor de Aduana',
    fase: '10',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    icono: '⏳',
  },
  en_revision: {
    label: 'En Revisión del Corredor',
    descripcion: 'El Corredor está auditando el expediente',
    fase: '10',
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    icono: '🔍',
  },
  requiere_correccion: {
    label: 'Requiere Corrección',
    descripcion: 'El Corredor devolvió el expediente al operador',
    fase: '90',
    color: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    icono: '🔄',
  },
  aprobado: {
    label: 'Aprobado por Corredor',
    descripcion: 'El Corredor aprobó — pendiente firma digital',
    fase: '10',
    color: 'bg-green-500/10 text-green-400 border-green-500/30',
    icono: '✅',
  },
  firmado: {
    label: 'Firmado Digitalmente',
    descripcion: 'Firma digital del Corredor registrada — listo para transmisión',
    fase: '10',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    icono: '🔏',
  },
  transmitido: {
    label: 'Transmitido a ANA',
    descripcion: 'Declaración enviada a la Autoridad Nacional de Aduanas',
    fase: 'completado',
    color: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    icono: '📡',
  },
};

// Resultado de validación de transición
export interface ResultadoTransicion {
  permitido: boolean;
  motivo?: string;
  estadoSiguiente?: EstadoExpediente;
}

// Resumen de auditoría de Zod para el corredor
export interface ResumenAuditoriaZod {
  confianzaGeneral: number; // 0-100
  totalItems: number;
  itemsValidados: number;
  itemsConDuda: number;
  itemsBloqueados: number;
  hallazgos: HallazgoZod[];
  recomendacion: 'aprobar' | 'revisar_parcial' | 'rechazar';
}

export interface HallazgoZod {
  id: string;
  tipo: 'valoracion' | 'clasificacion' | 'permisos' | 'peso' | 'origen' | 'gs1';
  severidad: 'info' | 'advertencia' | 'critico';
  titulo: string;
  descripcion: string;
  itemAfectado?: string;
  sugerencia?: string;
  requiereCriterio: boolean; // Requiere decisión profesional del corredor
}

/**
 * Valida si una transición de estado es permitida para el rol dado
 */
export function validarTransicion(
  estadoActual: EstadoExpediente,
  estadoDeseado: EstadoExpediente,
  rolUsuario: AppRole | null
): ResultadoTransicion {
  if (!rolUsuario) {
    return { permitido: false, motivo: 'Usuario sin rol asignado' };
  }

  const config = TRANSICIONES_VALIDAS[estadoActual];
  
  if (!config.siguientes.includes(estadoDeseado)) {
    return {
      permitido: false,
      motivo: `No se puede pasar de "${INFO_ESTADOS[estadoActual].label}" a "${INFO_ESTADOS[estadoDeseado].label}"`,
    };
  }

  if (!config.rolRequerido.includes(rolUsuario)) {
    const rolesPermitidos = config.rolRequerido.map(r => 
      r === 'operador' ? 'Operador (Analista)' : 'Corredor (Validador)'
    ).join(', ');
    
    return {
      permitido: false,
      motivo: `Esta acción requiere el rol de: ${rolesPermitidos}`,
    };
  }

  return { permitido: true, estadoSiguiente: estadoDeseado };
}

/**
 * Verifica si el expediente cumple requisitos mínimos para enviar a revisión
 */
export function validarListoParaRevision(params: {
  totalItems: number;
  itemsClasificados: number;
  valorCIFCalculado: boolean;
  permisosVerificados: boolean;
  pesosValidados: boolean;
}): { listo: boolean; faltantes: string[] } {
  const faltantes: string[] = [];

  if (params.totalItems === 0) {
    faltantes.push('No hay ítems en el expediente');
  }

  if (params.itemsClasificados < params.totalItems) {
    const pendientes = params.totalItems - params.itemsClasificados;
    faltantes.push(`${pendientes} ítem(s) sin clasificación arancelaria`);
  }

  if (!params.valorCIFCalculado) {
    faltantes.push('Valor CIF no calculado');
  }

  if (!params.permisosVerificados) {
    faltantes.push('Permisos de órganos anuentes no verificados');
  }

  if (!params.pesosValidados) {
    faltantes.push('Validación de pesos pendiente');
  }

  return {
    listo: faltantes.length === 0,
    faltantes,
  };
}

/**
 * Genera el resumen de auditoría de Zod para presentar al corredor
 */
export function generarResumenAuditoriaZod(params: {
  totalItems: number;
  itemsConErrores: number;
  itemsConAdvertencias: number;
  hallazgos: HallazgoZod[];
  confianzaPromedio: number;
}): ResumenAuditoriaZod {
  const itemsValidados = params.totalItems - params.itemsConErrores - params.itemsConAdvertencias;
  const confianza = Math.round(params.confianzaPromedio);

  let recomendacion: 'aprobar' | 'revisar_parcial' | 'rechazar';
  if (params.itemsConErrores > 0 || confianza < 70) {
    recomendacion = 'rechazar';
  } else if (params.itemsConAdvertencias > 0 || confianza < 90) {
    recomendacion = 'revisar_parcial';
  } else {
    recomendacion = 'aprobar';
  }

  return {
    confianzaGeneral: confianza,
    totalItems: params.totalItems,
    itemsValidados,
    itemsConDuda: params.itemsConAdvertencias,
    itemsBloqueados: params.itemsConErrores,
    hallazgos: params.hallazgos,
    recomendacion,
  };
}

/**
 * Determina las acciones disponibles según el rol y estado actual
 */
export function obtenerAccionesDisponibles(
  estado: EstadoExpediente,
  rol: AppRole | null
): { accion: string; estadoDestino: EstadoExpediente; label: string; variante: 'default' | 'destructive' | 'outline' }[] {
  if (!rol) return [];

  const acciones: { accion: string; estadoDestino: EstadoExpediente; label: string; variante: 'default' | 'destructive' | 'outline' }[] = [];

  // Operador (Analista) - Fase 90%
  if (rol === 'operador' || rol === 'admin') {
    if (estado === 'borrador') {
      acciones.push({
        accion: 'enviar_a_revision',
        estadoDestino: 'listo_para_revision',
        label: 'Enviar a Revisión del Corredor',
        variante: 'default',
      });
    }
    if (estado === 'requiere_correccion') {
      acciones.push({
        accion: 'reenviar_revision',
        estadoDestino: 'listo_para_revision',
        label: 'Reenviar a Revisión (Correcciones aplicadas)',
        variante: 'default',
      });
    }
  }

  // Corredor (Validador) - Fase 10%
  if (rol === 'revisor' || rol === 'admin') {
    if (estado === 'listo_para_revision') {
      acciones.push({
        accion: 'iniciar_revision',
        estadoDestino: 'en_revision',
        label: 'Iniciar Revisión',
        variante: 'default',
      });
    }
    if (estado === 'en_revision') {
      acciones.push({
        accion: 'aprobar',
        estadoDestino: 'aprobado',
        label: 'Aprobar Expediente',
        variante: 'default',
      });
      acciones.push({
        accion: 'devolver',
        estadoDestino: 'requiere_correccion',
        label: 'Devolver al Operador',
        variante: 'destructive',
      });
    }
    if (estado === 'aprobado') {
      acciones.push({
        accion: 'firmar',
        estadoDestino: 'firmado',
        label: 'Firmar Digitalmente (Corredor)',
        variante: 'default',
      });
    }
    if (estado === 'firmado') {
      acciones.push({
        accion: 'transmitir',
        estadoDestino: 'transmitido',
        label: 'Transmitir a ANA',
        variante: 'default',
      });
    }
  }

  return acciones;
}

/**
 * Verifica si un rol puede firmar digitalmente (solo corredor)
 */
export function puedeTransmitir(rol: AppRole | null): boolean {
  return rol === 'revisor' || rol === 'admin';
}

/**
 * Verifica si el usuario es operador (analista)
 */
export function esOperador(rol: AppRole | null): boolean {
  return rol === 'operador';
}

/**
 * Verifica si el usuario es corredor (validador)
 */
export function esCorredor(rol: AppRole | null): boolean {
  return rol === 'revisor' || rol === 'admin';
}
