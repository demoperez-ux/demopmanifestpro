/**
 * MANIFEST SNIFFER — LEXIS Module
 * 
 * Motor de detección y clasificación de manifiestos de paquetería aérea.
 * Identifica relaciones Guía Madre (MAWB) ↔ Guía Hija (HAWB) y
 * normaliza formatos de múltiples carriers por patrones técnicos IATA.
 * 
 * Fundamento: Resolución ANA 049-2025 — Régimen Express Panamá
 */

import { devLog, devWarn } from '@/lib/logger';

// ─── Tipos ──────────────────────────────────────────────

export type TipoGuia = 'MAWB' | 'HAWB' | 'TRACKING' | 'CONSOLIDADO' | 'DESCONOCIDO';

export interface GuiaDetectada {
  valor: string;
  tipo: TipoGuia;
  confianza: number;
  carrier?: string;
  formatoIATA: boolean;
  prefijo?: string;
  aerolinea?: string;
}

export interface RelacionGuiaMadreHija {
  mawb: GuiaDetectada;
  hawbs: GuiaDetectada[];
  totalGuiasHijas: number;
  carrier: string;
  consolidador?: string;
}

export interface ResultadoSnifferCourier {
  tipo: 'manifiesto_courier' | 'manifiesto_carga' | 'desconocido';
  confianza: number;
  relaciones: RelacionGuiaMadreHija[];
  totalMAWB: number;
  totalHAWB: number;
  totalPaquetes: number;
  alertas: AlertaSniffer[];
  formatoDetectado: string;
  carrierPrincipal?: string;
}

export interface AlertaSniffer {
  tipo: 'info' | 'warning' | 'error';
  mensaje: string;
  guia?: string;
  fundamentoLegal?: string;
}

// ─── Prefijos IATA de aerolíneas ────────────────────────

const IATA_PREFIXES: Record<string, string> = {
  '230': 'Avianca',
  '172': 'Copa Airlines',
  '045': 'American Airlines',
  '006': 'Delta Air Lines',
  '074': 'KLM',
  '220': 'Lufthansa',
  '618': 'IATA-618',
  '023': 'IATA-023',
  '406': 'IATA-406',
  '580': 'Atlas Air',
  '235': 'Turkish Airlines',
  '160': 'Cathay Pacific',
  '205': 'Emirates',
  '014': 'Air Canada',
  '176': 'Iberia',
  '125': 'British Airways',
  '057': 'Air France',
  '131': 'LATAM',
};

// ─── Patrones de tracking por carrier ───────────────────

const CARRIER_PATTERNS: { carrier: string; pattern: RegExp; tipo: TipoGuia }[] = [
  // E-commerce fulfillment tracking
  { carrier: 'Fulfillment-A', pattern: /^TBA\d{10,15}$/i, tipo: 'TRACKING' },
  { carrier: 'Fulfillment-A', pattern: /^AMZ[A-Z0-9]{8,}$/i, tipo: 'TRACKING' },
  // Express carrier — 10-digit tracking
  { carrier: 'Express-B', pattern: /^\d{10}$/, tipo: 'TRACKING' },
  { carrier: 'Express-B', pattern: /^JJD\d{18,}$/i, tipo: 'TRACKING' },
  // Express carrier — 12-15 digit tracking
  { carrier: 'Express-C', pattern: /^\d{12,15}$/, tipo: 'TRACKING' },
  { carrier: 'Express-C', pattern: /^\d{20,22}$/, tipo: 'TRACKING' },
  // Express carrier — 1Z format
  { carrier: 'Express-D', pattern: /^1Z[A-Z0-9]{16}$/i, tipo: 'TRACKING' },
  // National postal service
  { carrier: 'Postal', pattern: /^(?:9[2-5]\d{20,}|[A-Z]{2}\d{9}[A-Z]{2})$/i, tipo: 'TRACKING' },
  // IATA MAWB: XXX-XXXXXXXX
  { carrier: 'IATA', pattern: /^\d{3}-\d{8}$/, tipo: 'MAWB' },
  // Generic HAWB
  { carrier: 'Express', pattern: /^[A-Z]{2,4}\d{6,10}$/i, tipo: 'HAWB' },
];

// ─── Keywords para detectar manifiestos courier ─────────

const COURIER_KEYWORDS = [
  'manifest', 'manifiesto', 'courier', 'paqueteria', 'envíos',
  'guia madre', 'guia hija', 'master', 'house', 'hawb', 'mawb',
  'air waybill', 'tracking', 'shipment', 'consolidado', 'deconsolidado',
  'paquete', 'package', 'parcel', 'bulto', 'pieza',
  'express', 'logistics', 'carrier', 'fulfillment',
];

