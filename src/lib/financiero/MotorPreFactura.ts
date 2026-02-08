// ============================================
// MOTOR PRE-FACTURA — Workflow de Aprobación
// Estados: DRAFT → PENDING_APPROVAL → APPROVED → SENT_TO_SAP
// Reglas Fiscales: ITBMS 7% solo servicios, Res. 222, DGI/ANA
// Integración: Stella (notificaciones) + Zod (validación)
// ============================================

import CryptoJS from 'crypto-js';

// ─── Tipos ───

export type BillingStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT_TO_SAP';

/** Categorías fiscales DGI Panamá */
export type CategoriaFiscal = 'honorarios' | 'handling' | 'recargo' | 'reembolsable';

/** Categorías gravables vs exentas de ITBMS */
const CATEGORIAS_GRAVABLES: CategoriaFiscal[] = ['honorarios', 'handling', 'recargo'];
const CATEGORIAS_EXENTAS: CategoriaFiscal[] = ['reembolsable'];

export interface SoporteTercero {
  id: string;
  tipo: 'recibo_ana' | 'almacenaje' | 'flete' | 'seguro' | 'fumigacion' | 'otro';
  descripcion: string;
  monto: number;
  moneda: string;
  referencia: string;
  fecha: string;
  urlPDF?: string;
  tienePDF: boolean; // Stella verifica adjuntos
}

export interface DatosFiscalesCliente {
  ruc: string;            // Registro Único de Contribuyente
  dv: string;             // Dígito Verificador
  razonSocial: string;
  tipoContribuyente: 'natural' | 'juridica';
}

