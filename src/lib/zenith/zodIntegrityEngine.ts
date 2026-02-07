/**
 * ZOD INTEGRITY ENGINE
 * Motor de validación e integridad de datos
 * Guardián implacable — Precisión 0% de error
 */

import CryptoJS from 'crypto-js';
import { ZodVerdict } from '@/components/zenith/ZodIntegrityModal';
import { ConfigService } from '@/lib/config/ConfigService';
import { calcularHonorarioCorredor } from '@/lib/financiero/honorariosCorredor';

/**
 * Genera un hash SHA-256 para firma de integridad
 */
function generarSelloInexpugnabilidad(data: string): string {
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
}

/**
 * Valida discrepancia de peso (declarado vs pesado)
 */
export function validarDiscrepanciaPeso(
  pesoDeclarado: number,
  pesoPesado: number,
  toleranciaPorcentaje: number = 5
): ZodVerdict | null {
  if (pesoDeclarado <= 0 || pesoPesado <= 0) return null;

  const diferencia = Math.abs(pesoDeclarado - pesoPesado);
  const porcentaje = (diferencia / pesoDeclarado) * 100;

  if (porcentaje > toleranciaPorcentaje) {
    const hashData = `peso:${pesoDeclarado}:${pesoPesado}:${Date.now()}`;
    return {
      bloqueado: true,
      tipo: 'peso',
      titulo: 'Discrepancia de Peso Detectada',
      descripcion: `La diferencia entre el peso declarado (${pesoDeclarado.toFixed(2)} LB) y el peso verificado (${pesoPesado.toFixed(2)} LB) excede la tolerancia del ${toleranciaPorcentaje}%.`,
      detalles: [
        `Peso declarado: ${pesoDeclarado.toFixed(2)} LB`,
        `Peso verificado: ${pesoPesado.toFixed(2)} LB`,
        `Diferencia: ${diferencia.toFixed(2)} LB (${porcentaje.toFixed(1)}%)`,
        `Tolerancia máxima: ${toleranciaPorcentaje}%`,
      ],
      accionRequerida: 'Corrija el peso declarado o solicite una nueva verificación de peso antes de continuar.',
      hashVerificacion: generarSelloInexpugnabilidad(hashData),
    };
  }

  return null;
}

/**
 * Valida la correcta aplicación de honorarios (Res. 222)
 */
export function validarHonorariosRes222(
  valorCIF: number,
  honorarioAplicado: number
): ZodVerdict | null {
  const honorarioCorrecto = calcularHonorarioCorredor(valorCIF);
  const diferencia = Math.abs(honorarioAplicado - honorarioCorrecto.honorarioBase);

  if (diferencia > 0.01) {
    const hashData = `honorarios:${valorCIF}:${honorarioAplicado}:${honorarioCorrecto.honorarioBase}:${Date.now()}`;
    return {
      bloqueado: true,
      tipo: 'honorarios',
      titulo: 'Error en Honorarios del Corredor (Res. 222/2025)',
      descripcion: `El honorario aplicado ($${honorarioAplicado.toFixed(2)}) no coincide con el cálculo oficial ($${honorarioCorrecto.honorarioBase.toFixed(2)}).`,
      detalles: [
        `Valor CIF: $${valorCIF.toFixed(2)}`,
        `Método correcto: ${honorarioCorrecto.formulaAplicada}`,
        `Honorario correcto: $${honorarioCorrecto.honorarioBase.toFixed(2)}`,
        `Honorario aplicado: $${honorarioAplicado.toFixed(2)}`,
        `Diferencia: $${diferencia.toFixed(2)}`,
      ],
      accionRequerida: 'El sistema corregirá automáticamente el honorario al valor oficial.',
      hashVerificacion: generarSelloInexpugnabilidad(hashData),
    };
  }

  return null;
}

/**
 * Valida cumplimiento general antes de exportar
 */
export function validarCumplimientoExportacion(params: {
  totalPaquetes: number;
  paquetesConErrores: number;
  paquetesRestringidosSinPermiso: number;
  pesoVerificado: boolean;
}): ZodVerdict | null {
  const problemas: string[] = [];

  if (params.paquetesConErrores > 0) {
    problemas.push(`${params.paquetesConErrores} paquetes con errores de validación`);
  }

  if (params.paquetesRestringidosSinPermiso > 0) {
    problemas.push(`${params.paquetesRestringidosSinPermiso} paquetes restringidos sin permiso sanitario`);
  }

  if (problemas.length > 0) {
    const hashData = `cumplimiento:${params.totalPaquetes}:${problemas.length}:${Date.now()}`;
    return {
      bloqueado: problemas.length >= 2,
      tipo: 'cumplimiento',
      titulo: 'Verificación de Cumplimiento Incompleta',
      descripcion: 'Se detectaron incidencias que requieren atención antes de proceder con la exportación.',
      detalles: problemas,
      accionRequerida: 'Resuelva todas las incidencias marcadas antes de generar el reporte oficial.',
      hashVerificacion: generarSelloInexpugnabilidad(hashData),
    };
  }

  return null;
}

/**
 * Genera la firma de auditoría para logs con Veredicto de Zod
 */
export function generarVeredictoCadena(accion: string, operador: string, timestamp: string): string {
  const contenido = `${accion}|${operador}|${timestamp}`;
  const hash = generarSelloInexpugnabilidad(contenido);
  return `[ZOD-VERIFIED] ${accion} | Op: ${operador} | T: ${timestamp} | Sello: ${hash.substring(0, 16)}`;
}

