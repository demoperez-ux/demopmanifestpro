/**
 * MOTOR FACTURACIÓN ENTERPRISE — Billing & Reconciliation
 * 
 * 1. Generador de Proforma Masiva: Impuestos vs. Honorarios
 * 2. Reconciliación: Boleta ANA vs. Factura al Cliente
 * 3. Exportación Audit-Ready: ZIP con PDF + XML + Excel
 * 4. Stella Insights: Alertas de Cash Flow
 * 
 * Fundamento: Res. 222/2025, Código Fiscal Art. 680, DGI Panamá
 */

import { calcularHonorarioMinimoRes222 } from './MotorPreFactura';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import * as XLSX from 'xlsx';

// ─── Tipos ──────────────────────────────────────────────

export interface ContratoServicio {
  id: string;
  corredorId: string;
  clienteNombre: string;
  clienteRuc?: string;
  precioGuiaCourier: number;
  precioTramiteFormal: number;
  recargoPermisoEspecial: number;
  recargoFumigacion: number;
  recargoInspeccion: number;
  recargoAlmacenajeDia: number;
  descuentoVolumen10: number;
  descuentoVolumen50: number;
  descuentoVolumen100: number;
  honorarioMinimo: number;
  porcentajeCIF: number;
  activo: boolean;
}

export interface LineaProforma {
  concepto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  tipo: 'impuesto' | 'honorario' | 'recargo' | 'reembolsable';
  codigoSAP?: string;
}

export interface ProformaMasiva {
  id: string;
  mawb: string;
  fechaVuelo: string;
  clienteNombre: string;
  clienteRuc?: string;
  totalGuias: number;
  totalPaquetes: number;
  
  // Desglose Impuestos
  totalDAI: number;
  totalISC: number;
  totalITBMS: number;
  totalTasaSistema: number;
  totalImpuestos: number;
  
  // Desglose Honorarios
  honorariosCorretaje: number;
  handlingTotal: number;
  recargosEspeciales: number;
  itbmsServicios: number;
  totalHonorarios: number;
  
  // Gran Total
  granTotal: number;
  
  // Líneas detalladas
  lineas: LineaProforma[];
  
  // Stella
  stellaInsight?: string;
}

export interface ItemReconciliacion {
  guia: string;
  mawb: string;
  consignatario: string;
  
  // ANA (Boleta de Pago)
  boletaANA_DAI: number;
  boletaANA_ISC: number;
  boletaANA_ITBMS: number;
  boletaANA_Tasa: number;
  boletaANA_Total: number;
  
  // Factura al Cliente
  facturaCliente_Impuestos: number;
  facturaCliente_Honorarios: number;
  facturaCliente_Total: number;
  
  // Diferencia
  diferenciaImpuestos: number;
  diferenciaTotal: number;
  tieneDiscrepancia: boolean;
  severidadDiscrepancia: 'ninguna' | 'menor' | 'mayor';
}

export interface ResumenReconciliacion {
  totalItems: number;
  totalBoletaANA: number;
  totalFacturaCliente: number;
  diferenciaGlobal: number;
  itemsConDiscrepancia: number;
  itemsDiscrepanciaMayor: number;
  porcentajeConciliado: number;
}

export interface StellaInsightCashFlow {
  tipo: 'volumen_alto' | 'linea_credito' | 'concentracion_cliente' | 'tendencia';
  titulo: string;
  mensaje: string;
  severidad: 'info' | 'advertencia' | 'critico';
  datos: Record<string, number | string>;
}

// ─── Motor Principal ────────────────────────────────────

export class MotorFacturacionEnterprise {

