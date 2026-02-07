// ============================================
// VALIDADOR GS1 — ZENITH
// Checksum GTIN-13/14 y GLN-13
// Integrado con Zod Integrity Engine
// ============================================

import CryptoJS from 'crypto-js';
import { ZodVerdict } from '@/components/zenith/ZodIntegrityModal';
import { devLog } from '@/lib/logger';

// ============ TIPOS ============

export interface ResultadoValidacionGS1 {
  valido: boolean;
  tipo: 'GTIN-13' | 'GTIN-14' | 'GLN-13' | 'desconocido';
  codigo: string;
  digitoVerificacionCalculado: string;
  digitoVerificacionRecibido: string;
  errores: string[];
  paisOrigen?: string;
  prefijoPais?: string;
}

export interface GLNInfo {
  codigo: string;
  valido: boolean;
  prefijoPais?: string;
  paisOrigen?: string;
  codigoEmpresa?: string;
  codigoUbicacion?: string;
  digitoVerificacion: string;
  recintoMapeado?: string;
  nombreRecinto?: string;
}

// ============ MAPEO GLN → RECINTOS ADUANEROS PANAMÁ ============

const GLN_RECINTOS_PANAMA: Record<string, { nombre: string; recintoId: string }> = {
  '7450000100': { nombre: 'Aeropuerto Intl. de Tocumen — Terminal de Carga', recintoId: 'PTY_CARGA' },
  '7450000200': { nombre: 'Puerto de Balboa', recintoId: 'BALBOA' },
  '7450000300': { nombre: 'Puerto Cristóbal — Colón', recintoId: 'CRISTOBAL' },
  '7450000400': { nombre: 'MIT — Manzanillo International Terminal', recintoId: 'MIT' },
  '7450000500': { nombre: 'Zona Libre de Colón', recintoId: 'ZLC' },
  '7450000600': { nombre: 'Paso Canoas — Frontera CR', recintoId: 'PASO_CANOAS' },
  '7450000700': { nombre: 'Guabito — Frontera CR', recintoId: 'GUABITO' },
  '7450000800': { nombre: 'PSA Panamá (Rodman)', recintoId: 'PSA_RODMAN' },
  '7450000900': { nombre: 'Panamá Pacífico', recintoId: 'PPAC' },
  '7450001000': { nombre: 'CCT — Colón Container Terminal', recintoId: 'CCT' },
  '7450001100': { nombre: 'Puerto de Vacamonte', recintoId: 'VACAMONTE' },
  '7450001200': { nombre: 'Terminal de Couriers — Tocumen', recintoId: 'COURIERS' },
};

// ============ ALGORITMO GS1 CHECKSUM ============

/**
 * Calcula el dígito de verificación GS1 (módulo 10, pesos alternados 1-3)
 * Aplica a GTIN-8, GTIN-12, GTIN-13, GTIN-14 y GLN-13
 */
export function calcularChecksumGS1(digitos: string): string {
  const nums = digitos.replace(/\D/g, '');
  if (nums.length < 1) return '';

  // Los dígitos se procesan de derecha a izquierda, alternando peso 3 y 1
  // Pero como estamos sin el dígito check, lo procesamos normalmente
  let suma = 0;
  const longitud = nums.length;
  
  for (let i = 0; i < longitud; i++) {
    const digito = parseInt(nums[i], 10);
    // Posiciones desde la derecha: impares ×3, pares ×1
    // Cuando contamos desde la izquierda en un string de N dígitos:
    // La posición (N-1-i) desde la derecha
    const posDesdeDerechaBase0 = longitud - 1 - i;
    // Posición 0 (última) = ×3, posición 1 = ×1, posición 2 = ×3...
    suma += digito * (posDesdeDerechaBase0 % 2 === 0 ? 3 : 1);
  }

  const resto = suma % 10;
  return resto === 0 ? '0' : String(10 - resto);
}

// ============ VALIDADORES ============

/**
 * Valida un GTIN-13 (EAN-13)
 */
export function validarGTIN13(codigo: string): ResultadoValidacionGS1 {
  const limpio = codigo.replace(/\D/g, '');
  const errores: string[] = [];

  if (limpio.length !== 13) {
    errores.push(`GTIN-13 requiere exactamente 13 dígitos, recibido: ${limpio.length}`);
    return { valido: false, tipo: 'GTIN-13', codigo, digitoVerificacionCalculado: '', digitoVerificacionRecibido: '', errores };
  }

  const sinCheck = limpio.slice(0, 12);
  const checkRecibido = limpio[12];
  const checkCalculado = calcularChecksumGS1(sinCheck);

  if (checkRecibido !== checkCalculado) {
    errores.push(`Dígito de verificación inválido: esperado ${checkCalculado}, recibido ${checkRecibido}`);
  }

  const prefijo = limpio.substring(0, 3);
  const paisInfo = obtenerPaisPorPrefijo(prefijo);

  return {
    valido: errores.length === 0,
    tipo: 'GTIN-13',
    codigo: limpio,
    digitoVerificacionCalculado: checkCalculado,
    digitoVerificacionRecibido: checkRecibido,
    errores,
    paisOrigen: paisInfo?.pais,
    prefijoPais: prefijo,
  };
}

