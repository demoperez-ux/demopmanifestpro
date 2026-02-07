// ============================================
// SINCRONIZADOR GS1 ↔ ORION WMS — ZENITH
// Mapeo GTIN→HTS, validación de integridad,
// auditoría GLN cadena de custodia
// ============================================

import { supabase } from '@/integrations/supabase/client';
import { validarCodigoGS1, validarGLN13, mapearGLNaRecinto } from './ValidadorGS1';
import { devLog, devWarn } from '@/lib/logger';
import CryptoJS from 'crypto-js';

// ============ TIPOS ============

export interface MapeoGTINHTS {
  gtin: string;
  partida_arancelaria: string;
  descripcion_arancelaria: string;
  descripcion_producto: string;
  unidad_medida: string;
  dai_percent: number;
  isc_percent: number;
  itbms_percent: number;
  autoridad_anuente?: string;
  restricciones_salud: string[];
  pais_origen?: string;
  gln_shipper?: string;
  nombre_shipper?: string;
}

export interface ResultadoAutocompletado {
  encontrado: boolean;
  gtin: string;
  mapeo?: MapeoGTINHTS;
  autocompletado?: {
    descripcion?: string;
    unidadMedida?: string;
    codigoArancelario?: string;
    tasas?: { dai: number; isc: number; itbms: number };
    autoridad?: string;
  };
  conflicto?: ConflictoGS1;
  mensajeStella: string;
}

export interface ConflictoGS1 {
  tipo: 'identidad' | 'hts_multiple' | 'descripcion' | 'shipper';
  gtin: string;
  descripcion: string;
  detalles: string[];
  bloqueado: boolean;
  hashVerificacion: string;
}

export interface ResultadoAuditoriaGLN {
  glnShipper: string;
  glnValido: boolean;
  shipperRegistrado: boolean;
  coincideExportador: boolean;
  cadenaIntegra: boolean;
  alertas: string[];
  mensajeStella: string;
}

// ============ CACHE EN MEMORIA ============

const cacheMapeos = new Map<string, MapeoGTINHTS>();

// ============ AUTOCOMPLETADO POR GTIN ============

/**
 * Busca un GTIN en la tabla mapeo_gs1_hts y autocompleta campos
 * Usado por Zod al recibir aviso de despacho de Orión
 */
export async function autocompletarPorGTIN(gtin: string): Promise<ResultadoAutocompletado> {
  // 1. Validar formato GS1
  const validacion = validarCodigoGS1(gtin);
  if (!validacion.valido) {
    return {
      encontrado: false,
      gtin,
      mensajeStella: `Jefe, el GTIN ${gtin} tiene formato inválido (${validacion.errores.join(', ')}). No puedo autocompletar.`,
    };
  }

  const limpio = gtin.replace(/\D/g, '');

  // 2. Check cache
  const cached = cacheMapeos.get(limpio);
  if (cached) {
    devLog(`[GS1-Orion] GTIN ${limpio} encontrado en caché`);
    return construirResultadoExitoso(limpio, cached);
  }

  // 3. Buscar en BD
  try {
    const { data, error } = await supabase
      .from('mapeo_gs1_hts' as any)
      .select('*')
      .eq('gtin', limpio)
      .eq('activo', true)
      .order('usos_exitosos', { ascending: false })
      .limit(5);

    if (error) {
      devWarn(`[GS1-Orion] Error buscando GTIN: ${error.message}`);
      return {
        encontrado: false,
        gtin: limpio,
        mensajeStella: `Jefe, error al buscar GTIN en la base de datos: ${error.message}`,
      };
    }

    if (data && data.length > 0) {
      const registros = data as any[];
      
      // Check for HTS conflicts (multiple different HTS for same GTIN)
      const htsUnicos = new Set(registros.map((r: any) => r.partida_arancelaria));
      if (htsUnicos.size > 1) {
        const conflicto = generarConflictoMultipleHTS(limpio, registros);
        return {
          encontrado: true,
          gtin: limpio,
          conflicto,
          mensajeStella: `⚠️ Veredicto de Zod: Conflicto de identidad GS1 detectado. El GTIN ${limpio} tiene ${htsUnicos.size} partidas arancelarias diferentes registradas. Pre-liquidación bloqueada hasta revisión manual.`,
        };
      }

      const registro = registros[0];
      const mapeo: MapeoGTINHTS = {
        gtin: registro.gtin,
        partida_arancelaria: registro.partida_arancelaria,
        descripcion_arancelaria: registro.descripcion_arancelaria || '',
        descripcion_producto: registro.descripcion_producto,
        unidad_medida: registro.unidad_medida || 'u',
        dai_percent: Number(registro.dai_percent) || 0,
        isc_percent: Number(registro.isc_percent) || 0,
        itbms_percent: Number(registro.itbms_percent) || 7,
        autoridad_anuente: registro.autoridad_anuente,
        restricciones_salud: registro.restricciones_salud || [],
        pais_origen: registro.pais_origen,
        gln_shipper: registro.gln_shipper,
        nombre_shipper: registro.nombre_shipper,
      };

      // Cache it
      cacheMapeos.set(limpio, mapeo);

      // Increment usage
      await supabase
        .from('mapeo_gs1_hts' as any)
        .update({ usos_exitosos: (registro.usos_exitosos || 0) + 1, ultimo_uso: new Date().toISOString() })
        .eq('id', registro.id);

      devLog(`[GS1-Orion] GTIN ${limpio} → HTS ${mapeo.partida_arancelaria}`);
      return construirResultadoExitoso(limpio, mapeo);
    }
  } catch (e) {
    devWarn(`[GS1-Orion] Error inesperado: ${e}`);
  }

  // 4. Also check clasificaciones_validadas as fallback
  try {
    const { data: clasifData } = await supabase
      .from('clasificaciones_validadas')
      .select('*')
      .eq('activo', true)
      .ilike('descripcion_original', `%${limpio}%`)
      .limit(1);

    if (clasifData && clasifData.length > 0) {
      const reg = clasifData[0];
      const mapeo: MapeoGTINHTS = {
        gtin: limpio,
        partida_arancelaria: reg.hts_code,
        descripcion_arancelaria: reg.descripcion_arancelaria || '',
        descripcion_producto: reg.descripcion_original,
        unidad_medida: 'u',
        dai_percent: Number(reg.dai_percent) || 0,
        isc_percent: Number(reg.isc_percent) || 0,
        itbms_percent: Number(reg.itbms_percent) || 7,
        autoridad_anuente: reg.autoridad_anuente || undefined,
        restricciones_salud: reg.autoridad_anuente ? [reg.autoridad_anuente] : [],
        pais_origen: validacion.paisOrigen,
      };

      cacheMapeos.set(limpio, mapeo);
      return construirResultadoExitoso(limpio, mapeo);
    }
  } catch (e) {
    // Fallback silently
  }

  return {
    encontrado: false,
    gtin: limpio,
    mensajeStella: `Jefe, el GTIN ${limpio} (${validacion.paisOrigen || 'origen desconocido'}) no está en nuestro directorio GS1. Clasificación manual requerida.`,
  };
}