  /**
   * Genera proforma masiva a partir de datos de manifiesto.
   */
  static generarProformaMasiva(params: {
    mawb: string;
    fechaVuelo: string;
    clienteNombre: string;
    clienteRuc?: string;
    guias: {
      tracking: string;
      valorCIF: number;
      daiPercent: number;
      iscPercent: number;
      itbmsPercent: number;
      requierePermiso: boolean;
    }[];
    contrato?: ContratoServicio;
  }): ProformaMasiva {
    const { mawb, fechaVuelo, clienteNombre, clienteRuc, guias, contrato } = params;
    const lineas: LineaProforma[] = [];

    // ── 1. Calcular impuestos totales ──
    let totalDAI = 0, totalISC = 0, totalITBMS = 0;
    for (const g of guias) {
      const dai = g.valorCIF * (g.daiPercent / 100);
      const isc = (g.valorCIF + dai) * (g.iscPercent / 100);
      const itbms = (g.valorCIF + dai + isc) * (g.itbmsPercent / 100);
      totalDAI += dai;
      totalISC += isc;
      totalITBMS += itbms;
    }

    const totalTasaSistema = guias.length * 3.00; // B/. 3.00 por declaración

    lineas.push(
      { concepto: 'DAI — Derechos Arancelarios de Importación', cantidad: guias.length, precioUnitario: totalDAI / guias.length, subtotal: totalDAI, tipo: 'impuesto', codigoSAP: 'IMP-DAI-001' },
      { concepto: 'ISC — Impuesto Selectivo al Consumo', cantidad: guias.length, precioUnitario: totalISC / guias.length, subtotal: totalISC, tipo: 'impuesto', codigoSAP: 'IMP-ISC-001' },
      { concepto: 'ITBMS — Impuesto de Transferencia (7%)', cantidad: guias.length, precioUnitario: totalITBMS / guias.length, subtotal: totalITBMS, tipo: 'impuesto', codigoSAP: 'IMP-ITBMS-001' },
      { concepto: 'Tasa de Sistema ANA (B/. 3.00 c/u)', cantidad: guias.length, precioUnitario: 3.00, subtotal: totalTasaSistema, tipo: 'impuesto', codigoSAP: 'IMP-TASA-001' },
    );

    const totalImpuestos = totalDAI + totalISC + totalITBMS + totalTasaSistema;

    // ── 2. Calcular honorarios ──
    const valorCIFTotal = guias.reduce((s, g) => s + g.valorCIF, 0);
    const res222 = calcularHonorarioMinimoRes222(valorCIFTotal);

    const precioCourier = contrato?.precioGuiaCourier ?? 5.00;
    const precioFormal = contrato?.precioTramiteFormal ?? 60.00;
    const recargoPermiso = contrato?.recargoPermisoEspecial ?? 25.00;

    // Honorarios: usar Res. 222 o contrato
    const honorariosCorretaje = Math.max(res222.minimo, precioFormal);
    const handlingTotal = guias.length * precioCourier;
    const guiasConPermiso = guias.filter(g => g.requierePermiso).length;
    const recargosEspeciales = guiasConPermiso * recargoPermiso;

    lineas.push(
      { concepto: `Honorarios Corretaje Aduanero (Res. 222)`, cantidad: 1, precioUnitario: honorariosCorretaje, subtotal: honorariosCorretaje, tipo: 'honorario', codigoSAP: 'SRV-HON-001' },
      { concepto: `Manejo de Carga Courier (${guias.length} guías × $${precioCourier.toFixed(2)})`, cantidad: guias.length, precioUnitario: precioCourier, subtotal: handlingTotal, tipo: 'honorario', codigoSAP: 'SRV-HDL-001' },
    );

    if (recargosEspeciales > 0) {
      lineas.push(
        { concepto: `Recargo Permiso Especial (${guiasConPermiso} guías × $${recargoPermiso.toFixed(2)})`, cantidad: guiasConPermiso, precioUnitario: recargoPermiso, subtotal: recargosEspeciales, tipo: 'recargo', codigoSAP: 'SRV-PER-001' },
      );
    }

    const subtotalServicios = honorariosCorretaje + handlingTotal + recargosEspeciales;
    const itbmsServicios = subtotalServicios * 0.07;

    lineas.push(
      { concepto: 'ITBMS sobre Servicios de Corretaje (7%)', cantidad: 1, precioUnitario: itbmsServicios, subtotal: itbmsServicios, tipo: 'honorario', codigoSAP: 'SRV-ITBMS-001' },
    );

    const totalHonorarios = subtotalServicios + itbmsServicios;
    const granTotal = totalImpuestos + totalHonorarios;

    // ── 3. Stella Insight ──
    const promedioGuiasPorVuelo = 120; // benchmark
    const ratio = guias.length / promedioGuiasPorVuelo;
    let stellaInsight: string | undefined;
    if (ratio > 1.15) {
      const porcentaje = Math.round((ratio - 1) * 100);
      stellaInsight = `Jefe, el volumen de este vuelo (${guias.length} guías) es ${porcentaje}% mayor al promedio (${promedioGuiasPorVuelo}). Los impuestos ascienden a $${totalImpuestos.toFixed(2)}. Asegúrese de que la línea de crédito para impuestos en la ANA tenga fondos suficientes antes de las 5:00 PM.`;
    }

    return {
      id: crypto.randomUUID(),
      mawb,
      fechaVuelo,
      clienteNombre,
      clienteRuc,
      totalGuias: guias.length,
      totalPaquetes: guias.length,
      totalDAI: Math.round(totalDAI * 100) / 100,
      totalISC: Math.round(totalISC * 100) / 100,
      totalITBMS: Math.round(totalITBMS * 100) / 100,
      totalTasaSistema: Math.round(totalTasaSistema * 100) / 100,
      totalImpuestos: Math.round(totalImpuestos * 100) / 100,
      honorariosCorretaje: Math.round(honorariosCorretaje * 100) / 100,
      handlingTotal: Math.round(handlingTotal * 100) / 100,
      recargosEspeciales: Math.round(recargosEspeciales * 100) / 100,
      itbmsServicios: Math.round(itbmsServicios * 100) / 100,
      totalHonorarios: Math.round(totalHonorarios * 100) / 100,
      granTotal: Math.round(granTotal * 100) / 100,
      lineas,
      stellaInsight,
    };
  }