// ─── ManifestSnifferCourier ─────────────────────────────

export class ManifestSnifferCourier {

  /**
   * Analiza datos de un manifiesto para detectar estructura MAWB/HAWB.
   * Acepta tanto datos crudos (filas de Excel) como texto plano.
   */
  static analizarManifiesto(
    filas: Record<string, string>[],
    columnasDetectadas?: { mawb?: string; hawb?: string; tracking?: string }
  ): ResultadoSnifferCourier {
    const alertas: AlertaSniffer[] = [];
    const relaciones = new Map<string, RelacionGuiaMadreHija>();

    // 1. Detectar columnas de guía si no se proveen
    const cols = columnasDetectadas || this.detectarColumnasGuia(filas);
    
    devLog(`[ManifestSniffer] Columnas detectadas: MAWB=${cols.mawb}, HAWB=${cols.hawb}, Tracking=${cols.tracking}`);

    // 2. Procesar cada fila
    let totalPaquetes = 0;
    
    for (const fila of filas) {
      totalPaquetes++;
      
      // Extraer valores de guía
      const valorMAWB = cols.mawb ? (fila[cols.mawb] || '').toString().trim() : '';
      const valorHAWB = cols.hawb ? (fila[cols.hawb] || '').toString().trim() : '';
      const valorTracking = cols.tracking ? (fila[cols.tracking] || '').toString().trim() : '';
      
      // Clasificar la guía madre
      if (valorMAWB) {
        const guiaMadre = this.clasificarGuia(valorMAWB);
        
        if (!relaciones.has(valorMAWB)) {
          relaciones.set(valorMAWB, {
            mawb: guiaMadre,
            hawbs: [],
            totalGuiasHijas: 0,
            carrier: guiaMadre.carrier || 'Desconocido',
          });
        }
        
        const rel = relaciones.get(valorMAWB)!;
        
        // Asociar guía hija
        const guiaHija = valorHAWB || valorTracking;
        if (guiaHija) {
          const clasificada = this.clasificarGuia(guiaHija);
          // Evitar duplicados
          if (!rel.hawbs.some(h => h.valor === guiaHija)) {
            rel.hawbs.push(clasificada);
          }
          rel.totalGuiasHijas = rel.hawbs.length;
        }
      }
    }

    // 3. Generar alertas
    for (const [mawb, rel] of relaciones) {
      // Alerta: MAWB sin formato IATA
      if (!rel.mawb.formatoIATA && rel.mawb.tipo === 'MAWB') {
        alertas.push({
          tipo: 'warning',
          mensaje: `MAWB "${mawb}" no cumple formato IATA (XXX-XXXXXXXX)`,
          guia: mawb,
        });
      }
      
      // Alerta: MAWB con muchas guías hijas (posible consolidación masiva)
      if (rel.totalGuiasHijas > 500) {
        alertas.push({
          tipo: 'info',
          mensaje: `MAWB "${mawb}" tiene ${rel.totalGuiasHijas} guías hijas — consolidación de alto volumen`,
          guia: mawb,
          fundamentoLegal: 'Res. ANA 049-2025 — Régimen Courier Art. 12',
        });
      }
      
      // Alerta: MAWB sin guías hijas
      if (rel.totalGuiasHijas === 0) {
        alertas.push({
          tipo: 'warning',
          mensaje: `MAWB "${mawb}" sin guías hijas asociadas`,
          guia: mawb,
        });
      }
    }

    // 4. Detectar carrier principal
    const carriers = Array.from(relaciones.values())
      .map(r => r.carrier)
      .filter(c => c !== 'Desconocido');
    const carrierPrincipal = this.modaArray(carriers);

    // 5. Calcular confianza
    const totalMAWB = relaciones.size;
    const totalHAWB = Array.from(relaciones.values())
      .reduce((sum, r) => sum + r.totalGuiasHijas, 0);
    
    const esCourier = totalMAWB > 0 && totalHAWB > 0;
    const confianza = esCourier 
      ? Math.min(100, 50 + (totalMAWB > 1 ? 15 : 0) + (totalHAWB > 10 ? 20 : 10) + (carrierPrincipal ? 15 : 0))
      : 20;

    devLog(`[ManifestSniffer] Resultado: ${totalMAWB} MAWB, ${totalHAWB} HAWB, ${totalPaquetes} paquetes, confianza ${confianza}%`);

    return {
      tipo: esCourier ? 'manifiesto_courier' : totalPaquetes > 0 ? 'manifiesto_carga' : 'desconocido',
      confianza,
      relaciones: Array.from(relaciones.values()),
      totalMAWB,
      totalHAWB,
      totalPaquetes,
      alertas,
      formatoDetectado: esCourier ? 'Courier Aéreo (MAWB/HAWB)' : 'Carga General',
      carrierPrincipal,
    };
  }

