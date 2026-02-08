// ============================================
// MOTOR FINANCIERO — Tarifarios y Generador SAP B1
// Fórmulas: % CIF, Tarifa Plana, Recargos Especiales
// Exportación: CSV/Excel con mapeo OINV/INV1
// ============================================

import * as XLSX from 'xlsx';
import FileSaver from 'file-saver';

// ─── Tipos ───

export interface TarifarioCorredor {
  id: string;
  corredorId: string;
  nombre: string;
  descripcion?: string;
  tipoFormula: 'porcentaje_cif' | 'tarifa_plana' | 'mixto';
  porcentajeCIF: number;
  tarifaPlana: number;
  tarifaMinima: number; // Res. 222
  recargos: RecargosEspeciales;
  handlingPorPaquete: number;
  activo: boolean;
}

export interface RecargosEspeciales {
  fumigacion: number;
  inspeccion: number;
  almacenajeDia: number;
  courier: number;
  perecederos: number;
  peligrosos: number;
}

export interface LineaServicio {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  codigoSAP: string;
  cuentaContable: string;
}

export interface FacturaSAPB1 {
  // Header OINV
  docNum: string;
  docDate: string;
  cardCode: string; // Código cliente SAP
  cardName: string; // Razón social
  ruc: string;
  referencia: string; // MAWB
  moneda: string;
  
  // Lines INV1
  lineas: LineaServicio[];
  
  // Totales
  subtotal: number;
  itbms: number;
  total: number;
  
  // Metadata
  expedienteId: string;
  corredorNombre: string;
  timestamp: string;
}

export interface ValidacionFactura {
  valido: boolean;
  errores: string[];
}

// ─── Cálculos ───

/**
 * Calcula honorarios según tarifario del corredor
 */
export function calcularHonorariosTarifario(
  tarifario: TarifarioCorredor,
  valorCIF: number,
  cantidadPaquetes: number,
  serviciosEspeciales: Partial<Record<keyof RecargosEspeciales, boolean>> = {}
): { lineas: LineaServicio[]; subtotal: number; itbms: number; total: number } {
  const lineas: LineaServicio[] = [];

  // 1. Honorario base según fórmula
  let honorarioBase = 0;
  if (tarifario.tipoFormula === 'porcentaje_cif') {
    honorarioBase = Math.max(valorCIF * (tarifario.porcentajeCIF / 100), tarifario.tarifaMinima);
  } else if (tarifario.tipoFormula === 'tarifa_plana') {
    honorarioBase = Math.max(tarifario.tarifaPlana, tarifario.tarifaMinima);
  } else {
    // mixto: % CIF + tarifa plana
    honorarioBase = Math.max(
      (valorCIF * (tarifario.porcentajeCIF / 100)) + tarifario.tarifaPlana,
      tarifario.tarifaMinima
    );
  }

  lineas.push({
    descripcion: `Honorarios de Corretaje Aduanero (Res. 222)`,
    cantidad: 1,
    precioUnitario: honorarioBase,
    total: honorarioBase,
    codigoSAP: 'SRV-HON-001',
    cuentaContable: '4110-01',
  });

  // 2. Handling
  if (cantidadPaquetes > 0 && tarifario.handlingPorPaquete > 0) {
    const totalHandling = cantidadPaquetes * tarifario.handlingPorPaquete;
    lineas.push({
      descripcion: `Manejo de Carga (${cantidadPaquetes} paquetes × $${tarifario.handlingPorPaquete.toFixed(2)})`,
      cantidad: cantidadPaquetes,
      precioUnitario: tarifario.handlingPorPaquete,
      total: totalHandling,
      codigoSAP: 'SRV-HDL-001',
      cuentaContable: '4110-02',
    });
  }

  // 3. Recargos por servicios especiales
  const recargoMap: { key: keyof RecargosEspeciales; label: string; codigo: string; cuenta: string }[] = [
    { key: 'fumigacion', label: 'Fumigación Fitosanitaria', codigo: 'SRV-FUM-001', cuenta: '4110-03' },
    { key: 'inspeccion', label: 'Inspección Física Especial', codigo: 'SRV-INS-001', cuenta: '4110-04' },
    { key: 'courier', label: 'Servicio Courier Aduanero', codigo: 'SRV-COU-001', cuenta: '4110-06' },
    { key: 'perecederos', label: 'Recargo Mercancía Perecedera', codigo: 'SRV-PER-001', cuenta: '4110-07' },
    { key: 'peligrosos', label: 'Recargo Mercancía Peligrosa', codigo: 'SRV-PEL-001', cuenta: '4110-08' },
  ];

  for (const r of recargoMap) {
    if (serviciosEspeciales[r.key] && tarifario.recargos[r.key] > 0) {
      lineas.push({
        descripcion: r.label,
        cantidad: 1,
        precioUnitario: tarifario.recargos[r.key],
        total: tarifario.recargos[r.key],
        codigoSAP: r.codigo,
        cuentaContable: r.cuenta,
      });
    }
  }

  // Almacenaje (por día)
  if (serviciosEspeciales.almacenajeDia && tarifario.recargos.almacenajeDia > 0) {
    const diasAlmacenaje = 1; // default 1 día
    lineas.push({
      descripcion: `Almacenaje Aduanero (${diasAlmacenaje} día(s))`,
      cantidad: diasAlmacenaje,
      precioUnitario: tarifario.recargos.almacenajeDia,
      total: diasAlmacenaje * tarifario.recargos.almacenajeDia,
      codigoSAP: 'SRV-ALM-001',
      cuentaContable: '4110-05',
    });
  }

  const subtotal = lineas.reduce((s, l) => s + l.total, 0);
  const itbms = subtotal * 0.07;
  const total = subtotal + itbms;

  return { lineas, subtotal, itbms, total };
}