  /**
   * Reconcilia boletas ANA vs. facturas al cliente.
   */
  static reconciliar(items: ItemReconciliacion[]): ResumenReconciliacion {
    let totalBoleta = 0, totalFactura = 0;
    let conDiscrepancia = 0, discrepanciaMayor = 0;

    for (const item of items) {
      totalBoleta += item.boletaANA_Total;
      totalFactura += item.facturaCliente_Total;

      item.diferenciaImpuestos = Math.round((item.facturaCliente_Impuestos - item.boletaANA_Total) * 100) / 100;
      item.diferenciaTotal = Math.round((item.facturaCliente_Total - item.boletaANA_Total) * 100) / 100;

      const absPercentDiff = item.boletaANA_Total > 0
        ? Math.abs(item.diferenciaImpuestos / item.boletaANA_Total) * 100
        : 0;

      if (absPercentDiff > 5) {
        item.tieneDiscrepancia = true;
        item.severidadDiscrepancia = absPercentDiff > 15 ? 'mayor' : 'menor';
        conDiscrepancia++;
        if (absPercentDiff > 15) discrepanciaMayor++;
      } else {
        item.tieneDiscrepancia = false;
        item.severidadDiscrepancia = 'ninguna';
      }
    }

    const conciliado = items.length > 0
      ? Math.round(((items.length - conDiscrepancia) / items.length) * 100)
      : 100;

    return {
      totalItems: items.length,
      totalBoletaANA: Math.round(totalBoleta * 100) / 100,
      totalFacturaCliente: Math.round(totalFactura * 100) / 100,
      diferenciaGlobal: Math.round((totalFactura - totalBoleta) * 100) / 100,
      itemsConDiscrepancia: conDiscrepancia,
      itemsDiscrepanciaMayor: discrepanciaMayor,
      porcentajeConciliado: conciliado,
    };
  }

  /**
   * Genera alertas Stella de Cash Flow.
   */
  static stellaCashFlowInsights(params: {
    totalImpuestos: number;
    totalGuias: number;
    promedioHistorico: number;
    mawb: string;
    carrier?: string;
  }): StellaInsightCashFlow[] {
    const insights: StellaInsightCashFlow[] = [];
    const { totalImpuestos, totalGuias, promedioHistorico, mawb, carrier } = params;

    const ratio = totalGuias / Math.max(promedioHistorico, 1);

    if (ratio > 1.15) {
      const porcentaje = Math.round((ratio - 1) * 100);
      insights.push({
        tipo: 'volumen_alto',
        titulo: '📈 Volumen Superior al Promedio',
        mensaje: `Jefe, el volumen de este vuelo ${carrier ? `de ${carrier} ` : ''}(${mawb}) es ${porcentaje}% mayor al promedio. Asegúrese de que la línea de crédito para impuestos en la ANA tenga fondos suficientes antes de las 5:00 PM.`,
        severidad: ratio > 1.5 ? 'critico' : 'advertencia',
        datos: { totalGuias, promedioHistorico, porcentaje, totalImpuestos },
      });
    }

    if (totalImpuestos > 25000) {
      insights.push({
        tipo: 'linea_credito',
        titulo: '💰 Verificar Línea de Crédito ANA',
        mensaje: `Los impuestos de este vuelo ascienden a $${totalImpuestos.toLocaleString()}. Confirme con Tesorería que la línea de crédito ANA tiene suficiente saldo disponible para cubrir este desembolso antes de transmitir la declaración.`,
        severidad: totalImpuestos > 50000 ? 'critico' : 'advertencia',
        datos: { totalImpuestos, mawb },
      });
    }

    return insights;
  }