// ============ VALIDACIÓN DE INTEGRIDAD GS1 (ZOD) ============

/**
 * Valida integridad GS1: verifica que el GTIN coincida con la descripción aduanera
 * Zod bloquea pre-liquidación si hay conflicto
 */
export async function validarIntegridadGS1(params: {
  gtin: string;
  descripcionOrion: string;
  referencia: string;
}): Promise<ConflictoGS1 | null> {
  const limpio = params.gtin.replace(/\D/g, '');
  
  // Buscar mapeo existente
  const resultado = await autocompletarPorGTIN(limpio);
  
  if (!resultado.encontrado || !resultado.mapeo) return null;
  
  // Comparar descripción de Orion con descripción en ZENITH
  const descOrion = params.descripcionOrion.toLowerCase().trim();
  const descZenith = resultado.mapeo.descripcion_producto.toLowerCase().trim();
  
  // Simple similarity check: at least 2 words in common
  const palabrasOrion = new Set(descOrion.split(/\s+/).filter(w => w.length > 3));
  const palabrasZenith = new Set(descZenith.split(/\s+/).filter(w => w.length > 3));
  const interseccion = [...palabrasOrion].filter(w => palabrasZenith.has(w));
  
  const similitud = palabrasOrion.size > 0 
    ? interseccion.length / palabrasOrion.size 
    : 0;
  
  if (similitud < 0.2 && palabrasOrion.size >= 2) {
    const hashData = `gs1_conflict:${limpio}:${params.referencia}:${Date.now()}`;
    const conflicto: ConflictoGS1 = {
      tipo: 'descripcion',
      gtin: limpio,
      descripcion: 'Conflicto de identidad GS1 detectado. El GTIN reportado no coincide con la descripción aduanera.',
      detalles: [
        `GTIN: ${limpio}`,
        `Descripción Orion WMS: "${params.descripcionOrion}"`,
        `Descripción ZENITH: "${resultado.mapeo.descripcion_producto}"`,
        `Partida arancelaria registrada: ${resultado.mapeo.partida_arancelaria}`,
        `Similitud: ${(similitud * 100).toFixed(0)}% (mínimo requerido: 20%)`,
        `Referencia: ${params.referencia}`,
        'Acción: Pre-liquidación bloqueada. Marcar para revisión manual.',
      ],
      bloqueado: true,
      hashVerificacion: CryptoJS.SHA256(hashData).toString(CryptoJS.enc.Hex),
    };

    // Mark conflict in DB
    try {
      await supabase
        .from('mapeo_gs1_hts' as any)
        .update({
          conflicto_detectado: true,
          notas_conflicto: `Conflicto detectado con Orion ref ${params.referencia}: "${params.descripcionOrion}" vs "${resultado.mapeo.descripcion_producto}"`,
        })
        .eq('gtin', limpio);
    } catch (e) {
      devWarn(`[GS1-Zod] Error marcando conflicto: ${e}`);
    }

    devWarn(`[GS1-Zod] CONFLICTO: GTIN ${limpio} — descripción no coincide`);
    return conflicto;
  }

  return null;
}

