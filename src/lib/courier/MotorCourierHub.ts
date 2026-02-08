/**
 * MOTOR COURIER HUB — Cerebro LEXIS Universal Gateway
 * 
 * Motor de análisis inteligente para operaciones express (agnóstico de transportista):
 * 1. Keyword Sniffer: Detecta categorías basándose en el Arancel de Panamá
 * 2. Auditoría de Valor Zod: Detecta inconsistencias valor/descripción
 * 3. Exportación ERP: Genera CSV/JSON/XML adaptado al socio {active_partner_name}
 * 
 * Fundamento: Arancel de Panamá + RECAUCA Art. 321 + Decreto Ejecutivo 41-2002
 */

import { ManifestRow } from '@/types/manifest';
import { ConfigService } from '@/lib/config/ConfigService';
import { devLog } from '@/lib/logger';
import { type PartnerConfig } from './partnerConfig';

// ─── Tipos ──────────────────────────────────────────────

export type SemaforoCumplimiento = 'verde' | 'amarillo' | 'rojo';

export interface AnalisisGuiaCourier {
  guia: ManifestRow;
  semaforo: SemaforoCumplimiento;
  categoriaDetectada: string;
  exencionDAI: boolean;
  requierePermisoSanitario: boolean;
  requierePermisoAgricola: boolean;
  alertaFraude: boolean;
  alertaFraudeDetalle?: string;
  stellaMensaje?: string;
  daiAplicable: number;
  observaciones: string[];
  keywordsDetectadas: string[];
}

export interface ResumenCourierHub {
  totalGuias: number;
  verde: number;
  amarillo: number;
  rojo: number;
  exentosTecnologia: number;
  requierenPermiso: number;
  alertasFraude: number;
  valorTotalUSD: number;
  pesoTotalLb: number;
}

// ─── Keywords de detección (Arancel de Panamá) ──────────

export const KEYWORDS_TECNOLOGIA: string[] = [
  'phone', 'iphone', 'samsung galaxy', 'smartphone', 'cellphone', 'celular',
  'computer', 'laptop', 'notebook', 'macbook', 'chromebook', 'desktop',
  'tablet', 'ipad', 'kindle', 'e-reader',
  'monitor', 'display', 'screen',
  'printer', 'impresora', 'scanner',
  'router', 'modem', 'switch', 'hub',
  'keyboard', 'teclado', 'mouse', 'raton',
  'headphones', 'auriculares', 'earbuds', 'airpods',
  'speaker', 'parlante', 'altavoz', 'bluetooth speaker',
  'camera', 'camara', 'webcam', 'gopro',
  'smartwatch', 'apple watch', 'fitness tracker',
  'usb', 'flash drive', 'pendrive', 'ssd', 'hard drive', 'disco duro',
  'charger', 'cargador', 'power bank', 'adapter', 'adaptador',
  'cable', 'hdmi', 'lightning', 'usb-c',
  'gaming', 'console', 'playstation', 'xbox', 'nintendo',
  'drone', 'robot', 'arduino', 'raspberry pi',
  'projector', 'proyector',
  'gpu', 'graphics card', 'tarjeta grafica', 'processor', 'cpu', 'ram',
];

export const KEYWORDS_SANITARIO: string[] = [
  'supplement', 'suplemento', 'vitamin', 'vitamina',
  'cream', 'crema', 'lotion', 'loción',
  'food', 'alimento', 'comida', 'snack',
  'medicine', 'medicamento', 'drug', 'farmaco',
  'capsule', 'capsula', 'tablet', 'pill', 'pastilla',
  'protein', 'proteina', 'amino', 'omega',
  'collagen', 'colageno', 'probiotic', 'probiotico',
  'essential oil', 'aceite esencial', 'herbal', 'hierba',
  'cosmetic', 'cosmetico', 'beauty', 'belleza',
  'shampoo', 'champu', 'soap', 'jabon',
  'toothpaste', 'pasta dental',
  'baby formula', 'formula infantil',
  'dietary', 'nutricional',
];

export const KEYWORDS_AGRICOLA: string[] = [
  'seed', 'semilla', 'plant', 'planta',
  'fruit', 'fruta', 'vegetable', 'vegetal',
  'meat', 'carne', 'poultry', 'aves',
  'fish', 'pescado', 'seafood', 'mariscos',
  'dairy', 'lacteo', 'cheese', 'queso', 'milk', 'leche',
  'egg', 'huevo', 'honey', 'miel',
  'organic', 'organico', 'fertilizer', 'fertilizante',
  'pet food', 'comida mascota', 'dog food', 'cat food',
];

