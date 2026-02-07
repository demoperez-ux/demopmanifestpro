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