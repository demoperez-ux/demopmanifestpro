// ============================================
// MOTOR PRE-FACTURA — Workflow de Aprobación
// Estados: DRAFT → PENDING_APPROVAL → APPROVED → SENT_TO_SAP
// Integración: Stella (notificaciones) + Zod (validación)
// ============================================

import CryptoJS from 'crypto-js';

// ─── Tipos ───

export type BillingStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT_TO_SAP';

export interface SoporteTercero {
  id: string;
  tipo: 'recibo_ana' | 'almacenaje' | 'flete' | 'seguro' | 'fumigacion' | 'otro';
  descripcion: string;
  monto: number;
  moneda: string;
  referencia: string;
  fecha: string;
  urlPDF?: string;
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
  razonSocial?: string;
  moneda: string;
  lineas: LineaPreFactura[];
  soportesTerceros: SoporteTercero[];
  subtotal: number;
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
  categoria: 'honorarios' | 'handling' | 'recargo' | 'reembolsable';
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
  puntaje: number;
}

export interface AlertaStellaBilling {
  tipo: 'levante_sin_prefactura' | 'prefactura_pendiente' | 'cliente_aprobado' | 'rechazo_cliente';
  titulo: string;
  descripcion: string;
  expedienteId: string;
  mawb: string;
  severidad: 'info' | 'advertencia' | 'critico';
  timestamp: string;
}

// ─── Transiciones Válidas ───

const TRANSICIONES: TransicionEstado[] = [
  { de: 'DRAFT', a: 'PENDING_APPROVAL', permitida: true },
  { de: 'PENDING_APPROVAL', a: 'DRAFT', permitida: true, razon: 'Corrección por rechazo' },
  { de: 'PENDING_APPROVAL', a: 'APPROVED', permitida: true, razon: 'Aprobación del cliente' },
  { de: 'APPROVED', a: 'SENT_TO_SAP', permitida: true, requiereRol: 'revisor' },
  // Transiciones NO permitidas
  { de: 'DRAFT', a: 'APPROVED', permitida: false, razon: 'Debe pasar por aprobación' },
  { de: 'DRAFT', a: 'SENT_TO_SAP', permitida: false, razon: 'Debe ser aprobada primero' },
  { de: 'SENT_TO_SAP', a: 'DRAFT', permitida: false, razon: 'SAP export es irreversible' },
  { de: 'SENT_TO_SAP', a: 'PENDING_APPROVAL', permitida: false, razon: 'SAP export es irreversible' },
  { de: 'SENT_TO_SAP', a: 'APPROVED', permitida: false, razon: 'SAP export es irreversible' },
];

// ─── Motor de Workflow ───

/**
 * Valida si una transición de estado es permitida
 */
export function validarTransicion(de: BillingStatus, a: BillingStatus): TransicionEstado {
  const transicion = TRANSICIONES.find(t => t.de === de && t.a === a);
  if (!transicion) {
    return { de, a, permitida: false, razon: `Transición ${de} → ${a} no está definida` };
  }
  return transicion;
}

/**
 * Zod valida la pre-factura antes de enviar a aprobación
 */
export function zodValidarPreFactura(preFactura: Partial<PreFactura>): ValidacionPreFactura {
  const errores: string[] = [];
  const advertencias: string[] = [];
  let puntaje = 100;

  // Datos obligatorios del consignatario
  if (!preFactura.ruc || preFactura.ruc.trim().length < 3) {
    errores.push('RUC/Cédula del consignatario es obligatorio. Art. 680 Código Fiscal.');
    puntaje -= 25;
  }

  if (!preFactura.razonSocial || preFactura.razonSocial.trim().length < 3) {
    errores.push('Razón Social es obligatoria para generar la pre-factura.');
    puntaje -= 20;
  }

  if (!preFactura.mawb || preFactura.mawb.trim().length < 5) {
    errores.push('Referencia MAWB/BL es obligatoria para trazabilidad.');
    puntaje -= 15;
  }

  // Líneas de servicio
  if (!preFactura.lineas || preFactura.lineas.length === 0) {
    errores.push('La pre-factura debe contener al menos una línea de servicio.');
    puntaje -= 20;
  }

  // Validar totales
  if (preFactura.lineas && preFactura.lineas.length > 0) {
    const subtotalCalculado = preFactura.lineas.reduce((s, l) => s + l.total, 0);
    const diferencia = Math.abs((preFactura.subtotal || 0) - subtotalCalculado);
    if (diferencia > 0.01) {
      errores.push(`Discrepancia en subtotal: calculado $${subtotalCalculado.toFixed(2)} vs registrado $${(preFactura.subtotal || 0).toFixed(2)}`);
      puntaje -= 15;
    }
  }

  // Soportes de terceros
  if (!preFactura.soportesTerceros || preFactura.soportesTerceros.length === 0) {
    advertencias.push('No hay soportes de terceros adjuntos. Considere incluir recibos ANA/almacenaje.');
  }

  // Total
  if (!preFactura.total || preFactura.total <= 0) {
    errores.push('El total de la pre-factura debe ser mayor a cero.');
    puntaje -= 20;
  }

  return {
    valida: errores.length === 0,
    errores,
    advertencias,
    puntaje: Math.max(0, puntaje),
  };
}

