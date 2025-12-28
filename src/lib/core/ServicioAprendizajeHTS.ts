// ============================================
// SERVICIO DE APRENDIZAJE HTS
// Cliente para motor evolutivo con Lovable AI
// ============================================

import { supabase } from '@/integrations/supabase/client';
import { devLog } from '@/lib/logger';

export interface ClasificacionAI {
  hsCode: string;
  descripcionArancelaria: string;
  daiPercent: number;
  iscPercent: number;
  itbmsPercent: number;
  autoridadAnuente?: string;
  esFarmaceutico?: boolean;
  esRestringido?: boolean;
  confianza: number;
  notas?: string;
}

export interface ResultadoClasificacionAI {
  success: boolean;
  source: 'APRENDIDO' | 'AI';
  clasificacion?: ClasificacionAI;
  error?: string;
}

/**
 * Clasifica un producto usando el motor de aprendizaje evolutivo
 */
export async function clasificarConAprendizaje(
  descripcion: string,
  valorUSD: number,
  peso?: number,
  guia?: string,
  mawb?: string
): Promise<ResultadoClasificacionAI> {
  try {
    devLog(`[Aprendizaje] Clasificando: "${descripcion.substring(0, 40)}..."`);

    const { data, error } = await supabase.functions.invoke('motor-aprendizaje-hts', {
      body: { descripcion, valorUSD, peso, guia, mawb }
    });

    if (error) {
      devLog(`[Aprendizaje] Error: ${error.message}`);
      return { success: false, source: 'AI', error: error.message };
    }

    devLog(`[Aprendizaje] Resultado: ${data.source} - ${data.clasificacion?.hsCode}`);
    return data as ResultadoClasificacionAI;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    devLog(`[Aprendizaje] Error: ${msg}`);
    return { success: false, source: 'AI', error: msg };
  }
}

/**
 * Registra una clasificación validada por el corredor
 */
export async function registrarClasificacionValidada(
  descripcionOriginal: string,
  htsCode: string,
  descripcionArancelaria: string,
  daiPercent: number,
  itbmsPercent: number,
  corredorId: string,
  corredorNombre: string,
  guiaOrigen?: string,
  mawbOrigen?: string,
  autoridadAnuente?: string
): Promise<boolean> {
  try {
    const descripcionNormalizada = descripcionOriginal
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const { error } = await supabase
      .from('clasificaciones_validadas')
      .insert({
        descripcion_original: descripcionOriginal,
        descripcion_normalizada: descripcionNormalizada,
        hts_code: htsCode,
        descripcion_arancelaria: descripcionArancelaria,
        dai_percent: daiPercent,
        itbms_percent: itbmsPercent,
        corredor_id: corredorId,
        corredor_nombre: corredorNombre,
        guia_origen: guiaOrigen,
        mawb_origen: mawbOrigen,
        autoridad_anuente: autoridadAnuente,
        confianza: 100,
        usos_exitosos: 1
      });

    if (error) {
      devLog(`[Aprendizaje] Error registrando: ${error.message}`);
      return false;
    }

    devLog(`[Aprendizaje] ✓ Clasificación validada registrada: ${htsCode}`);
    return true;
  } catch (error) {
    devLog(`[Aprendizaje] Error: ${error}`);
    return false;
  }
}

export default {
  clasificarConAprendizaje,
  registrarClasificacionValidada
};
