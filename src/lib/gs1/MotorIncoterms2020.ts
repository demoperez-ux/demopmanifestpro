// ============================================
// MOTOR DE INCOTERMS 2020 (ICC) — ZENITH
// Cálculo de Valor CIF según Incoterm seleccionado
// Integrado con MotorLiquidacionSIGA
// ============================================

import { devLog, devWarn } from '@/lib/logger';

// ============ TIPOS ============

export type Incoterm2020 =
  | 'EXW'  // Ex Works
  | 'FCA'  // Free Carrier
  | 'FAS'  // Free Alongside Ship
  | 'FOB'  // Free on Board
  | 'CPT'  // Carriage Paid To
  | 'CIP'  // Carriage and Insurance Paid To
  | 'CFR'  // Cost and Freight
  | 'CIF'  // Cost, Insurance and Freight
  | 'DAP'  // Delivered at Place
  | 'DPU'  // Delivered at Place Unloaded
  | 'DDP'; // Delivered Duty Paid

export interface CostosTransporte {
  fleteInternoOrigen?: number;      // Flete desde fábrica a puerto/aeropuerto origen
  despachoExportacion?: number;      // Gastos de despacho de exportación
  fleteInternacional: number;        // Flete marítimo/aéreo internacional
  seguroInternacional?: number;      // Seguro de la carga
  descargaDestino?: number;          // Gastos de descarga en destino
  fleteInternoDestino?: number;      // Flete desde puerto a almacén destino
  derechosDutiPaid?: number;         // Impuestos/aranceles (solo DDP)
}

export interface ResultadoCIF {
  incoterm: Incoterm2020;
  valorTermino: number;              // Valor declarado bajo el incoterm
  valorFOB: number;                  // FOB calculado
  valorFlete: number;                // Flete hasta destino
  valorSeguro: number;               // Seguro
  valorCIF: number;                  // CIF final para liquidación
  seguroTeorico: boolean;            // Si el seguro fue estimado
  fleteEstimado: boolean;            // Si el flete fue estimado
  ajustesAplicados: string[];        // Descripción de ajustes
  fundamentoLegal: string;           // Base legal ICC
  zodAlertasRequeridas: string[];    // Alertas que Zod debe validar
}

// ============ REGLAS ICC POR INCOTERM ============

interface ReglaIncoterm {
  nombre: string;
  descripcion: string;
  incluyeFleteInternacional: boolean;
  incluyeSeguro: boolean;
  incluyeDespachoExportacion: boolean;
  incluyeFleteInterno: boolean;
  modoTransporte: 'cualquiera' | 'maritimo';
  riesgoTransferencia: string;
}