/**
 * Genera el sello completo para exportación Excel
 */
export function generarSelloZenithExportacion(
  mawb: string,
  totalPaquetes: number,
  valorCIF: number,
  timestamp: string
): {
  certificacion: string;
  selloHash: string;
  selloCompleto: string;
} {
  const contenido = `ZENITH:${mawb}:${totalPaquetes}:${valorCIF.toFixed(2)}:${timestamp}`;
  const hash = generarSelloInexpugnabilidad(contenido);

  return {
    certificacion: 'Certificación ZENITH: Auditado por Stella Help | Verificado por Zod Integrity Engine',
    selloHash: hash,
    selloCompleto: `Sello de Inexpugnabilidad: SHA-256 ${hash}`,
  };
}

/**
 * Validar integridad de sellos/precintos (OEA)
 */
export function validarIntegridadSellos(params: {
  selloDeclarado: string;
  selloRecibido: string;
  mawb: string;
  guia: string;
}): ZodVerdict | null {
  const declarado = params.selloDeclarado.trim().toUpperCase();
  const recibido = params.selloRecibido.trim().toUpperCase();

  if (declarado && recibido && declarado !== recibido) {
    const hashData = `sello:${declarado}:${recibido}:${params.mawb}:${Date.now()}`;
    return {
      bloqueado: true,
      tipo: 'cumplimiento',
      titulo: 'Discrepancia de Sellos/Precintos (OEA)',
      descripcion: `El sello declarado no coincide con el sello recibido físicamente. Protocolo BASC requiere verificación inmediata.`,
      detalles: [
        `MAWB: ${params.mawb}`,
        `Guía: ${params.guia}`,
        `Sello declarado: ${declarado}`,
        `Sello recibido: ${recibido}`,
        'Posible contaminación de carga — Cadena de custodia comprometida',
      ],
      accionRequerida: 'Detener liquidación. Verificar integridad física de la carga e informar al Oficial de Seguridad BASC.',
      hashVerificacion: generarSelloInexpugnabilidad(hashData),
    };
  }

  return null;
}

/**
 * Validar asociado de negocio (BASC debida diligencia)
 */
export function validarAsociadoNegocio(params: {
  nombre: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'suspendido' | 'vencido';
  puntuacionRiesgo: number;
}): ZodVerdict | null {
  if (params.estado === 'rechazado' || params.estado === 'suspendido') {
    const hashData = `asociado:${params.nombre}:${params.estado}:${Date.now()}`;
    return {
      bloqueado: true,
      tipo: 'cumplimiento',
      titulo: 'Asociado de Negocio Bloqueado (BASC)',
      descripcion: `El asociado "${params.nombre}" tiene estado "${params.estado}" en el sistema de debida diligencia. Todo despacho asociado queda denegado.`,
      detalles: [
        `Asociado: ${params.nombre}`,
        `Estado: ${params.estado.toUpperCase()}`,
        `Puntuación de riesgo: ${params.puntuacionRiesgo}/100`,
        params.estado === 'rechazado' 
          ? 'Posible coincidencia en listas restrictivas (OFAC/ONU)'
          : 'Documentación vencida o incompleta',
      ],
      accionRequerida: 'Contactar al Oficial de Cumplimiento BASC. No se permite ningún despacho hasta resolución.',
      hashVerificacion: generarSelloInexpugnabilidad(hashData),
    };
  }

  if (params.estado === 'vencido') {
    const hashData = `asociado_vencido:${params.nombre}:${Date.now()}`;
    return {
      bloqueado: false,
      tipo: 'cumplimiento',
      titulo: 'Documentación de Asociado Vencida',
      descripcion: `La documentación del asociado "${params.nombre}" está vencida. Se recomienda actualizar antes de continuar.`,
      detalles: [
        `Asociado: ${params.nombre}`,
        'Estado: DOCUMENTACIÓN VENCIDA',
        'Se permite continuar bajo responsabilidad del corredor',
      ],
      accionRequerida: 'Solicitar actualización de documentos al asociado de negocio.',
      hashVerificacion: generarSelloInexpugnabilidad(hashData),
    };
  }

  return null;
}

/**
 * Validar modificación de valor CIF post-validación (BASC)
 */
export function validarModificacionPostValidacion(params: {
  campo: string;
  valorOriginal: number | string;
  valorNuevo: number | string;
  liquidacionId: string;
}): ZodVerdict {
  const hashData = `post_val:${params.campo}:${params.valorOriginal}:${params.valorNuevo}:${Date.now()}`;
  return {
    bloqueado: true,
    tipo: 'cumplimiento',
    titulo: 'Modificación Post-Validación Denegada (BASC)',
    descripcion: `Se intentó modificar "${params.campo}" después de la validación inicial. Protocolo BASC prohíbe cambios post-firma sin autorización del Oficial de Seguridad.`,
    detalles: [
      `Campo: ${params.campo}`,
      `Valor original: ${params.valorOriginal}`,
      `Valor intentado: ${params.valorNuevo}`,
      `Liquidación: ${params.liquidacionId}`,
      'Acción denegada por protocolo BASC. Registrando incidente en Log inmutable.',
    ],
    accionRequerida: 'Este evento ha sido registrado. Para modificaciones post-firma, utilice el proceso de Rectificación Voluntaria.',
    hashVerificacion: generarSelloInexpugnabilidad(hashData),
  };
}