/**
 * Valida un GTIN-14
 */
export function validarGTIN14(codigo: string): ResultadoValidacionGS1 {
  const limpio = codigo.replace(/\D/g, '');
  const errores: string[] = [];

  if (limpio.length !== 14) {
    errores.push(`GTIN-14 requiere exactamente 14 dígitos, recibido: ${limpio.length}`);
    return { valido: false, tipo: 'GTIN-14', codigo, digitoVerificacionCalculado: '', digitoVerificacionRecibido: '', errores };
  }

  const sinCheck = limpio.slice(0, 13);
  const checkRecibido = limpio[13];
  const checkCalculado = calcularChecksumGS1(sinCheck);

  if (checkRecibido !== checkCalculado) {
    errores.push(`Dígito de verificación inválido: esperado ${checkCalculado}, recibido ${checkRecibido}`);
  }

  const prefijo = limpio.substring(1, 4); // Skip packaging indicator
  const paisInfo = obtenerPaisPorPrefijo(prefijo);

  return {
    valido: errores.length === 0,
    tipo: 'GTIN-14',
    codigo: limpio,
    digitoVerificacionCalculado: checkCalculado,
    digitoVerificacionRecibido: checkRecibido,
    errores,
    paisOrigen: paisInfo?.pais,
    prefijoPais: prefijo,
  };
}

/**
 * Valida un GLN-13 (Global Location Number)
 */
export function validarGLN13(codigo: string): ResultadoValidacionGS1 {
  const limpio = codigo.replace(/\D/g, '');
  const errores: string[] = [];

  if (limpio.length !== 13) {
    errores.push(`GLN-13 requiere exactamente 13 dígitos, recibido: ${limpio.length}`);
    return { valido: false, tipo: 'GLN-13', codigo, digitoVerificacionCalculado: '', digitoVerificacionRecibido: '', errores };
  }

  const sinCheck = limpio.slice(0, 12);
  const checkRecibido = limpio[12];
  const checkCalculado = calcularChecksumGS1(sinCheck);

  if (checkRecibido !== checkCalculado) {
    errores.push(`Dígito de verificación inválido: esperado ${checkCalculado}, recibido ${checkRecibido}`);
  }

  const prefijo = limpio.substring(0, 3);
  const paisInfo = obtenerPaisPorPrefijo(prefijo);

  return {
    valido: errores.length === 0,
    tipo: 'GLN-13',
    codigo: limpio,
    digitoVerificacionCalculado: checkCalculado,
    digitoVerificacionRecibido: checkRecibido,
    errores,
    paisOrigen: paisInfo?.pais,
    prefijoPais: prefijo,
  };
}

/**
 * Auto-detecta tipo y valida cualquier código GS1
 */
export function validarCodigoGS1(codigo: string): ResultadoValidacionGS1 {
  const limpio = codigo.replace(/\D/g, '');

  if (limpio.length === 14) return validarGTIN14(limpio);
  if (limpio.length === 13) return validarGTIN13(limpio); // Also covers GLN-13 checksum
  return {
    valido: false,
    tipo: 'desconocido',
    codigo: limpio,
    digitoVerificacionCalculado: '',
    digitoVerificacionRecibido: '',
    errores: [`Longitud no reconocida: ${limpio.length} dígitos. Se esperan 13 (GTIN-13/GLN-13) o 14 (GTIN-14).`],
  };
}

// ============ ZOD INTEGRATION ============

/**
 * Genera un ZodVerdict de bloqueo para un código GS1 inválido
 */
export function zodValidarIdentificadorGS1(
  codigo: string,
  campo: 'GTIN' | 'GLN',
  guia?: string
): ZodVerdict | null {
  const resultado = campo === 'GLN' ? validarGLN13(codigo) : validarCodigoGS1(codigo);

  if (resultado.valido) return null;

  const hashData = `gs1:${campo}:${codigo}:${Date.now()}`;
  return {
    bloqueado: true,
    tipo: 'cumplimiento',
    titulo: `Formato de identificación global inválido (${campo})`,
    descripcion: `El código ${campo} "${codigo}" no cumple con el estándar GS1. El registro queda bloqueado hasta corrección.`,
    detalles: [
      `Código: ${codigo}`,
      `Tipo detectado: ${resultado.tipo}`,
      ...resultado.errores,
      ...(guia ? [`Guía: ${guia}`] : []),
      `Estándar: GS1 General Specifications v24.0`,
    ],
    accionRequerida: `Corrija el código ${campo} o solicite uno válido al proveedor. Consulte gs1.org/verify para verificación.`,
    hashVerificacion: CryptoJS.SHA256(hashData).toString(CryptoJS.enc.Hex),
  };
}