const REGLAS_INCOTERMS: Record<Incoterm2020, ReglaIncoterm> = {
  EXW: {
    nombre: 'Ex Works',
    descripcion: 'El vendedor entrega en su fábrica. El comprador asume todos los costos y riesgos.',
    incluyeFleteInternacional: false,
    incluyeSeguro: false,
    incluyeDespachoExportacion: false,
    incluyeFleteInterno: false,
    modoTransporte: 'cualquiera',
    riesgoTransferencia: 'En fábrica del vendedor',
  },
  FCA: {
    nombre: 'Free Carrier',
    descripcion: 'El vendedor entrega en el lugar convenido al transportista designado por el comprador.',
    incluyeFleteInternacional: false,
    incluyeSeguro: false,
    incluyeDespachoExportacion: true,
    incluyeFleteInterno: false,
    modoTransporte: 'cualquiera',
    riesgoTransferencia: 'En lugar de entrega al transportista',
  },
  FAS: {
    nombre: 'Free Alongside Ship',
    descripcion: 'El vendedor entrega al costado del buque en el puerto de embarque.',
    incluyeFleteInternacional: false,
    incluyeSeguro: false,
    incluyeDespachoExportacion: true,
    incluyeFleteInterno: true,
    modoTransporte: 'maritimo',
    riesgoTransferencia: 'Al costado del buque en puerto de embarque',
  },
  FOB: {
    nombre: 'Free on Board',
    descripcion: 'El vendedor entrega la mercancía a bordo del buque en el puerto de embarque.',
    incluyeFleteInternacional: false,
    incluyeSeguro: false,
    incluyeDespachoExportacion: true,
    incluyeFleteInterno: true,
    modoTransporte: 'maritimo',
    riesgoTransferencia: 'A bordo del buque en puerto de embarque',
  },
  CPT: {
    nombre: 'Carriage Paid To',
    descripcion: 'El vendedor paga el flete hasta el destino, pero el riesgo se transfiere al entregar al transportista.',
    incluyeFleteInternacional: true,
    incluyeSeguro: false,
    incluyeDespachoExportacion: true,
    incluyeFleteInterno: true,
    modoTransporte: 'cualquiera',
    riesgoTransferencia: 'Al entregar al primer transportista',
  },
  CIP: {
    nombre: 'Carriage and Insurance Paid To',
    descripcion: 'Como CPT, pero el vendedor también contrata el seguro.',
    incluyeFleteInternacional: true,
    incluyeSeguro: true,
    incluyeDespachoExportacion: true,
    incluyeFleteInterno: true,
    modoTransporte: 'cualquiera',
    riesgoTransferencia: 'Al entregar al primer transportista',
  },
  CFR: {
    nombre: 'Cost and Freight',
    descripcion: 'El vendedor paga los costos y el flete hasta el puerto de destino.',
    incluyeFleteInternacional: true,
    incluyeSeguro: false,
    incluyeDespachoExportacion: true,
    incluyeFleteInterno: true,
    modoTransporte: 'maritimo',
    riesgoTransferencia: 'A bordo del buque en puerto de embarque',
  },
  CIF: {
    nombre: 'Cost, Insurance and Freight',
    descripcion: 'El vendedor paga costos, seguro y flete hasta el puerto de destino.',
    incluyeFleteInternacional: true,
    incluyeSeguro: true,
    incluyeDespachoExportacion: true,
    incluyeFleteInterno: true,
    modoTransporte: 'maritimo',
    riesgoTransferencia: 'A bordo del buque en puerto de embarque',
  },
  DAP: {
    nombre: 'Delivered at Place',
    descripcion: 'El vendedor entrega la mercancía sin descargar en el lugar de destino.',
    incluyeFleteInternacional: true,
    incluyeSeguro: false,
    incluyeDespachoExportacion: true,
    incluyeFleteInterno: true,
    modoTransporte: 'cualquiera',
    riesgoTransferencia: 'En el lugar de destino convenido',
  },
  DPU: {
    nombre: 'Delivered at Place Unloaded',
    descripcion: 'El vendedor entrega la mercancía descargada en el lugar de destino.',
    incluyeFleteInternacional: true,
    incluyeSeguro: false,
    incluyeDespachoExportacion: true,
    incluyeFleteInterno: true,
    modoTransporte: 'cualquiera',
    riesgoTransferencia: 'En el lugar de destino, descargada',
  },
  DDP: {
    nombre: 'Delivered Duty Paid',
    descripcion: 'El vendedor asume todos los costos incluyendo impuestos de importación.',
    incluyeFleteInternacional: true,
    incluyeSeguro: true,
    incluyeDespachoExportacion: true,
    incluyeFleteInterno: true,
    modoTransporte: 'cualquiera',
    riesgoTransferencia: 'En el lugar de destino convenido',
  },
};

// ============ MOTOR DE CÁLCULO ============

/**
 * Calcula el Valor CIF según el Incoterm seleccionado
 * Art. 1-8 del Acuerdo de Valoración Aduanera (OMC)
 */