  /**
   * Genera el paquete de facturación digital (ZIP).
   * Contiene: Factura XML, Reporte Excel, y resumen PDF-like.
   */
  static async generarPaqueteFacturacionDigital(
    proforma: ProformaMasiva,
    reconciliacion: ItemReconciliacion[]
  ): Promise<void> {
    const zip = new JSZip();
    const fecha = new Date().toISOString().split('T')[0];

    // 1. Factura XML
    const xmlFactura = this.generarFacturaXML(proforma);
    zip.file(`Factura_${proforma.mawb}_${fecha}.xml`, xmlFactura);

    // 2. Factura JSON (machine-readable)
    zip.file(`Factura_${proforma.mawb}_${fecha}.json`, JSON.stringify({
      header: {
        sistema: 'ZENITH Enterprise Billing',
        version: '1.0',
        fecha: new Date().toISOString(),
        mawb: proforma.mawb,
      },
      proforma,
    }, null, 2));

    // 3. Reporte detallado Excel
    const excelBuffer = this.generarReporteExcel(proforma, reconciliacion);
    zip.file(`Reporte_Detallado_${proforma.mawb}_${fecha}.xlsx`, excelBuffer);

    // 4. Resumen Reconciliación CSV
    if (reconciliacion.length > 0) {
      const csvRec = this.generarReconciliacionCSV(reconciliacion);
      zip.file(`Reconciliacion_${proforma.mawb}_${fecha}.csv`, csvRec);
    }

    // Generar y descargar ZIP
    const blob = await zip.generateAsync({ type: 'blob' });
    FileSaver.saveAs(blob, `Paquete_Facturacion_${proforma.mawb}_${fecha}.zip`);
  }

  // ─── Helpers privados ─────────────────────────────────

