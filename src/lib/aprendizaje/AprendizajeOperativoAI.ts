// ============================================
// APRENDIZAJE OPERATIVO AI
// Feedback Loop con Gemini para GTIN y reglas por proyecto
// ============================================

import { supabase } from '@/integrations/supabase/client';
import { devLog } from '@/lib/logger';

export interface ReglaProyecto {
  id: string;
  proyecto: string;
  destinatario: string;
  descripcionPatron: string;
  hsCodeAsignado: string;
  descripcionArancelaria: string;
  corredorId: string;
  corredorNombre: string;
  usosExitosos: number;
  activo: boolean;
  createdAt: string;
}

export interface ResultadoEnriquecimientoGTIN {
  gtin: string;
  encontrado: boolean;
  marca?: string;
  descripcionTecnica?: string;
  categoria?: string;
  hsCodeSugerido?: string;
  paisOrigen?: string;
}

export class AprendizajeOperativoAI {

  private static reglasProyectoCache = new Map<string, ReglaProyecto[]>();

  /**
   * Aprende una clasificación por proyecto
   */
  static async aprenderClasificacionProyecto(params: {
    proyecto: string;
    destinatario: string;
    descripcion: string;
    hsCode: string;
    descripcionArancelaria: string;
    corredorId: string;
    corredorNombre: string;
  }): Promise<boolean> {
    try {
      // Normalizar descripción como patrón
      const patronDescripcion = this.normalizarParaPatron(params.descripcion);
      
      // Guardar en clasificaciones_validadas con contexto de proyecto
      const { error } = await supabase.from('clasificaciones_validadas').upsert({
        descripcion_original: params.descripcion,
        descripcion_normalizada: patronDescripcion,
        hts_code: params.hsCode,
        descripcion_arancelaria: params.descripcionArancelaria,
        corredor_id: params.corredorId,
        corredor_nombre: params.corredorNombre,
        mawb_origen: params.proyecto, // Usamos mawb_origen para el proyecto
        usos_exitosos: 1,
        activo: true
      }, { onConflict: 'descripcion_normalizada,corredor_id' });

      if (error) throw error;

      devLog(`[Aprendizaje] Regla de proyecto guardada: ${params.proyecto} -> ${params.hsCode}`);
      
      // Limpiar cache
      this.reglasProyectoCache.delete(params.proyecto);
      
      return true;
    } catch (e) {
      console.error('[Aprendizaje] Error guardando regla:', e);
      return false;
    }
  }

  /**
   * Busca clasificación aprendida por proyecto
   */
  static async buscarClasificacionProyecto(
    proyecto: string,
    descripcion: string
  ): Promise<ReglaProyecto | null> {
    try {
      const patronBusqueda = this.normalizarParaPatron(descripcion);
      
      const { data, error } = await supabase
        .from('clasificaciones_validadas')
        .select('*')
        .eq('mawb_origen', proyecto)
        .eq('activo', true)
        .ilike('descripcion_normalizada', `%${patronBusqueda.substring(0, 20)}%`)
        .limit(1);

      if (error || !data?.length) return null;

      const registro = data[0];
      
      // Incrementar uso exitoso
      await supabase
        .from('clasificaciones_validadas')
        .update({ usos_exitosos: (registro.usos_exitosos || 0) + 1 })
        .eq('id', registro.id);

      devLog(`[Aprendizaje] Clasificación encontrada para proyecto ${proyecto}`);

      return {
        id: registro.id,
        proyecto,
        destinatario: '',
        descripcionPatron: registro.descripcion_normalizada,
        hsCodeAsignado: registro.hts_code,
        descripcionArancelaria: registro.descripcion_arancelaria || '',
        corredorId: registro.corredor_id,
        corredorNombre: registro.corredor_nombre || '',
        usosExitosos: registro.usos_exitosos || 1,
        activo: registro.activo || true,
        createdAt: registro.created_at
      };
    } catch (e) {
      console.error('[Aprendizaje] Error buscando regla:', e);
      return null;
    }
  }

  /**
   * Enriquece producto usando GTIN via Gemini AI
   */
  static async enriquecerPorGTIN(gtin: string): Promise<ResultadoEnriquecimientoGTIN> {
    try {
      const { data, error } = await supabase.functions.invoke('clasificar-hts-ai', {
        body: {
          descripcion: `Product with GTIN/UPC: ${gtin}`,
          solicitarEnriquecimiento: true,
          gtin
        }
      });

      if (error || !data?.clasificacion) {
        return { gtin, encontrado: false };
      }

      devLog(`[Aprendizaje] GTIN ${gtin} enriquecido via AI`);

      return {
        gtin,
        encontrado: true,
        descripcionTecnica: data.clasificacion.descripcionArancelaria,
        hsCodeSugerido: data.clasificacion.hsCode,
        categoria: data.clasificacion.categoria
      };
    } catch (e) {
      return { gtin, encontrado: false };
    }
  }

  private static normalizarParaPatron(texto: string): string {
    return texto
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }
}

export default AprendizajeOperativoAI;