/**
 * Genera hash SHA-256 de integridad para la pre-factura
 */
export function generarHashIntegridad(preFactura: Partial<PreFactura>): string {
  const contenido = JSON.stringify({
    docNum: preFactura.docNum,
    mawb: preFactura.mawb,
    consignatario: preFactura.consignatario,
    ruc: preFactura.ruc,
    lineas: preFactura.lineas,
    subtotal: preFactura.subtotal,
    itbms: preFactura.itbms,
    total: preFactura.total,
    timestamp: new Date().toISOString(),
  });
  return CryptoJS.SHA256(contenido).toString();
}

/**
 * Genera token único de aprobación para el cliente
 */
export function generarTokenAprobacion(): { token: string; expiracion: string } {
  const token = CryptoJS.lib.WordArray.random(32).toString();
  const expiracion = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 días
  return { token, expiracion };
}

/**
 * Stella detecta expedientes con levante concedido sin pre-factura
 */
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
    // Levante concedido pero sin pre-factura generada
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

    // Pre-factura pendiente de aprobación por más de 48h
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
      descripcion: 'Recibo ANA — Derechos de Importación',
      monto: 1250.00,
      moneda: 'USD',
      referencia: 'ANA-2026-FEB-0891',
      fecha: '2026-02-07',
    },
    {
      id: 'sop-002',
      tipo: 'almacenaje',
      descripcion: 'Almacenaje Tocumen — 3 días',
      monto: 45.00,
      moneda: 'USD',
      referencia: 'ALM-TCM-2026-1102',
      fecha: '2026-02-06',
    },
    {
      id: 'sop-003',
      tipo: 'fumigacion',
      descripcion: 'Servicio de Fumigación MIDA',
      monto: 75.00,
      moneda: 'USD',
      referencia: 'FUM-MIDA-2026-0234',
      fecha: '2026-02-07',
    },
  ];
}

export function generarPreFacturaDemo(): PreFactura {
  return {
    id: 'pf-demo-001',
    embarqueId: 'emb-demo-001',
    operadorId: 'op-demo-001',
    docNum: `PF-${Date.now().toString(36).toUpperCase()}`,
    mawb: '123-45678901',
    consignatario: 'Distribuidora Pacífica S.A.',
    ruc: '155612345-2-2021',
    razonSocial: 'Distribuidora Pacífica S.A.',
    moneda: 'USD',
    lineas: [
      {
        descripcion: 'Honorarios de Corretaje Aduanero (Res. 222)',
        cantidad: 1,
        precioUnitario: 77.63,
        total: 77.63,
        codigoSAP: 'SRV-HON-001',
        cuentaContable: '4110-01',
        categoria: 'honorarios',
      },
      {
        descripcion: 'Manejo de Carga (45 paquetes × $5.00)',
        cantidad: 45,
        precioUnitario: 5.00,
        total: 225.00,
        codigoSAP: 'SRV-HDL-001',
        cuentaContable: '4110-02',
        categoria: 'handling',
      },
      {
        descripcion: 'Inspección Física Especial',
        cantidad: 1,
        precioUnitario: 50.00,
        total: 50.00,
        codigoSAP: 'SRV-INS-001',
        cuentaContable: '4110-04',
        categoria: 'recargo',
      },
      {
        descripcion: 'Reembolso — Derechos ANA',
        cantidad: 1,
        precioUnitario: 1250.00,
        total: 1250.00,
        codigoSAP: 'SRV-RMB-001',
        cuentaContable: '4120-01',
        categoria: 'reembolsable',
      },
      {
        descripcion: 'Reembolso — Almacenaje Tocumen',
        cantidad: 1,
        precioUnitario: 45.00,
        total: 45.00,
        codigoSAP: 'SRV-RMB-002',
        cuentaContable: '4120-02',
        categoria: 'reembolsable',
      },
    ],
    soportesTerceros: generarSoportesTercerosDemo(),
    subtotal: 1647.63,
    itbms: 24.63, // Solo sobre honorarios+handling+recargos (no reembolsables)
    total: 1672.26,
    billingStatus: 'DRAFT',
    aprobadoPorCliente: false,
    rechazado: false,
    sapExportado: false,
    zodValidado: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