// ─── Patrones de fraude (valor < $5 + artículo de alto valor) ───

const ITEMS_ALTO_VALOR: { keyword: string; valorMinimo: number }[] = [
  { keyword: 'macbook', valorMinimo: 200 },
  { keyword: 'iphone', valorMinimo: 100 },
  { keyword: 'laptop', valorMinimo: 80 },
  { keyword: 'computer', valorMinimo: 50 },
  { keyword: 'samsung galaxy', valorMinimo: 80 },
  { keyword: 'playstation', valorMinimo: 100 },
  { keyword: 'xbox', valorMinimo: 80 },
  { keyword: 'nintendo switch', valorMinimo: 60 },
  { keyword: 'ipad', valorMinimo: 80 },
  { keyword: 'apple watch', valorMinimo: 50 },
  { keyword: 'airpods', valorMinimo: 30 },
  { keyword: 'gopro', valorMinimo: 50 },
  { keyword: 'drone', valorMinimo: 40 },
  { keyword: 'smartwatch', valorMinimo: 30 },
  { keyword: 'gpu', valorMinimo: 80 },
  { keyword: 'graphics card', valorMinimo: 80 },
  { keyword: 'monitor', valorMinimo: 40 },
  { keyword: 'printer', valorMinimo: 30 },
  { keyword: 'camera', valorMinimo: 40 },
  { keyword: 'projector', valorMinimo: 50 },
  { keyword: 'tablet', valorMinimo: 40 },
  { keyword: 'headphones', valorMinimo: 15 },
  { keyword: 'speaker', valorMinimo: 10 },
  { keyword: 'console', valorMinimo: 60 },
];

const UMBRAL_FRAUDE_VALOR = 5.00;

// ─── Motor Principal ────────────────────────────────────

export class MotorCourierHub {

  /**
   * Analiza todas las guías de un manifiesto courier.
   */
  static analizarManifiesto(guias: ManifestRow[]): {
    analisis: AnalisisGuiaCourier[];
    resumen: ResumenCourierHub;
  } {
    const analisis: AnalisisGuiaCourier[] = [];
    let verde = 0, amarillo = 0, rojo = 0;
    let exentosTecnologia = 0, requierenPermiso = 0, alertasFraude = 0;
    let valorTotal = 0, pesoTotal = 0;

    for (const guia of guias) {
      const resultado = this.analizarGuia(guia);
      analisis.push(resultado);

      valorTotal += guia.valueUSD;
      pesoTotal += guia.weight;

      switch (resultado.semaforo) {
        case 'verde': verde++; break;
        case 'amarillo': amarillo++; break;
        case 'rojo': rojo++; break;
      }

      if (resultado.exencionDAI) exentosTecnologia++;
      if (resultado.requierePermisoSanitario || resultado.requierePermisoAgricola) requierenPermiso++;
      if (resultado.alertaFraude) alertasFraude++;
    }

    devLog(`[CourierHub] ${guias.length} guías: ${verde}🟢 ${amarillo}🟡 ${rojo}🔴, Fraude: ${alertasFraude}`);

    return {
      analisis,
      resumen: {
        totalGuias: guias.length,
        verde, amarillo, rojo,
        exentosTecnologia,
        requierenPermiso,
        alertasFraude,
        valorTotalUSD: Math.round(valorTotal * 100) / 100,
        pesoTotalLb: Math.round(pesoTotal * 100) / 100,
      },
    };
  }