// ─── Validación Zod antes de exportar ───

/**
 * Zod valida que RUC y razón social existan antes de permitir exportación SAP
 */
export function zodValidarDatosFacturacion(datos: {
  ruc?: string;
  razonSocial?: string;
  mawb?: string;
  valorCIF?: number;
}): ValidacionFactura {
  const errores: string[] = [];

  if (!datos.ruc || datos.ruc.trim().length < 3) {
    errores.push('RUC/Cédula del consignatario es obligatorio para generar factura SAP. Art. 680 Código Fiscal.');
  }

  if (!datos.razonSocial || datos.razonSocial.trim().length < 3) {
    errores.push('Razón Social del consignatario es obligatoria. Requerido por OINV.CardName.');
  }

  if (!datos.mawb || datos.mawb.trim().length < 5) {
    errores.push('Referencia MAWB/BL es obligatoria para trazabilidad de la factura.');
  }

  if (!datos.valorCIF || datos.valorCIF <= 0) {
    errores.push('Valor CIF debe ser mayor a cero para calcular honorarios.');
  }

  return { valido: errores.length === 0, errores };
}

// ─── Generador SAP B1 ───

/**
 * Genera archivo Excel con formato SAP B1 (OINV/INV1)
 */
export function generarArchivoSAPB1(factura: FacturaSAPB1, formato: 'csv' | 'excel' = 'excel'): void {
  // Hoja 1: Header (OINV)
  const headerData = [
    ['DocNum', 'DocDate', 'CardCode', 'CardName', 'NumAtCard', 'DocCur', 'TaxDate', 'Comments'],
    [
      factura.docNum,
      factura.docDate,
      factura.cardCode,
      factura.cardName,
      factura.referencia,
      factura.moneda,
      factura.docDate,
      `Despacho Aduanero MAWB ${factura.referencia} - ${factura.corredorNombre}`,
    ],
  ];

  // Hoja 2: Lines (INV1)
  const linesData = [
    ['DocEntry', 'LineNum', 'ItemCode', 'Dscription', 'Quantity', 'Price', 'LineTotal', 'AcctCode', 'TaxCode', 'Currency'],
    ...factura.lineas.map((l, idx) => [
      factura.docNum,
      idx,
      l.codigoSAP,
      l.descripcion,
      l.cantidad,
      l.precioUnitario.toFixed(2),
      l.total.toFixed(2),
      l.cuentaContable,
      'ITBMS',
      factura.moneda,
    ]),
  ];

  // Hoja 3: Totales
  const totalesData = [
    ['Concepto', 'Monto'],
    ['Subtotal', factura.subtotal.toFixed(2)],
    ['ITBMS (7%)', factura.itbms.toFixed(2)],
    ['Total', factura.total.toFixed(2)],
    ['', ''],
    ['RUC', factura.ruc],
    ['Razón Social', factura.cardName],
    ['Referencia', factura.referencia],
    ['Corredor', factura.corredorNombre],
    ['Fecha', factura.timestamp],
    ['Expediente', factura.expedienteId],
  ];

  if (formato === 'csv') {
    const csvContent = [
      '--- OINV HEADER ---',
      ...headerData.map(row => row.join(',')),
      '',
      '--- INV1 LINES ---',
      ...linesData.map(row => row.join(',')),
      '',
      '--- TOTALES ---',
      ...totalesData.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    FileSaver.saveAs(blob, `SAP_B1_${factura.referencia}_${factura.docDate}.csv`);
  } else {
    const wb = XLSX.utils.book_new();

    const wsHeader = XLSX.utils.aoa_to_sheet(headerData);
    XLSX.utils.book_append_sheet(wb, wsHeader, 'OINV Header');

    const wsLines = XLSX.utils.aoa_to_sheet(linesData);
    XLSX.utils.book_append_sheet(wb, wsLines, 'INV1 Lines');

    const wsTotales = XLSX.utils.aoa_to_sheet(totalesData);
    XLSX.utils.book_append_sheet(wb, wsTotales, 'Totales');

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    FileSaver.saveAs(blob, `SAP_B1_${factura.referencia}_${factura.docDate}.xlsx`);
  }
}

// ─── Alertas Stella (Facturación) ───

export interface AlertaFacturacion {
  tipo: 'levante_sin_facturar' | 'factura_pendiente' | 'cobro_vencido';
  titulo: string;
  descripcion: string;
  expedienteId: string;
  mawb: string;
  horasDesdelevante: number;
  severidad: 'info' | 'advertencia' | 'critico';
}

/**
 * Stella detecta trámites con levante otorgado pero sin facturación en 24+ horas
 */
export function stellaDetectarPendientesFacturacion(expedientes: {
  id: string;
  mawb: string;
  consignatario: string;
  estado: string;
  fechaLevante?: string;
  facturado: boolean;
}[]): AlertaFacturacion[] {
  const alertas: AlertaFacturacion[] = [];
  const ahora = new Date();

  for (const exp of expedientes) {
    if (exp.estado === 'transmitido' && exp.fechaLevante && !exp.facturado) {
      const levante = new Date(exp.fechaLevante);
      const horasDiff = (ahora.getTime() - levante.getTime()) / (1000 * 60 * 60);

      if (horasDiff >= 24) {
        alertas.push({
          tipo: 'levante_sin_facturar',
          titulo: `⚡ Trámite con Levante sin Facturar (${Math.floor(horasDiff)}h)`,
          descripcion: `Stella al Dpto. Finanzas: El trámite MAWB ${exp.mawb} (${exp.consignatario}) obtuvo levante hace ${Math.floor(horasDiff)} horas pero no ha sido enviado a facturación. Art. 48 Decreto 41/2002 — Obligación de cobro.`,
          expedienteId: exp.id,
          mawb: exp.mawb,
          horasDesdelevante: horasDiff,
          severidad: horasDiff >= 48 ? 'critico' : 'advertencia',
        });
      }
    }
  }

  return alertas;
}

// ─── Tarifario Demo ───

export function generarTarifarioDemo(): TarifarioCorredor {
  return {
    id: 'tar-demo-001',
    corredorId: 'corr-demo-001',
    nombre: 'Tarifario Estándar 2026',
    descripcion: 'Tarifario base conforme a Res. 222/2025',
    tipoFormula: 'porcentaje_cif',
    porcentajeCIF: 0.27,
    tarifaPlana: 80,
    tarifaMinima: 60,
    recargos: {
      fumigacion: 75,
      inspeccion: 50,
      almacenajeDia: 15,
      courier: 35,
      perecederos: 45,
      peligrosos: 120,
    },
    handlingPorPaquete: 5,
    activo: true,
  };
}