export function calcularCIFPorIncoterm(
  valorDeclarado: number,
  incoterm: Incoterm2020,
  costos: Partial<CostosTransporte> = {}
): ResultadoCIF {
  const redondear = (v: number) => Math.round(v * 100) / 100;
  const regla = REGLAS_INCOTERMS[incoterm];
  const ajustes: string[] = [];
  const zodAlertas: string[] = [];

  let valorFOB: number;
  let valorFlete: number;
  let valorSeguro: number;
  let seguroTeorico = false;
  let fleteEstimado = false;

  switch (incoterm) {
    case 'EXW': {
      // EXW: Valor es en fábrica. Necesitamos sumar TODO.
      const fleteInterno = costos.fleteInternoOrigen ?? redondear(valorDeclarado * 0.03);
      const despacho = costos.despachoExportacion ?? redondear(valorDeclarado * 0.01);
      const fleteIntl = costos.fleteInternacional ?? 0;
      const seguro = costos.seguroInternacional ?? redondear(valorDeclarado * 0.01);

      if (!costos.fleteInternacional) {
        zodAlertas.push('Zod requiere flete internacional para Incoterm EXW. Se usó estimación.');
        fleteEstimado = true;
      }
      if (!costos.fleteInternoOrigen) {
        ajustes.push(`Flete interno origen estimado (3%): $${fleteInterno.toFixed(2)}`);
      }
      if (!costos.despachoExportacion) {
        ajustes.push(`Despacho exportación estimado (1%): $${despacho.toFixed(2)}`);
      }
      if (!costos.seguroInternacional) {
        seguroTeorico = true;
        ajustes.push(`Seguro teórico (1%): $${seguro.toFixed(2)}`);
      }

      valorFOB = redondear(valorDeclarado + fleteInterno + despacho);
      valorFlete = fleteIntl || redondear(valorDeclarado * 0.07);
      valorSeguro = seguro;

      if (!fleteIntl) {
        fleteEstimado = true;
        zodAlertas.push('Flete internacional no proporcionado para EXW. Zod exige documentación de costos.');
      }
      break;
    }

    case 'FCA':
    case 'FAS': {
      // FCA/FAS: Incluye despacho. Falta flete intl y seguro.
      const fleteIntl = costos.fleteInternacional ?? redondear(valorDeclarado * 0.07);
      const seguro = costos.seguroInternacional ?? redondear(valorDeclarado * 0.01);

      if (!costos.fleteInternacional) {
        fleteEstimado = true;
        ajustes.push(`Flete internacional estimado (7%): $${fleteIntl.toFixed(2)}`);
      }
      if (!costos.seguroInternacional) {
        seguroTeorico = true;
        ajustes.push(`Seguro teórico (1%): $${seguro.toFixed(2)}`);
      }

      valorFOB = valorDeclarado;
      valorFlete = fleteIntl;
      valorSeguro = seguro;
      break;
    }

    case 'FOB': {
      // FOB: Valor incluye todo hasta bordo del buque. Falta flete intl y seguro.
      const fleteIntl = costos.fleteInternacional ?? redondear(valorDeclarado * 0.07);
      const seguro = costos.seguroInternacional ?? redondear(valorDeclarado * 0.01);

      if (!costos.fleteInternacional) {
        fleteEstimado = true;
        ajustes.push(`Flete internacional estimado (7%): $${fleteIntl.toFixed(2)}`);
      }
      if (!costos.seguroInternacional) {
        seguroTeorico = true;
        ajustes.push(`Seguro teórico (1%): $${seguro.toFixed(2)}`);
      }

      valorFOB = valorDeclarado;
      valorFlete = fleteIntl;
      valorSeguro = seguro;
      break;
    }

    case 'CPT':
    case 'CFR': {
      // CPT/CFR: Incluye flete, no seguro.
      const seguro = costos.seguroInternacional ?? redondear(valorDeclarado * 0.01);
      const fleteIntl = costos.fleteInternacional ?? redondear(valorDeclarado * 0.07);

      // Descomponer: FOB = Valor - Flete
      valorFOB = redondear(valorDeclarado - fleteIntl);
      valorFlete = fleteIntl;

      if (!costos.seguroInternacional) {
        seguroTeorico = true;
        ajustes.push(`Seguro teórico (1%): $${seguro.toFixed(2)}`);
      }
      valorSeguro = seguro;
      break;
    }

    case 'CIP':
    case 'CIF': {
      // CIF/CIP: Ya incluye flete y seguro.
      const fleteIntl = costos.fleteInternacional ?? redondear(valorDeclarado * 0.07);
      const seguro = costos.seguroInternacional ?? redondear(valorDeclarado * 0.01);

      // CIF value already contains everything
      valorFOB = redondear(valorDeclarado - fleteIntl - seguro);
      valorFlete = fleteIntl;
      valorSeguro = seguro;

      if (!costos.seguroInternacional) {
        zodAlertas.push('Incoterm CIF/CIP: Zod requiere que el seguro esté desglosado en la factura comercial.');
      }
      break;
    }

    case 'DAP':
    case 'DPU': {
      // DAP/DPU: Incluye flete y descarga. No incluye aranceles.
      const fleteIntl = costos.fleteInternacional ?? redondear(valorDeclarado * 0.07);
      const seguro = costos.seguroInternacional ?? redondear(valorDeclarado * 0.01);
      const descarga = costos.descargaDestino ?? 0;

      valorFOB = redondear(valorDeclarado - fleteIntl - descarga);
      valorFlete = fleteIntl;
      valorSeguro = seguro;

      if (!costos.seguroInternacional) {
        seguroTeorico = true;
        ajustes.push(`Seguro teórico (1%): $${seguro.toFixed(2)}`);
      }
      break;
    }

    case 'DDP': {
      // DDP: Incluye TODO, incluyendo aranceles. Necesitamos extraer.
      const fleteIntl = costos.fleteInternacional ?? redondear(valorDeclarado * 0.07);
      const seguro = costos.seguroInternacional ?? redondear(valorDeclarado * 0.01);
      const derechos = costos.derechosDutiPaid ?? 0;

      valorFOB = redondear(valorDeclarado - fleteIntl - seguro - derechos);
      valorFlete = fleteIntl;
      valorSeguro = seguro;

      zodAlertas.push('DDP: Zod requiere desglose de impuestos pagados para evitar doble tributación.');
      ajustes.push(`Derechos DDP deducidos: $${derechos.toFixed(2)}`);
      break;
    }

    default:
      valorFOB = valorDeclarado;
      valorFlete = costos.fleteInternacional ?? redondear(valorDeclarado * 0.07);
      valorSeguro = costos.seguroInternacional ?? redondear(valorDeclarado * 0.01);
  }

  const valorCIF = redondear(valorFOB + valorFlete + valorSeguro);

  devLog(`[ICC] ${incoterm}: Declarado=$${valorDeclarado} → FOB=$${valorFOB}, Flete=$${valorFlete}, Seguro=$${valorSeguro}, CIF=$${valorCIF}`);

  return {
    incoterm,
    valorTermino: valorDeclarado,
    valorFOB,
    valorFlete,
    valorSeguro,
    valorCIF,
    seguroTeorico,
    fleteEstimado,
    ajustesAplicados: ajustes,
    fundamentoLegal: `Incoterms® 2020 ICC — Regla ${incoterm} (${regla.nombre}). Art. 1-8 Acuerdo Valoración Aduanera OMC.`,
    zodAlertasRequeridas: zodAlertas,
  };
}

/**
 * Obtiene información de un Incoterm
 */
export function obtenerInfoIncoterm(incoterm: Incoterm2020): ReglaIncoterm {
  return REGLAS_INCOTERMS[incoterm];
}

/**
 * Lista todos los Incoterms disponibles
 */
export function listarIncoterms(): { codigo: Incoterm2020; nombre: string; descripcion: string; modo: string }[] {
  return (Object.entries(REGLAS_INCOTERMS) as [Incoterm2020, ReglaIncoterm][]).map(([codigo, regla]) => ({
    codigo,
    nombre: regla.nombre,
    descripcion: regla.descripcion,
    modo: regla.modoTransporte === 'maritimo' ? 'Solo Marítimo' : 'Cualquier Modo',
  }));
}

export default {
  calcularCIFPorIncoterm,
  obtenerInfoIncoterm,
  listarIncoterms,
};