export interface PreFactura {
  id: string;
  embarqueId: string;
  corredorId?: string;
  operadorId: string;
  docNum: string;
  mawb: string;
  consignatario: string;
  ruc?: string;
  dv?: string;            // Dígito Verificador — Campo obligatorio DGI
  razonSocial?: string;
  numLiquidacion?: string; // Número de Liquidación Aduanera ANA
  valorCIF?: number;       // Para cálculo Res. 222
  moneda: string;
  lineas: LineaPreFactura[];
  soportesTerceros: SoporteTercero[];
  subtotal: number;
  subtotalGravable: number;   // Solo servicios gravables (ITBMS)
  subtotalExento: number;     // Gastos reembolsables (0% ITBMS)
  itbms: number;
  total: number;
  billingStatus: BillingStatus;
  aprobadoPorCliente: boolean;
  clienteAprobacionTimestamp?: string;
  clienteAprobacionIP?: string;
  clienteAprobacionNombre?: string;
  tokenAprobacion?: string;
  tokenExpiracion?: string;
  rechazado: boolean;
  rechazoMotivo?: string;
  rechazoTimestamp?: string;
  rechazoPor?: string;
  sapExportado: boolean;
  zodHashIntegridad?: string;
  zodValidado: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LineaPreFactura {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  codigoSAP: string;
  cuentaContable: string;
  categoria: CategoriaFiscal;
  itbmsAplicable: boolean;  // true = 7%, false = exento
  itbmsLinea: number;       // Monto ITBMS de esta línea
}

export interface TransicionEstado {
  de: BillingStatus;
  a: BillingStatus;
  permitida: boolean;
  requiereRol?: string;
  razon?: string;
}

export interface ValidacionPreFactura {
  valida: boolean;
  errores: string[];
  advertencias: string[];
  bloqueos: BloqueoZod[];
  puntaje: number;
}

export interface BloqueoZod {
  codigo: string;
  titulo: string;
  descripcion: string;
  fundamento: string;
  tipo: 'bloqueo' | 'advertencia';
}

export interface AlertaStellaBilling {
  tipo: 'levante_sin_prefactura' | 'prefactura_pendiente' | 'cliente_aprobado' | 'rechazo_cliente' | 'soporte_sin_pdf';
  titulo: string;
  descripcion: string;
  expedienteId: string;
  mawb: string;
  severidad: 'info' | 'advertencia' | 'critico';
  timestamp: string;
}

// ─── Resolución 222 — Honorarios Mínimos ───

/**
 * Calcula el honorario mínimo legal según Res. 222/2025 ANA
 * - CIF <= $2,499.99: $60.00 fijo
 * - CIF >= $2,500.00: (CIF × 0.0027) + $80.00
 */
export function calcularHonorarioMinimoRes222(valorCIF: number): {
  minimo: number;
  formula: string;
  rango: string;
} {
  if (valorCIF <= 2499.99) {
    return {
      minimo: 60.00,
      formula: 'Tarifa Fija $60.00',
      rango: 'CIF ≤ $2,499.99',
    };
  }
  const minimo = (valorCIF * 0.0027) + 80.00;
  return {
    minimo: Math.round(minimo * 100) / 100,
    formula: `(CIF × 0.27%) + $80.00 = $${minimo.toFixed(2)}`,
    rango: 'CIF ≥ $2,500.00',
  };
}

// ─── Algoritmo ITBMS DGI/ANA ───

/**
 * Calcula ITBMS aplicando 7% solo a servicios gravables (honorarios, handling, recargos)
 * y 0% a gastos exentos/reembolsables (tasas ANA, aranceles, almacenaje terceros)
 */
export function calcularITBMSPorCategoria(lineas: LineaPreFactura[]): {
  subtotalGravable: number;
  subtotalExento: number;
  itbms: number;
  detalle: { categoria: string; subtotal: number; itbmsRate: string; itbms: number }[];
} {
  const detalle: { categoria: string; subtotal: number; itbmsRate: string; itbms: number }[] = [];

  // Servicios gravables (7% ITBMS)
  const gravables = lineas.filter(l => CATEGORIAS_GRAVABLES.includes(l.categoria));
  const subtotalGravable = gravables.reduce((s, l) => s + l.total, 0);
  const itbmsGravable = subtotalGravable * 0.07;

  if (gravables.length > 0) {
    detalle.push({
      categoria: 'Servicios de Corretaje (Gravable)',
      subtotal: subtotalGravable,
      itbmsRate: '7%',
      itbms: itbmsGravable,
    });
  }

  // Gastos exentos (0% ITBMS)
  const exentos = lineas.filter(l => CATEGORIAS_EXENTAS.includes(l.categoria));
  const subtotalExento = exentos.reduce((s, l) => s + l.total, 0);

  if (exentos.length > 0) {
    detalle.push({
      categoria: 'Gastos Reembolsables (Exento)',
      subtotal: subtotalExento,
      itbmsRate: '0%',
      itbms: 0,
    });
  }

  return {
    subtotalGravable,
    subtotalExento,
    itbms: Math.round(itbmsGravable * 100) / 100,
    detalle,
  };
}

/**
 * Enriquece líneas con flags de ITBMS por categoría
 */
export function enriquecerLineasConITBMS(lineas: LineaPreFactura[]): LineaPreFactura[] {
  return lineas.map(linea => {
    const itbmsAplicable = CATEGORIAS_GRAVABLES.includes(linea.categoria);
    return {
      ...linea,
      itbmsAplicable,
      itbmsLinea: itbmsAplicable ? Math.round(linea.total * 0.07 * 100) / 100 : 0,
    };
  });
}

// ─── Validación DV (Dígito Verificador) ───

/**
 * Valida formato de RUC panameño con DV
 * Formatos: Natural (X-XXX-XXXX), Jurídica (XXXXXXXXX-X-XXXX), NT (N/T)
 */
export function validarRUCPanama(ruc: string, dv: string): {
  valido: boolean;
  tipo: string;
  error?: string;
} {
  if (!ruc || ruc.trim().length < 3) {
    return { valido: false, tipo: 'desconocido', error: 'RUC es obligatorio' };
  }

  if (!dv || dv.trim().length < 1 || dv.trim().length > 2) {
    return { valido: false, tipo: 'desconocido', error: 'Dígito Verificador (DV) es obligatorio (1-2 dígitos)' };
  }

  // Validar que DV sea numérico
  if (!/^\d{1,2}$/.test(dv.trim())) {
    return { valido: false, tipo: 'desconocido', error: 'DV debe ser numérico (1-2 dígitos)' };
  }

  // Detectar tipo
  const rucClean = ruc.trim();
  const esNatural = /^\d{1,2}-\d{1,4}-\d{1,6}$/.test(rucClean);
  const esJuridica = /^\d+-\d+-\d+$/.test(rucClean) && rucClean.split('-').length >= 3;

  return {
    valido: true,
    tipo: esNatural ? 'Natural' : esJuridica ? 'Jurídica' : 'Otro',
  };
}

// ─── Transiciones Válidas ───

const TRANSICIONES: TransicionEstado[] = [
  { de: 'DRAFT', a: 'PENDING_APPROVAL', permitida: true },
  { de: 'PENDING_APPROVAL', a: 'DRAFT', permitida: true, razon: 'Corrección por rechazo' },
  { de: 'PENDING_APPROVAL', a: 'APPROVED', permitida: true, razon: 'Aprobación del cliente' },
  { de: 'APPROVED', a: 'SENT_TO_SAP', permitida: true, requiereRol: 'revisor' },
  { de: 'DRAFT', a: 'APPROVED', permitida: false, razon: 'Debe pasar por aprobación' },
  { de: 'DRAFT', a: 'SENT_TO_SAP', permitida: false, razon: 'Debe ser aprobada primero' },
  { de: 'SENT_TO_SAP', a: 'DRAFT', permitida: false, razon: 'SAP export es irreversible' },
  { de: 'SENT_TO_SAP', a: 'PENDING_APPROVAL', permitida: false, razon: 'SAP export es irreversible' },
  { de: 'SENT_TO_SAP', a: 'APPROVED', permitida: false, razon: 'SAP export es irreversible' },
];

export function validarTransicion(de: BillingStatus, a: BillingStatus): TransicionEstado {
  const transicion = TRANSICIONES.find(t => t.de === de && t.a === a);
  if (!transicion) {
    return { de, a, permitida: false, razon: `Transición ${de} → ${a} no está definida` };
  }
  return transicion;
}

// ─── Validación Zod Completa ───

/**
 * Zod valida la pre-factura con reglas fiscales DGI/ANA
 * - RUC + DV obligatorios
 * - ITBMS solo sobre servicios gravables
 * - Honorarios mínimos Res. 222
 * - Stella verifica PDFs en reembolsables
 */
export function zodValidarPreFactura(preFactura: Partial<PreFactura>): ValidacionPreFactura {
  const errores: string[] = [];
  const advertencias: string[] = [];
  const bloqueos: BloqueoZod[] = [];
  let puntaje = 100;

  // ── 1. Datos Fiscales Obligatorios ──

  if (!preFactura.ruc || preFactura.ruc.trim().length < 3) {
    errores.push('RUC del consignatario es obligatorio. Art. 680 Código Fiscal.');
    puntaje -= 20;
  }

  if (!preFactura.dv || preFactura.dv.trim().length === 0) {
    errores.push('Dígito Verificador (DV) es obligatorio según DGI Panamá.');
    puntaje -= 10;
  } else if (preFactura.ruc) {
    const validacionRUC = validarRUCPanama(preFactura.ruc, preFactura.dv);
    if (!validacionRUC.valido) {
      errores.push(`RUC/DV inválido: ${validacionRUC.error}`);
      puntaje -= 10;
    }
  }

  if (!preFactura.razonSocial || preFactura.razonSocial.trim().length < 3) {
    errores.push('Razón Social es obligatoria para generar la pre-factura.');
    puntaje -= 15;
  }

  if (!preFactura.mawb || preFactura.mawb.trim().length < 5) {
    errores.push('Referencia MAWB/BL es obligatoria para trazabilidad.');
    puntaje -= 10;
  }

  // ── 2. Número de Liquidación Aduanera ──

  if (!preFactura.numLiquidacion || preFactura.numLiquidacion.trim().length < 3) {
    advertencias.push('Número de Liquidación Aduanera (ANA) no registrado. Recomendado para trazabilidad fiscal.');
  }

  // ── 3. Líneas de servicio ──

  if (!preFactura.lineas || preFactura.lineas.length === 0) {
    errores.push('La pre-factura debe contener al menos una línea de servicio.');
    puntaje -= 20;
  }

  // ── 4. Validar ITBMS por categoría (Regla DGI) ──

  if (preFactura.lineas && preFactura.lineas.length > 0) {
    const calculo = calcularITBMSPorCategoria(preFactura.lineas);

    // Verificar que ITBMS calculado coincida
    const itbmsEsperado = calculo.itbms;
    const itbmsRegistrado = preFactura.itbms || 0;
    const difITBMS = Math.abs(itbmsEsperado - itbmsRegistrado);
    if (difITBMS > 0.02) {
      errores.push(
        `Discrepancia ITBMS: esperado $${itbmsEsperado.toFixed(2)} (7% sobre servicios gravables $${calculo.subtotalGravable.toFixed(2)}) vs registrado $${itbmsRegistrado.toFixed(2)}. Gastos reembolsables ($${calculo.subtotalExento.toFixed(2)}) son exentos de ITBMS.`
      );
      puntaje -= 15;
    }

    // Verificar subtotales
    const subtotalCalculado = preFactura.lineas.reduce((s, l) => s + l.total, 0);
    const diferencia = Math.abs((preFactura.subtotal || 0) - subtotalCalculado);
    if (diferencia > 0.02) {
      errores.push(`Discrepancia en subtotal: calculado $${subtotalCalculado.toFixed(2)} vs registrado $${(preFactura.subtotal || 0).toFixed(2)}`);
      puntaje -= 10;
    }
  }

  // ── 5. Validar Honorarios Mínimos — Res. 222 ──

  if (preFactura.valorCIF && preFactura.valorCIF > 0 && preFactura.lineas) {
    const res222 = calcularHonorarioMinimoRes222(preFactura.valorCIF);
    const lineaHonorarios = preFactura.lineas.find(l => l.categoria === 'honorarios');

    if (lineaHonorarios && lineaHonorarios.total < res222.minimo) {
      bloqueos.push({
        codigo: 'RES222_MINIMO',
        titulo: 'Honorarios por debajo del mínimo legal (Res. 222)',
        descripcion: `Los honorarios de corretaje ($${lineaHonorarios.total.toFixed(2)}) son inferiores al mínimo legal de $${res222.minimo.toFixed(2)} para un CIF de $${preFactura.valorCIF.toFixed(2)}.`,
        fundamento: `Resolución 222/2025 ANA — ${res222.rango}: ${res222.formula}`,
        tipo: 'bloqueo',
      });
      errores.push(`Veredicto de Zod: Honorarios por debajo del mínimo legal (Res. 222). Mínimo: $${res222.minimo.toFixed(2)}. Ajuste obligatorio para cumplir con la normativa de la ANA.`);
      puntaje -= 25;
    }
  }

  // ── 6. Stella: Verificar PDFs en Reembolsables ──

  if (preFactura.soportesTerceros && preFactura.soportesTerceros.length > 0) {
    const sinPDF = preFactura.soportesTerceros.filter(s => !s.tienePDF);
    if (sinPDF.length > 0) {
      const nombres = sinPDF.map(s => s.descripcion).join(', ');
      errores.push(`Stella: ${sinPDF.length} gasto(s) reembolsable(s) sin PDF adjunto: ${nombres}. Cada gasto debe tener su comprobante escaneado antes de enviar al cliente.`);
      puntaje -= 10;
    }
  } else if (preFactura.lineas?.some(l => l.categoria === 'reembolsable')) {
    advertencias.push('Hay líneas reembolsables pero no se registraron soportes de terceros.');
  }

  // ── 7. Total ──

  if (!preFactura.total || preFactura.total <= 0) {
    errores.push('El total de la pre-factura debe ser mayor a cero.');
    puntaje -= 15;
  }

  return {
    valida: errores.length === 0,
    errores,
    advertencias,
    bloqueos,
    puntaje: Math.max(0, puntaje),
  };
}

// ─── Hash & Token ───

export function generarHashIntegridad(preFactura: Partial<PreFactura>): string {
  const contenido = JSON.stringify({
    docNum: preFactura.docNum,
    mawb: preFactura.mawb,
    consignatario: preFactura.consignatario,
    ruc: preFactura.ruc,
    dv: preFactura.dv,
    numLiquidacion: preFactura.numLiquidacion,
    lineas: preFactura.lineas,
    subtotal: preFactura.subtotal,
    subtotalGravable: preFactura.subtotalGravable,
    subtotalExento: preFactura.subtotalExento,
    itbms: preFactura.itbms,
    total: preFactura.total,
    timestamp: new Date().toISOString(),
  });
  return CryptoJS.SHA256(contenido).toString();
}

export function generarTokenAprobacion(): { token: string; expiracion: string } {
  const token = CryptoJS.lib.WordArray.random(32).toString();
  const expiracion = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  return { token, expiracion };
}

// ─── Stella Alertas ───

export function stellaDetectarSinPreFactura(expedientes: {
  id: string;
  mawb: string;
  consignatario: string;
  estado: string;
  fechaLevante?: string;
  billingStatus: BillingStatus;
}[]): AlertaStellaBilling[] {
  const alertas: AlertaStellaBilling[] = [];
  const ahora = new Date();

  for (const exp of expedientes) {
    if (exp.estado === 'transmitido' && exp.fechaLevante && exp.billingStatus === 'DRAFT') {
      const levante = new Date(exp.fechaLevante);
      const horasDiff = (ahora.getTime() - levante.getTime()) / (1000 * 60 * 60);

      if (horasDiff >= 4) {
        alertas.push({
          tipo: 'levante_sin_prefactura',
          titulo: `📋 Levante sin Pre-Factura (${Math.floor(horasDiff)}h)`,
          descripcion: `Stella al Operador: El trámite MAWB ${exp.mawb} (${exp.consignatario}) obtuvo levante hace ${Math.floor(horasDiff)} horas pero no se ha generado la pre-factura. Genera la pre-factura y envíala al cliente para aprobación.`,
          expedienteId: exp.id,
          mawb: exp.mawb,
          severidad: horasDiff >= 24 ? 'critico' : 'advertencia',
          timestamp: ahora.toISOString(),
        });
      }
    }

    if (exp.billingStatus === 'PENDING_APPROVAL') {
      alertas.push({
        tipo: 'prefactura_pendiente',
        titulo: `⏳ Pre-Factura Pendiente de Aprobación`,
        descripcion: `Stella: La pre-factura del MAWB ${exp.mawb} está esperando aprobación del cliente. Considere hacer seguimiento.`,
        expedienteId: exp.id,
        mawb: exp.mawb,
        severidad: 'info',
        timestamp: ahora.toISOString(),
      });
    }
  }

  return alertas;
}

// ─── Etiquetas de Estado ───

export const BILLING_STATUS_LABELS: Record<BillingStatus, { label: string; color: string; icon: string }> = {
  DRAFT: { label: 'Borrador', color: 'text-muted-foreground', icon: '📝' },
  PENDING_APPROVAL: { label: 'Aprobación Pendiente', color: 'text-amber-400', icon: '⏳' },
  APPROVED: { label: 'Aprobada', color: 'text-green-400', icon: '✅' },
  SENT_TO_SAP: { label: 'Enviado a SAP', color: 'text-primary', icon: '📤' },
};

// ─── Demo Data ───

export function generarSoportesTercerosDemo(): SoporteTercero[] {
  return [
    {
      id: 'sop-001',
      tipo: 'recibo_ana',
      descripcion: 'Recibo ANA — Derechos de Importación (DAI)',
      monto: 1250.00,
      moneda: 'USD',
      referencia: 'ANA-2026-FEB-0891',
      fecha: '2026-02-07',
      tienePDF: true,
      urlPDF: '#recibo-ana-0891',
    },
    {
      id: 'sop-002',
      tipo: 'almacenaje',
      descripcion: 'Almacenaje Tocumen — 3 días',
      monto: 45.00,
      moneda: 'USD',
      referencia: 'ALM-TCM-2026-1102',
      fecha: '2026-02-06',
      tienePDF: true,
      urlPDF: '#alm-tcm-1102',
    },
    {
      id: 'sop-003',
      tipo: 'fumigacion',
      descripcion: 'Servicio de Fumigación MIDA',
      monto: 75.00,
      moneda: 'USD',
      referencia: 'FUM-MIDA-2026-0234',
      fecha: '2026-02-07',
      tienePDF: true,
      urlPDF: '#fum-mida-0234',
    },
  ];
}

export function generarPreFacturaDemo(): PreFactura {
  const lineasBase: LineaPreFactura[] = [
    {
      descripcion: 'Honorarios de Corretaje Aduanero (Res. 222)',
      cantidad: 1,
      precioUnitario: 157.63,
      total: 157.63,
      codigoSAP: 'SRV-HON-001',
      cuentaContable: '4110-01',
      categoria: 'honorarios',
      itbmsAplicable: true,
      itbmsLinea: 11.03,
    },
    {
      descripcion: 'Manejo de Carga (45 paquetes × $5.00)',
      cantidad: 45,
      precioUnitario: 5.00,
      total: 225.00,
      codigoSAP: 'SRV-HDL-001',
      cuentaContable: '4110-02',
      categoria: 'handling',
      itbmsAplicable: true,
      itbmsLinea: 15.75,
    },
    {
      descripcion: 'Inspección Física Especial',
      cantidad: 1,
      precioUnitario: 50.00,
      total: 50.00,
      codigoSAP: 'SRV-INS-001',
      cuentaContable: '4110-04',
      categoria: 'recargo',
      itbmsAplicable: true,
      itbmsLinea: 3.50,
    },
    {
      descripcion: 'Reembolso — Derechos ANA (DAI + Tasa)',
      cantidad: 1,
      precioUnitario: 1250.00,
      total: 1250.00,
      codigoSAP: 'SRV-RMB-001',
      cuentaContable: '4120-01',
      categoria: 'reembolsable',
      itbmsAplicable: false,
      itbmsLinea: 0,
    },
    {
      descripcion: 'Reembolso — Almacenaje Tocumen',
      cantidad: 1,
      precioUnitario: 45.00,
      total: 45.00,
      codigoSAP: 'SRV-RMB-002',
      cuentaContable: '4120-02',
      categoria: 'reembolsable',
      itbmsAplicable: false,
      itbmsLinea: 0,
    },
  ];

  const { subtotalGravable, subtotalExento, itbms } = calcularITBMSPorCategoria(lineasBase);
  const subtotal = subtotalGravable + subtotalExento;
  const total = subtotal + itbms;

  return {
    id: 'pf-demo-001',
    embarqueId: 'emb-demo-001',
    operadorId: 'op-demo-001',
    docNum: `PF-${Date.now().toString(36).toUpperCase()}`,
    mawb: '123-45678901',
    consignatario: 'Distribuidora Pacífica S.A.',
    ruc: '155612345-2-2021',
    dv: '45',
    razonSocial: 'Distribuidora Pacífica S.A.',
    numLiquidacion: 'LIQ-ANA-2026-00891',
    valorCIF: 28750.00,
    moneda: 'USD',
    lineas: lineasBase,
    soportesTerceros: generarSoportesTercerosDemo(),
    subtotal,
    subtotalGravable,
    subtotalExento,
    itbms,
    total,
    billingStatus: 'DRAFT',
    aprobadoPorCliente: false,
    rechazado: false,
    sapExportado: false,
    zodValidado: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