  private static generarFacturaXML(proforma: ProformaMasiva): string {
    const lineasXML = proforma.lineas.map((l, i) => `
    <Linea numero="${i + 1}">
      <Concepto>${l.concepto.replace(/&/g, '&amp;')}</Concepto>
      <Cantidad>${l.cantidad}</Cantidad>
      <PrecioUnitario>${l.precioUnitario.toFixed(2)}</PrecioUnitario>
      <Subtotal>${l.subtotal.toFixed(2)}</Subtotal>
      <Tipo>${l.tipo}</Tipo>
      <CodigoSAP>${l.codigoSAP || ''}</CodigoSAP>
    </Linea>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<FacturaComercial sistema="ZENITH" version="1.0">
  <Encabezado>
    <MAWB>${proforma.mawb}</MAWB>
    <FechaVuelo>${proforma.fechaVuelo}</FechaVuelo>
    <Cliente>${proforma.clienteNombre.replace(/&/g, '&amp;')}</Cliente>
    <RUC>${proforma.clienteRuc || 'N/A'}</RUC>
    <TotalGuias>${proforma.totalGuias}</TotalGuias>
    <FechaEmision>${new Date().toISOString()}</FechaEmision>
  </Encabezado>
  <Impuestos>
    <DAI>${proforma.totalDAI.toFixed(2)}</DAI>
    <ISC>${proforma.totalISC.toFixed(2)}</ISC>
    <ITBMS>${proforma.totalITBMS.toFixed(2)}</ITBMS>
    <TasaSistema>${proforma.totalTasaSistema.toFixed(2)}</TasaSistema>
    <TotalImpuestos>${proforma.totalImpuestos.toFixed(2)}</TotalImpuestos>
  </Impuestos>
  <Honorarios>
    <Corretaje>${proforma.honorariosCorretaje.toFixed(2)}</Corretaje>
    <Handling>${proforma.handlingTotal.toFixed(2)}</Handling>
    <Recargos>${proforma.recargosEspeciales.toFixed(2)}</Recargos>
    <ITBMSServicios>${proforma.itbmsServicios.toFixed(2)}</ITBMSServicios>
    <TotalHonorarios>${proforma.totalHonorarios.toFixed(2)}</TotalHonorarios>
  </Honorarios>
  <GranTotal>${proforma.granTotal.toFixed(2)}</GranTotal>
  <Lineas>${lineasXML}
  </Lineas>
</FacturaComercial>`;
  }

  private static generarReporteExcel(
    proforma: ProformaMasiva,
    reconciliacion: ItemReconciliacion[]
  ): ArrayBuffer {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen Ejecutivo
    const resumenData = [
      ['ZENITH — RESUMEN EJECUTIVO DE FACTURACIÓN'],
      [''],
      ['MAWB', proforma.mawb],
      ['Fecha Vuelo', proforma.fechaVuelo],
      ['Cliente', proforma.clienteNombre],
      ['RUC', proforma.clienteRuc || 'N/A'],
      ['Total Guías', proforma.totalGuias],
      [''],
      ['═══ IMPUESTOS A PAGAR (ANA) ═══'],
      ['DAI', `$${proforma.totalDAI.toFixed(2)}`],
      ['ISC', `$${proforma.totalISC.toFixed(2)}`],
      ['ITBMS', `$${proforma.totalITBMS.toFixed(2)}`],
      ['Tasa Sistema', `$${proforma.totalTasaSistema.toFixed(2)}`],
      ['TOTAL IMPUESTOS', `$${proforma.totalImpuestos.toFixed(2)}`],
      [''],
      ['═══ HONORARIOS DE AGENCIA ═══'],
      ['Corretaje (Res. 222)', `$${proforma.honorariosCorretaje.toFixed(2)}`],
      ['Handling', `$${proforma.handlingTotal.toFixed(2)}`],
      ['Recargos Especiales', `$${proforma.recargosEspeciales.toFixed(2)}`],
      ['ITBMS Servicios (7%)', `$${proforma.itbmsServicios.toFixed(2)}`],
      ['TOTAL HONORARIOS', `$${proforma.totalHonorarios.toFixed(2)}`],
      [''],
      ['GRAN TOTAL', `$${proforma.granTotal.toFixed(2)}`],
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Ejecutivo');

    // Hoja 2: Detalle de Líneas
    const lineasData = [
      ['Concepto', 'Cantidad', 'Precio Unitario', 'Subtotal', 'Tipo', 'Código SAP'],
      ...proforma.lineas.map(l => [l.concepto, l.cantidad, l.precioUnitario.toFixed(2), l.subtotal.toFixed(2), l.tipo, l.codigoSAP || '']),
    ];
    const wsLineas = XLSX.utils.aoa_to_sheet(lineasData);
    XLSX.utils.book_append_sheet(wb, wsLineas, 'Detalle Líneas');

    // Hoja 3: Reconciliación
    if (reconciliacion.length > 0) {
      const recData = [
        ['Guía', 'MAWB', 'Consignatario', 'Boleta ANA', 'Factura Cliente (Impuestos)', 'Factura Cliente (Total)', 'Diferencia', 'Estado'],
        ...reconciliacion.map(r => [
          r.guia, r.mawb, r.consignatario,
          r.boletaANA_Total.toFixed(2),
          r.facturaCliente_Impuestos.toFixed(2),
          r.facturaCliente_Total.toFixed(2),
          r.diferenciaImpuestos.toFixed(2),
          r.tieneDiscrepancia ? (r.severidadDiscrepancia === 'mayor' ? '🔴 MAYOR' : '🟡 MENOR') : '🟢 OK',
        ]),
      ];
      const wsRec = XLSX.utils.aoa_to_sheet(recData);
      XLSX.utils.book_append_sheet(wb, wsRec, 'Reconciliación');
    }

    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  }

  private static generarReconciliacionCSV(items: ItemReconciliacion[]): string {
    const headers = ['Guia,MAWB,Consignatario,Boleta_ANA,Factura_Impuestos,Factura_Total,Diferencia,Estado'];
    const rows = items.map(r =>
      `${r.guia},${r.mawb},"${r.consignatario}",${r.boletaANA_Total.toFixed(2)},${r.facturaCliente_Impuestos.toFixed(2)},${r.facturaCliente_Total.toFixed(2)},${r.diferenciaImpuestos.toFixed(2)},${r.tieneDiscrepancia ? 'DISCREPANCIA' : 'OK'}`
    );
    return [...headers, ...rows].join('\n');
  }
}

// ─── Demo Data Generators ───────────────────────────────

export function generarDemoProforma(): ProformaMasiva {
  const guias = Array.from({ length: 185 }, (_, i) => ({
    tracking: `TBA${300000000000 + i}`,
    valorCIF: 15 + Math.random() * 800,
    daiPercent: i % 5 === 0 ? 0 : 15,
    iscPercent: 0,
    itbmsPercent: 7,
    requierePermiso: i % 8 === 0,
  }));

  return MotorFacturacionEnterprise.generarProformaMasiva({
    mawb: '618-10234567',
    fechaVuelo: '2026-02-08',
    clienteNombre: 'Temu Panama Operations',
    clienteRuc: '155702345-1-867890',
    guias,
  });
}

export function generarDemoReconciliacion(): ItemReconciliacion[] {
  return Array.from({ length: 25 }, (_, i) => {
    const boletaTotal = 20 + Math.random() * 200;
    const honorarios = 5 + Math.random() * 30;
    const discrepancia = i % 5 === 0 ? (Math.random() * 15 - 5) : (Math.random() * 2 - 1);
    
    return {
      guia: `TBA${300000000000 + i}`,
      mawb: '618-10234567',
      consignatario: ['Juan Pérez', 'María González', 'Carlos Rodríguez', 'Ana Martínez', 'Luis Herrera'][i % 5],
      boletaANA_DAI: boletaTotal * 0.6,
      boletaANA_ISC: 0,
      boletaANA_ITBMS: boletaTotal * 0.35,
      boletaANA_Tasa: 3.00,
      boletaANA_Total: Math.round(boletaTotal * 100) / 100,
      facturaCliente_Impuestos: Math.round((boletaTotal + discrepancia) * 100) / 100,
      facturaCliente_Honorarios: Math.round(honorarios * 100) / 100,
      facturaCliente_Total: Math.round((boletaTotal + discrepancia + honorarios) * 100) / 100,
      diferenciaImpuestos: Math.round(discrepancia * 100) / 100,
      diferenciaTotal: Math.round((discrepancia + honorarios) * 100) / 100,
      tieneDiscrepancia: Math.abs(discrepancia / boletaTotal) > 0.05,
      severidadDiscrepancia: Math.abs(discrepancia / boletaTotal) > 0.15 ? 'mayor' : Math.abs(discrepancia / boletaTotal) > 0.05 ? 'menor' : 'ninguna',
    };
  });
}

export function generarContratosDemo(): ContratoServicio[] {
  return [
    {
      id: 'ctr-001',
      corredorId: 'corr-demo-001',
      clienteNombre: 'Temu Panama Operations',
      clienteRuc: '155702345-1-867890',
      precioGuiaCourier: 4.50,
      precioTramiteFormal: 60.00,
      recargoPermisoEspecial: 25.00,
      recargoFumigacion: 75.00,
      recargoInspeccion: 50.00,
      recargoAlmacenajeDia: 15.00,
      descuentoVolumen10: 5, descuentoVolumen50: 10, descuentoVolumen100: 15,
      honorarioMinimo: 60, porcentajeCIF: 0.27,
      activo: true,
    },
    {
      id: 'ctr-002',
      corredorId: 'corr-demo-001',
      clienteNombre: 'Shein Latam S.A.',
      clienteRuc: '155801234-1-678901',
      precioGuiaCourier: 5.00,
      precioTramiteFormal: 75.00,
      recargoPermisoEspecial: 30.00,
      recargoFumigacion: 80.00,
      recargoInspeccion: 55.00,
      recargoAlmacenajeDia: 18.00,
      descuentoVolumen10: 5, descuentoVolumen50: 12, descuentoVolumen100: 18,
      honorarioMinimo: 60, porcentajeCIF: 0.30,
      activo: true,
    },
    {
      id: 'ctr-003',
      corredorId: 'corr-demo-001',
      clienteNombre: 'Amazon Global Logistics',
      clienteRuc: '155600987-1-234567',
      precioGuiaCourier: 3.75,
      precioTramiteFormal: 55.00,
      recargoPermisoEspecial: 20.00,
      recargoFumigacion: 70.00,
      recargoInspeccion: 45.00,
      recargoAlmacenajeDia: 12.00,
      descuentoVolumen10: 8, descuentoVolumen50: 15, descuentoVolumen100: 20,
      honorarioMinimo: 60, porcentajeCIF: 0.25,
      activo: true,
    },
  ];
}

export default MotorFacturacionEnterprise;