  /**
   * Analiza una guía individual — agnóstico de transportista.
   * Se basa exclusivamente en el Arancel de Panamá.
   */
  static analizarGuia(guia: ManifestRow): AnalisisGuiaCourier {
    const descLower = guia.description.toLowerCase();
    const observaciones: string[] = [];
    const keywordsDetectadas: string[] = [];

    // 1. Detectar categoría por keywords (Arancel de Panamá)
    const esTecnologia = KEYWORDS_TECNOLOGIA.some(kw => {
      if (descLower.includes(kw)) {
        keywordsDetectadas.push(kw);
        return true;
      }
      return false;
    });

    const esSanitario = KEYWORDS_SANITARIO.some(kw => {
      if (descLower.includes(kw)) {
        keywordsDetectadas.push(kw);
        return true;
      }
      return false;
    });

    const esAgricola = KEYWORDS_AGRICOLA.some(kw => {
      if (descLower.includes(kw)) {
        keywordsDetectadas.push(kw);
        return true;
      }
      return false;
    });

    // 2. Aplicar exención DAI para tecnología
    let exencionDAI = false;
    let daiAplicable = 15;
    if (esTecnologia && !esSanitario) {
      exencionDAI = true;
      daiAplicable = 0;
      observaciones.push('DAI 0% — Exención tecnología (Arancel de Panamá, Cap. 84/85)');
    }

    // 3. Detectar permisos sanitarios/agrícolas
    const requierePermisoSanitario = esSanitario;
    const requierePermisoAgricola = esAgricola;

    if (requierePermisoSanitario) {
      observaciones.push('Requiere Permiso Sanitario — MINSA/APA');
    }
    if (requierePermisoAgricola) {
      observaciones.push('Requiere Certificado Fitosanitario — MIDA/AUPSA');
    }

    // 4. Auditoría de valor Zod (consistencia descripción ↔ valor FOB)
    let alertaFraude = false;
    let alertaFraudeDetalle: string | undefined;
    let stellaMensaje: string | undefined;

    for (const item of ITEMS_ALTO_VALOR) {
      if (descLower.includes(item.keyword) && guia.valueUSD < UMBRAL_FRAUDE_VALOR) {
        alertaFraude = true;
        alertaFraudeDetalle = `"${item.keyword}" declarado a $${guia.valueUSD.toFixed(2)} (valor mínimo esperado: $${item.valorMinimo})`;
        stellaMensaje = `Alerta de Cumplimiento: Valor inconsistente detectado para el ítem "${guia.description}". Declarado a $${guia.valueUSD.toFixed(2)} vs. mínimo esperado $${item.valorMinimo}. Riesgo de sanción administrativa (RECAUCA Art. 68, Decreto Ley 1/2008 Art. 42).`;
        observaciones.push(`🚨 VALOR INCONSISTENTE: ${alertaFraudeDetalle}`);
        break;
      }
    }

    // Also check for suspiciously low values on electronics in general
    if (!alertaFraude && esTecnologia && guia.valueUSD < UMBRAL_FRAUDE_VALOR) {
      alertaFraude = true;
      alertaFraudeDetalle = `Artículo electrónico declarado a $${guia.valueUSD.toFixed(2)} — valor inconsistente con descripción`;
      stellaMensaje = `Alerta de Cumplimiento: Valor inconsistente detectado. Riesgo de sanción administrativa.`;
      observaciones.push(`🚨 VALOR INCONSISTENTE: ${alertaFraudeDetalle}`);
    }

    // 5. Determinar semáforo
    let semaforo: SemaforoCumplimiento;
    if (alertaFraude) {
      semaforo = 'rojo';
    } else if (requierePermisoSanitario || requierePermisoAgricola) {
      semaforo = 'amarillo';
    } else {
      semaforo = 'verde';
    }

    // 6. Determinar categoría
    let categoriaDetectada = 'General';
    if (esTecnologia) categoriaDetectada = 'Electrónica';
    else if (esSanitario) categoriaDetectada = 'Sanitario';
    else if (esAgricola) categoriaDetectada = 'Agrícola';

    return {
      guia,
      semaforo,
      categoriaDetectada,
      exencionDAI,
      requierePermisoSanitario,
      requierePermisoAgricola,
      alertaFraude,
      alertaFraudeDetalle,
      stellaMensaje,
      daiAplicable,
      observaciones,
      keywordsDetectadas,
    };
  }