  /**
   * Clasifica una guía individual por tipo y carrier.
   */
  static clasificarGuia(valor: string): GuiaDetectada {
    const limpio = valor.trim();
    
    // Verificar formato IATA MAWB: XXX-XXXXXXXX
    const matchIATA = limpio.match(/^(\d{3})-(\d{8})$/);
    if (matchIATA) {
      const prefijo = matchIATA[1];
      const aerolinea = IATA_PREFIXES[prefijo];
      return {
        valor: limpio,
        tipo: 'MAWB',
        confianza: 95,
        carrier: aerolinea || 'Aerolínea desconocida',
        formatoIATA: true,
        prefijo,
        aerolinea,
      };
    }
    
    // Verificar patrones de carriers específicos
    for (const { carrier, pattern, tipo } of CARRIER_PATTERNS) {
      if (pattern.test(limpio)) {
        return {
          valor: limpio,
          tipo,
          confianza: 80,
          carrier,
          formatoIATA: false,
        };
      }
    }

    // Si parece numérico largo, asumir HAWB
    if (/^\d{6,}$/.test(limpio)) {
      return {
        valor: limpio,
        tipo: 'HAWB',
        confianza: 50,
        formatoIATA: false,
      };
    }

    return {
      valor: limpio,
      tipo: 'DESCONOCIDO',
      confianza: 10,
      formatoIATA: false,
    };
  }

  /**
   * Detecta automáticamente las columnas de guía en los datos.
   */
  private static detectarColumnasGuia(
    filas: Record<string, string>[]
  ): { mawb?: string; hawb?: string; tracking?: string } {
    if (filas.length === 0) return {};
    
    const headers = Object.keys(filas[0]);
    const resultado: { mawb?: string; hawb?: string; tracking?: string } = {};

    const MAWB_KEYWORDS = ['mawb', 'master', 'guia madre', 'guia_madre', 'masterawb', 'master_awb', 'master air waybill'];
    const HAWB_KEYWORDS = ['hawb', 'house', 'guia hija', 'guia_hija', 'houseawb', 'house_awb', 'house air waybill'];
    const TRACKING_KEYWORDS = ['tracking', 'awb', 'guia', 'numero_guia', 'tracking_number', 'local tracking', 'shipment'];

    for (const header of headers) {
      const headerLower = header.toLowerCase().trim();
      
      if (!resultado.mawb && MAWB_KEYWORDS.some(kw => headerLower.includes(kw))) {
        resultado.mawb = header;
      }
      if (!resultado.hawb && HAWB_KEYWORDS.some(kw => headerLower.includes(kw))) {
        resultado.hawb = header;
      }
      if (!resultado.tracking && TRACKING_KEYWORDS.some(kw => headerLower.includes(kw))) {
        resultado.tracking = header;
      }
    }

    // Si no se encontró HAWB pero sí Tracking, usar Tracking como HAWB
    if (!resultado.hawb && resultado.tracking) {
      resultado.hawb = resultado.tracking;
    }

    return resultado;
  }

  /**
   * Analiza texto plano de un documento de manifiesto para keywords courier.
   */
  static analizarTextoCourier(texto: string): { esCourier: boolean; confianza: number; keywordsDetectadas: string[] } {
    const textoLower = texto.toLowerCase();
    const found: string[] = [];
    
    for (const kw of COURIER_KEYWORDS) {
      if (textoLower.includes(kw)) {
        found.push(kw);
      }
    }

    const confianza = Math.min(100, found.length * 15);
    return {
      esCourier: found.length >= 3,
      confianza,
      keywordsDetectadas: found,
    };
  }

  /**
   * Calcula la moda (elemento más frecuente) de un array.
   */
  private static modaArray(arr: string[]): string | undefined {
    if (arr.length === 0) return undefined;
    const freq = new Map<string, number>();
    let maxFreq = 0;
    let moda = arr[0];
    for (const val of arr) {
      const count = (freq.get(val) || 0) + 1;
      freq.set(val, count);
      if (count > maxFreq) {
        maxFreq = count;
        moda = val;
      }
    }
    return moda;
  }
}

export default ManifestSnifferCourier;