// ============ AUDITORÍA GLN — CADENA DE CUSTODIA ============

/**
 * Audita la cadena de custodia validando que el GLN del shipper
 * en Orion WMS coincida con el exportador registrado en ZENITH
 */
export async function auditarCadenaCustodiaGLN(params: {
  glnShipper: string;
  nombreShipperOrion: string;
  referencia: string;
}): Promise<ResultadoAuditoriaGLN> {
  const alertas: string[] = [];
  
  // 1. Validar formato GLN
  const validacionGLN = validarGLN13(params.glnShipper);
  if (!validacionGLN.valido) {
    return {
      glnShipper: params.glnShipper,
      glnValido: false,
      shipperRegistrado: false,
      coincideExportador: false,
      cadenaIntegra: false,
      alertas: [`GLN inválido: ${validacionGLN.errores.join(', ')}`],
      mensajeStella: `Jefe, el GLN ${params.glnShipper} del remitente tiene formato inválido. No puedo verificar la cadena de custodia.`,
    };
  }

  // 2. Mapear GLN a recinto
  const glnInfo = mapearGLNaRecinto(params.glnShipper);
  
  // 3. Buscar shipper en mapeos existentes
  let shipperRegistrado = false;
  let coincideExportador = false;
  
  try {
    const { data: mapeos } = await supabase
      .from('mapeo_gs1_hts' as any)
      .select('gln_shipper, nombre_shipper')
      .eq('gln_shipper', params.glnShipper.replace(/\D/g, ''))
      .limit(1);

    if (mapeos && mapeos.length > 0) {
      shipperRegistrado = true;
      const nombreRegistrado = (mapeos[0] as any).nombre_shipper || '';
      
      // Compare names (normalize)
      const normOrion = params.nombreShipperOrion.toUpperCase().trim().replace(/\s+/g, ' ');
      const normZenith = nombreRegistrado.toUpperCase().trim().replace(/\s+/g, ' ');
      
      if (normOrion === normZenith || normOrion.includes(normZenith) || normZenith.includes(normOrion)) {
        coincideExportador = true;
      } else {
        alertas.push(`Discrepancia de shipper: Orion reporta "${params.nombreShipperOrion}" pero ZENITH tiene registrado "${nombreRegistrado}" para GLN ${params.glnShipper}`);
      }
    } else {
      alertas.push(`GLN ${params.glnShipper} no está registrado en el directorio de asociados de ZENITH`);
    }
  } catch (e) {
    alertas.push(`Error consultando directorio de asociados: ${e}`);
  }

  // 4. Also check consignatarios_fiscales
  if (!shipperRegistrado) {
    try {
      const normNombre = params.nombreShipperOrion.toUpperCase().trim();
      const { data: consignatarios } = await supabase
        .from('consignatarios_fiscales')
        .select('nombre_consignatario, nombre_normalizado')
        .ilike('nombre_normalizado', `%${normNombre.substring(0, 10)}%`)
        .limit(1);

      if (consignatarios && consignatarios.length > 0) {
        shipperRegistrado = true;
        coincideExportador = true;
      }
    } catch (e) {
      // Silent
    }
  }

  const cadenaIntegra = validacionGLN.valido && shipperRegistrado && coincideExportador;

  let mensajeStella: string;
  if (cadenaIntegra) {
    mensajeStella = `Jefe, cadena de custodia verificada ✅. El GLN ${params.glnShipper} (${glnInfo.paisOrigen || 'origen'}) corresponde a "${params.nombreShipperOrion}" — exportador registrado en nuestro directorio.`;
  } else if (shipperRegistrado && !coincideExportador) {
    mensajeStella = `⚠️ Jefe, el GLN ${params.glnShipper} está registrado pero el nombre del shipper NO coincide con nuestros registros. Posible suplantación o error de datos. Verificación manual requerida.`;
  } else {
    mensajeStella = `Jefe, el GLN ${params.glnShipper} del remitente no está en nuestro directorio. ${glnInfo.recintoMapeado ? `Recinto mapeado: ${glnInfo.nombreRecinto}.` : 'Sin recinto asociado.'} Recomiendo registrarlo como asociado de negocio.`;
  }

  devLog(`[GS1-Custodia] GLN ${params.glnShipper}: cadena=${cadenaIntegra ? 'ÍNTEGRA' : 'ROTA'}`);

  return {
    glnShipper: params.glnShipper,
    glnValido: validacionGLN.valido,
    shipperRegistrado,
    coincideExportador,
    cadenaIntegra,
    alertas,
    mensajeStella,
  };
}