  /**
   * Genera archivo de exportación dinámico para {partner.erpSystemName}.
   * El formato se adapta al estándar técnico del socio seleccionado.
   */
  static generarExportacionERP(
    analisis: AnalisisGuiaCourier[],
    partner: PartnerConfig,
    formato?: 'csv' | 'json' | 'xml'
  ): { contenido: string; nombre: string; mime: string } {
    const fecha = new Date().toISOString().split('T')[0];
    const partnerTag = partner.name.replace(/\s+/g, '_').toUpperCase();
    const fmt = formato || partner.defaultExportFormat;

    const buildRecord = (a: AnalisisGuiaCourier) => ({
      AWB: a.guia.trackingNumber,
      MAWB: a.guia.mawb || '',
      CONSIGNEE: a.guia.recipient,
      CONSIGNEE_ID: a.guia.identification || '',
      ADDRESS: a.guia.address,
      DESCRIPTION: a.guia.description,
      VALUE_USD: a.guia.valueUSD,
      WEIGHT_LB: a.guia.weight,
      HS_CODE: a.guia.hsCode || '',
      CATEGORY: a.categoriaDetectada,
      COMPLIANCE_STATUS: a.semaforo.toUpperCase(),
      DAI_PERCENT: a.daiAplicable,
      DAI_EXEMPT: a.exencionDAI,
      REQUIRES_HEALTH_PERMIT: a.requierePermisoSanitario,
      REQUIRES_AGRI_PERMIT: a.requierePermisoAgricola,
      FRAUD_ALERT: a.alertaFraude,
      FRAUD_DETAIL: a.alertaFraudeDetalle || '',
      CUSTOMS_CATEGORY: ConfigService.clasificarPorValor(a.guia.valueUSD * 1.08),
      KEYWORDS: a.keywordsDetectadas.join('; '),
      OBSERVATIONS: a.observaciones.join(' | '),
    });

    if (fmt === 'json') {
      const data = analisis.map(buildRecord);
      return {
        contenido: JSON.stringify({
          header: {
            system: `ZENITH Universal Gateway`,
            partner: partner.name,
            version: '3.0',
            exportDate: new Date().toISOString(),
            totalRecords: data.length,
          },
          records: data,
        }, null, 2),
        nombre: `${partnerTag}_GATEWAY_EXPORT_${fecha}.json`,
        mime: 'application/json',
      };
    }

    if (fmt === 'xml') {
      const records = analisis.map(a => {
        const r = buildRecord(a);
        const fields = Object.entries(r)
          .map(([k, v]) => `    <${k}>${String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</${k}>`)
          .join('\n');
        return `  <record>\n${fields}\n  </record>`;
      });
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<GatewayExport partner="${partner.name}" date="${new Date().toISOString()}" total="${analisis.length}">\n${records.join('\n')}\n</GatewayExport>`;
      return {
        contenido: xml,
        nombre: `${partnerTag}_GATEWAY_EXPORT_${fecha}.xml`,
        mime: 'application/xml',
      };
    }

    // CSV format (default)
    const headers = [
      'AWB', 'MAWB', 'CONSIGNEE', 'CONSIGNEE_ID', 'ADDRESS',
      'DESCRIPTION', 'VALUE_USD', 'WEIGHT_LB', 'HS_CODE',
      'CATEGORY', 'COMPLIANCE_STATUS', 'DAI_PERCENT', 'DAI_EXEMPT',
      'REQUIRES_HEALTH_PERMIT', 'REQUIRES_AGRI_PERMIT',
      'FRAUD_ALERT', 'CUSTOMS_CATEGORY', 'OBSERVATIONS',
    ];

    const rows = analisis.map(a => [
      a.guia.trackingNumber,
      a.guia.mawb || '',
      `"${a.guia.recipient}"`,
      a.guia.identification || '',
      `"${a.guia.address}"`,
      `"${a.guia.description}"`,
      a.guia.valueUSD.toFixed(2),
      a.guia.weight.toFixed(2),
      a.guia.hsCode || '',
      a.categoriaDetectada,
      a.semaforo.toUpperCase(),
      a.daiAplicable.toString(),
      a.exencionDAI ? 'YES' : 'NO',
      a.requierePermisoSanitario ? 'YES' : 'NO',
      a.requierePermisoAgricola ? 'YES' : 'NO',
      a.alertaFraude ? 'YES' : 'NO',
      ConfigService.clasificarPorValor(a.guia.valueUSD * 1.08),
      `"${a.observaciones.join(' | ')}"`,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    return {
      contenido: csv,
      nombre: `${partnerTag}_GATEWAY_EXPORT_${fecha}.csv`,
      mime: 'text/csv',
    };
  }

  /**
   * Descarga el archivo de exportación para el socio activo.
   */
  static descargarExportacion(
    analisis: AnalisisGuiaCourier[],
    partner: PartnerConfig,
    formato?: 'csv' | 'json' | 'xml'
  ): void {
    const { contenido, nombre, mime } = this.generarExportacionERP(analisis, partner, formato);
    const blob = new Blob([contenido], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export default MotorCourierHub;
