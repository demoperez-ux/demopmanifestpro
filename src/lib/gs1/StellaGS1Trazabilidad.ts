// ============================================
// STELLA GS1 TRAZABILIDAD
// Auto-completado de HTS y restricciones por GTIN
// Mapeo GLN → Recinto Aduanero
// ============================================

import { supabase } from '@/integrations/supabase/client';
import { mapearGLNaRecinto, GLNInfo } from './ValidadorGS1';
import { validarGTIN, procesarGTIN, GTINInfo } from '@/lib/gtin/gtinProcessor';
import { devLog } from '@/lib/logger';

// ============ TIPOS ============

export interface GTINClasificacionCache {
  gtin: string;
  hsCode: string;
  descripcionArancelaria: string;
  autoridadAnuente?: string;
  restriccionesSalud: string[];
  paisOrigen?: string;
  ultimoUso: string;
}

export interface ResultadoTrazabilidadGTIN {
  gtin: string;
  encontrado: boolean;
  gtinInfo: GTINInfo;
  clasificacion?: GTINClasificacionCache;
  mensajeStella: string;
  autocompletado: boolean;
}

export interface ResultadoTrazabilidadGLN {
  gln: string;
  glnInfo: GLNInfo;
  recintoEncontrado: boolean;
  mensajeStella: string;
}

// ============ CACHE LOCAL DE GTIN → HTS ============

const cacheGTIN = new Map<string, GTINClasificacionCache>();

// ============ STELLA TRAZABILIDAD ============

/**
 * Busca clasificación HTS previa asociada a un GTIN
 * Si el GTIN fue clasificado antes, Stella autocompleta la partida arancelaria
 */
export async function buscarClasificacionPorGTIN(
  gtin: string
): Promise<ResultadoTrazabilidadGTIN> {
  const gtinInfo = procesarGTIN(gtin);

  if (!gtinInfo.valido) {
    return {
      gtin,
      encontrado: false,
      gtinInfo,
      mensajeStella: `Jefe, el GTIN ${gtin} tiene formato inválido (${gtinInfo.errores.join(', ')}). No puedo rastrear su historial.`,
      autocompletado: false,
    };
  }

  // Check local cache first
  const cached = cacheGTIN.get(gtinInfo.codigoNormalizado);
  if (cached) {
    devLog(`[Stella-GS1] GTIN ${gtin} encontrado en caché local`);
    return {
      gtin,
      encontrado: true,
      gtinInfo,
      clasificacion: cached,
      mensajeStella: `Jefe, este producto (GTIN ${gtin}) ya fue clasificado previamente como **${cached.hsCode}** — ${cached.descripcionArancelaria}. ${cached.restriccionesSalud.length > 0 ? `⚠️ Restricciones: ${cached.restriccionesSalud.join(', ')}` : '✅ Sin restricciones sanitarias.'}`,
      autocompletado: true,
    };
  }

  // Search in clasificaciones_validadas by GTIN in description
  try {
    const { data, error } = await supabase
      .from('clasificaciones_validadas')
      .select('*')
      .eq('activo', true)
      .ilike('descripcion_original', `%${gtin}%`)
      .limit(1);

    if (!error && data && data.length > 0) {
      const registro = data[0];
      const clasificacion: GTINClasificacionCache = {
        gtin: gtinInfo.codigoNormalizado,
        hsCode: registro.hts_code,
        descripcionArancelaria: registro.descripcion_arancelaria || '',
        autoridadAnuente: registro.autoridad_anuente || undefined,
        restriccionesSalud: registro.autoridad_anuente ? [registro.autoridad_anuente] : [],
        paisOrigen: gtinInfo.paisOrigen,
        ultimoUso: new Date().toISOString(),
      };

      // Cache it
      cacheGTIN.set(gtinInfo.codigoNormalizado, clasificacion);

      devLog(`[Stella-GS1] GTIN ${gtin} encontrado en BD: ${registro.hts_code}`);

      return {
        gtin,
        encontrado: true,
        gtinInfo,
        clasificacion,
        mensajeStella: `Jefe, encontré este GTIN en nuestro historial. Partida arancelaria: **${registro.hts_code}** (${registro.descripcion_arancelaria}). ${registro.autoridad_anuente ? `Requiere permiso de ${registro.autoridad_anuente}.` : 'Sin restricciones.'}`,
        autocompletado: true,
      };
    }
  } catch (e) {
    devLog(`[Stella-GS1] Error buscando GTIN en BD: ${e}`);
  }

  // Not found
  return {
    gtin,
    encontrado: false,
    gtinInfo,
    mensajeStella: `Jefe, este GTIN (${gtin}) es nuevo en nuestro sistema. País de origen: ${gtinInfo.paisOrigen || 'No determinado'}. La clasificación arancelaria deberá hacerse manualmente.`,
    autocompletado: false,
  };
}

/**
 * Resuelve un GLN al recinto aduanero correspondiente
 * Stella mapea automáticamente la ubicación
 */
export function resolverRecintoDesdeGLN(gln: string): ResultadoTrazabilidadGLN {
  const glnInfo = mapearGLNaRecinto(gln);

  if (!glnInfo.valido) {
    return {
      gln,
      glnInfo,
      recintoEncontrado: false,
      mensajeStella: `Jefe, el GLN ${gln} tiene formato inválido. Verificar con el remitente.`,
    };
  }

  if (glnInfo.recintoMapeado) {
    return {
      gln,
      glnInfo,
      recintoEncontrado: true,
      mensajeStella: `Jefe, he identificado el GLN ${gln} como **${glnInfo.nombreRecinto}** (${glnInfo.recintoMapeado}). Recinto pre-seleccionado automáticamente.`,
    };
  }

  return {
    gln,
    glnInfo,
    recintoEncontrado: false,
    mensajeStella: `Jefe, el GLN ${gln} es válido (${glnInfo.paisOrigen || 'origen desconocido'}), pero no está en nuestro directorio de recintos panameños. Seleccione el recinto manualmente.`,
  };
}

/**
 * Guarda una clasificación GTIN en caché para futura autocompleta
 */
export function registrarClasificacionGTIN(
  gtin: string,
  hsCode: string,
  descripcionArancelaria: string,
  autoridadAnuente?: string
): void {
  const gtinInfo = procesarGTIN(gtin);
  if (!gtinInfo.valido) return;

  const clasificacion: GTINClasificacionCache = {
    gtin: gtinInfo.codigoNormalizado,
    hsCode,
    descripcionArancelaria,
    autoridadAnuente,
    restriccionesSalud: autoridadAnuente ? [autoridadAnuente] : [],
    paisOrigen: gtinInfo.paisOrigen,
    ultimoUso: new Date().toISOString(),
  };

  cacheGTIN.set(gtinInfo.codigoNormalizado, clasificacion);
  devLog(`[Stella-GS1] Clasificación GTIN registrada: ${gtin} → ${hsCode}`);
}

export default {
  buscarClasificacionPorGTIN,
  resolverRecintoDesdeGLN,
  registrarClasificacionGTIN,
};