// ============ GLN → RECINTO MAPPING (STELLA) ============

/**
 * Mapea un GLN al recinto aduanero correspondiente en Panamá
 */
export function mapearGLNaRecinto(gln: string): GLNInfo {
  const validacion = validarGLN13(gln);
  const limpio = gln.replace(/\D/g, '');

  const info: GLNInfo = {
    codigo: limpio,
    valido: validacion.valido,
    prefijoPais: validacion.prefijoPais,
    paisOrigen: validacion.paisOrigen,
    codigoEmpresa: limpio.substring(3, 10),
    codigoUbicacion: limpio.substring(10, 12),
    digitoVerificacion: limpio[12] || '',
  };

  // Search GLN mapping
  const prefijoGLN = limpio.substring(0, 10);
  const recintoMatch = GLN_RECINTOS_PANAMA[prefijoGLN];
  if (recintoMatch) {
    info.recintoMapeado = recintoMatch.recintoId;
    info.nombreRecinto = recintoMatch.nombre;
  }

  devLog(`[GS1] GLN ${limpio} → Recinto: ${info.nombreRecinto || 'No mapeado'}`);
  return info;
}

// ============ UTILIDADES ============

function obtenerPaisPorPrefijo(prefijo: string): { pais: string } | null {
  const num = parseInt(prefijo, 10);
  const RANGOS: [number, number, string][] = [
    [0, 19, 'Estados Unidos / Canadá'],
    [30, 39, 'Francia'],
    [40, 44, 'Alemania'],
    [45, 49, 'Japón'],
    [50, 50, 'Reino Unido'],
    [57, 57, 'Dinamarca'],
    [59, 59, 'Polonia'],
    [60, 60, 'Sudáfrica'],
    [64, 64, 'Finlandia'],
    [69, 69, 'China'],
    [70, 70, 'Noruega'],
    [73, 73, 'Suecia'],
    [740, 740, 'Guatemala'],
    [741, 741, 'El Salvador'],
    [742, 742, 'Honduras'],
    [743, 743, 'Nicaragua'],
    [744, 744, 'Costa Rica'],
    [745, 745, 'Panamá'],
    [746, 746, 'República Dominicana'],
    [750, 750, 'México'],
    [76, 76, 'Suiza'],
    [770, 771, 'Colombia'],
    [773, 773, 'Uruguay'],
    [775, 775, 'Perú'],
    [778, 779, 'Argentina'],
    [780, 780, 'Chile'],
    [786, 786, 'Ecuador'],
    [789, 790, 'Brasil'],
    [80, 83, 'Italia'],
    [84, 84, 'España'],
    [858, 858, 'Eslovaquia'],
    [859, 859, 'República Checa'],
    [860, 860, 'Serbia'],
    [868, 869, 'Turquía'],
    [87, 87, 'Países Bajos'],
    [880, 880, 'Corea del Sur'],
    [885, 885, 'Tailandia'],
    [888, 888, 'Singapur'],
    [890, 890, 'India'],
    [899, 899, 'Indonesia'],
    [90, 91, 'Austria'],
    [93, 93, 'Australia'],
    [94, 94, 'Nueva Zelanda'],
    [955, 955, 'Malasia'],
  ];

  for (const [inicio, fin, pais] of RANGOS) {
    // Handle 3-digit ranges
    if (inicio >= 100) {
      if (num >= inicio && num <= fin) return { pais };
    } else {
      // Handle 2-digit ranges (prefix of 3)
      const num2 = Math.floor(num / (inicio < 10 ? 100 : 10));
      const i2 = inicio < 10 ? inicio : Math.floor(inicio / 10);
      const f2 = fin < 10 ? fin : Math.floor(fin / 10);
      if (num2 >= i2 && num2 <= f2) return { pais };
    }
  }

  // Simple fallback for 3-digit exact matches
  const prefStr = prefijo.substring(0, 3);
  const exactMatches: Record<string, string> = {
    '745': 'Panamá', '744': 'Costa Rica', '743': 'Nicaragua',
    '742': 'Honduras', '741': 'El Salvador', '740': 'Guatemala',
    '750': 'México', '786': 'Ecuador', '780': 'Chile',
  };
  if (exactMatches[prefStr]) return { pais: exactMatches[prefStr] };

  return null;
}

export default {
  validarGTIN13,
  validarGTIN14,
  validarGLN13,
  validarCodigoGS1,
  zodValidarIdentificadorGS1,
  mapearGLNaRecinto,
  calcularChecksumGS1,
};