// ============ REGISTRO DE NUEVO MAPEO ============

/**
 * Registra un nuevo mapeo GTIN→HTS (desde clasificación manual o importación)
 */
export async function registrarMapeoGTIN(mapeo: MapeoGTINHTS): Promise<boolean> {
  const validacion = validarCodigoGS1(mapeo.gtin);
  
  try {
    const { error } = await supabase
      .from('mapeo_gs1_hts' as any)
      .upsert({
        gtin: mapeo.gtin.replace(/\D/g, ''),
        gtin_tipo: validacion.tipo || 'GTIN-13',
        gtin_checksum_valido: validacion.valido,
        partida_arancelaria: mapeo.partida_arancelaria,
        descripcion_arancelaria: mapeo.descripcion_arancelaria,
        descripcion_producto: mapeo.descripcion_producto,
        unidad_medida: mapeo.unidad_medida,
        dai_percent: mapeo.dai_percent,
        isc_percent: mapeo.isc_percent,
        itbms_percent: mapeo.itbms_percent,
        autoridad_anuente: mapeo.autoridad_anuente,
        restricciones_salud: mapeo.restricciones_salud,
        pais_origen: mapeo.pais_origen || validacion.paisOrigen,
        prefijo_gs1: validacion.prefijoPais,
        gln_shipper: mapeo.gln_shipper?.replace(/\D/g, ''),
        nombre_shipper: mapeo.nombre_shipper,
        fuente: 'zenith',
        activo: true,
        validado_por_zod: validacion.valido,
      }, {
        onConflict: 'gtin,partida_arancelaria',
      });

    if (error) {
      devWarn(`[GS1-Orion] Error registrando mapeo: ${error.message}`);
      return false;
    }

    // Update cache
    cacheMapeos.set(mapeo.gtin.replace(/\D/g, ''), mapeo);
    devLog(`[GS1-Orion] Mapeo registrado: ${mapeo.gtin} → ${mapeo.partida_arancelaria}`);
    return true;
  } catch (e) {
    devWarn(`[GS1-Orion] Error inesperado registrando mapeo: ${e}`);
    return false;
  }
}

// ============ HELPERS ============

function construirResultadoExitoso(gtin: string, mapeo: MapeoGTINHTS): ResultadoAutocompletado {
  return {
    encontrado: true,
    gtin,
    mapeo,
    autocompletado: {
      descripcion: mapeo.descripcion_producto,
      unidadMedida: mapeo.unidad_medida,
      codigoArancelario: mapeo.partida_arancelaria,
      tasas: {
        dai: mapeo.dai_percent,
        isc: mapeo.isc_percent,
        itbms: mapeo.itbms_percent,
      },
      autoridad: mapeo.autoridad_anuente,
    },
    mensajeStella: `Jefe, GTIN ${gtin} identificado ✅ → **${mapeo.partida_arancelaria}** (${mapeo.descripcion_arancelaria}). ${mapeo.autoridad_anuente ? `⚠️ Requiere permiso de ${mapeo.autoridad_anuente}.` : 'Sin restricciones.'} Descripción, unidad de medida y código arancelario autocompletados.`,
  };
}

function generarConflictoMultipleHTS(gtin: string, registros: any[]): ConflictoGS1 {
  const hashData = `gs1_multi:${gtin}:${registros.length}:${Date.now()}`;
  return {
    tipo: 'hts_multiple',
    gtin,
    descripcion: 'Conflicto de identidad GS1: mismo GTIN con múltiples partidas arancelarias.',
    detalles: [
      `GTIN: ${gtin}`,
      `Partidas registradas:`,
      ...registros.map((r: any) => `  • ${r.partida_arancelaria} — ${r.descripcion_producto}`),
      'Acción requerida: Revisor debe desambiguar la clasificación correcta.',
    ],
    bloqueado: true,
    hashVerificacion: CryptoJS.SHA256(hashData).toString(CryptoJS.enc.Hex),
  };
}

export default {
  autocompletarPorGTIN,
  validarIntegridadGS1,
  auditarCadenaCustodiaGLN,
  registrarMapeoGTIN,
};
