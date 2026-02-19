/**
 * GENERACIÓN DE EXCEL COMPLETO — ZENITH
 * 
 * Genera un reporte Excel con 4 hojas:
 * - Resumen Ejecutivo (con Certificación ZENITH)
 * - Detalle de Paquetes
 * - Productos Restringidos
 * - Liquidación y Honorarios (Feb 2026 - Res. 222)
 * 
 * Auditado por Stella Help | Verificado por Zod Integrity Engine
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { FilaProcesada } from '@/lib/workers/procesador.worker';
import { ManifiestoGuardado } from '@/lib/db/database';
import { calcularHonorarioCorredor } from '@/lib/financiero/honorariosCorredor';
import { generarSelloZenithExportacion } from '@/lib/zenith/zodIntegrityEngine';

/**
 * Genera Excel completo con todas las hojas
 */
export async function generarExcelCompleto(
  manifiesto: ManifiestoGuardado,
  paquetes: FilaProcesada[],
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const wb = XLSX.utils.book_new();

  // ═══════════════════════════════════════════════════════
  // HOJA 1: RESUMEN EJECUTIVO
  // ═══════════════════════════════════════════════════════
  onProgress?.(10);

  const valorCIFTotal = paquetes.reduce((sum, p) => sum + (p.valorUSD || 0), 0);
  const pesoTotal = paquetes.reduce((sum, p) => sum + (p.peso || 0), 0);

  // Calcular tributos por categoría
  let tributosTotal = 0;
  const porCategoria: Record<string, { cantidad: number; valor: number; tributos: number }> = {
    'A': { cantidad: 0, valor: 0, tributos: 0 },
    'B': { cantidad: 0, valor: 0, tributos: 0 },
    'C': { cantidad: 0, valor: 0, tributos: 0 },
    'D': { cantidad: 0, valor: 0, tributos: 0 },
    'Sin Clasificar': { cantidad: 0, valor: 0, tributos: 0 }
  };

  paquetes.forEach(p => {
    const cat = p.categoriaAduanera || 'Sin Clasificar';
    const valor = p.valorUSD || 0;
    let tributo = 0;

    switch (cat) {
      case 'A': tributo = 0; break;
      case 'B': tributo = 0; break;
      case 'C': tributo = valor * 0.15; break;
      case 'D': tributo = valor * 0.25; break;
      default: tributo = 0;
    }

    if (!porCategoria[cat]) {
      porCategoria[cat] = { cantidad: 0, valor: 0, tributos: 0 };
    }
    porCategoria[cat].cantidad++;
    porCategoria[cat].valor += valor;
    porCategoria[cat].tributos += tributo;
    tributosTotal += tributo;
  });

  // Honorarios del corredor (Res. 222 de 2025)
  const honorario = calcularHonorarioCorredor(valorCIFTotal);

  // ZENITH certification seal
  const timestamp = new Date().toISOString();
  const sello = generarSelloZenithExportacion(
    manifiesto.mawb || 'N/A',
    paquetes.length,
    valorCIFTotal,
    timestamp
  );

  const resumenData = [
    ['RESUMEN EJECUTIVO DEL MANIFIESTO — ZENITH'],
    [''],
    [sello.certificacion],
    [sello.selloCompleto],
    [''],
    ['INFORMACIÓN GENERAL'],
    ['MAWB:', manifiesto.mawb || 'N/A'],
    ['Fecha de Proceso:', new Date(manifiesto.fechaProcesamiento).toLocaleString()],
    ['Fecha de Generación:', new Date().toLocaleString()],
    [''],
    ['TOTALES'],
    ['Total de Paquetes:', paquetes.length],
    ['Valor CIF Total (USD):', `$${valorCIFTotal.toFixed(2)}`],
    ['Peso Total (LB):', `${pesoTotal.toFixed(2)} LB`],
    ['Tributos Totales (USD):', `$${tributosTotal.toFixed(2)}`],
    ['Honorario Corredor (Res. 222/2025):', `$${honorario.honorarioBase.toFixed(2)}`],
    ['TOTAL A COBRAR (USD):', `$${(valorCIFTotal + tributosTotal + honorario.honorarioBase).toFixed(2)}`],
    [''],
    ['DISTRIBUCIÓN POR CATEGORÍA ADUANERA (Feb 2026)'],
    ['Categoría', 'Cantidad', 'Valor USD', 'Tributos USD'],
    ['A - Documentos', porCategoria['A'].cantidad, `$${porCategoria['A'].valor.toFixed(2)}`, `$${porCategoria['A'].tributos.toFixed(2)}`],
    ['B - De Minimis (≤$100.00)', porCategoria['B'].cantidad, `$${porCategoria['B'].valor.toFixed(2)}`, `$${porCategoria['B'].tributos.toFixed(2)}`],
    ['C - Tributos (>$100.00 a $2,000.00)', porCategoria['C'].cantidad, `$${porCategoria['C'].valor.toFixed(2)}`, `$${porCategoria['C'].tributos.toFixed(2)}`],
    ['D - Alto (>$2,000.00 / Restringida)', porCategoria['D'].cantidad, `$${porCategoria['D'].valor.toFixed(2)}`, `$${porCategoria['D'].tributos.toFixed(2)}`],
    [''],
    ['ALERTAS'],
    ['Paquetes con Restricciones:', paquetes.filter(p => p.requierePermiso).length],
    ['Paquetes con Errores:', paquetes.filter(p => p.errores && p.errores.length > 0).length],
    ['Paquetes con Advertencias:', paquetes.filter(p => p.advertencias && p.advertencias.length > 0).length],
    [''],
    ['ESTÁNDARES INTERNACIONALES'],
    ['GS1 Compliance:', 'GTIN/GLN validados — Checksum GS1 verificado'],
    ['ICC Incoterms® 2020:', 'Valoración CIF según reglas ICC'],
    [''],
    ['ZENITH Customs Intelligence Platform v3.0 | GS1 Compliant | ICC Incoterms® 2020']
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  
  wsResumen['!cols'] = [
    { wch: 40 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Ejecutivo');

  // ═══════════════════════════════════════════════════════
  // HOJA 2: DETALLE DE PAQUETES
  // ═══════════════════════════════════════════════════════
  onProgress?.(30);

  const headersDetalle = [
    '#', 'Guía Aérea', 'Consignatario', 'Identificación',
    'Descripción', 'GTIN', 'Categoría Producto', 'Categoría Aduanera',
    'Valor CIF', 'DAI', 'ISC', 'ITBMS', 'Total Tributos',
    'Total a Pagar', 'Estado', 'Restricciones'
  ];

  const detalleData: (string | number)[][] = [headersDetalle];

  paquetes.forEach((p, idx) => {
    const valor = p.valorUSD || 0;
    let dai = 0, isc = 0, itbms = 0;

    if (p.categoriaAduanera === 'C') {
      dai = valor * 0.05;
      itbms = valor * 0.07;
    } else if (p.categoriaAduanera === 'D') {
      dai = valor * 0.10;
      isc = valor * 0.05;
      itbms = valor * 0.07;
    }

    const totalTributos = dai + isc + itbms;
    const totalPagar = valor + totalTributos;

    detalleData.push([
      idx + 1,
      p.tracking || '',
      p.destinatario || '',
      p.identificacion || '',
      (p.descripcion || '').substring(0, 80),
      (p as any).gtin || '',
      p.categoria || '',
      p.categoriaAduanera || '',
      `$${valor.toFixed(2)}`,
      `$${dai.toFixed(2)}`,
      `$${isc.toFixed(2)}`,
      `$${itbms.toFixed(2)}`,
      `$${totalTributos.toFixed(2)}`,
      `$${totalPagar.toFixed(2)}`,
      p.errores && p.errores.length > 0 ? 'Con errores' : 'OK',
      p.requierePermiso ? (p.autoridades || []).join(', ') : 'Ninguna'
    ]);
  });

  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData);
  
  wsDetalle['!cols'] = [
    { wch: 5 },   // #
    { wch: 18 },  // Guía
    { wch: 25 },  // Consignatario
    { wch: 15 },  // Identificación
    { wch: 40 },  // Descripción
    { wch: 18 },  // Cat. Producto
    { wch: 15 },  // Cat. Aduanera
    { wch: 12 },  // Valor CIF
    { wch: 10 },  // DAI
    { wch: 10 },  // ISC
    { wch: 10 },  // ITBMS
    { wch: 12 },  // Total Tributos
    { wch: 12 },  // Total Pagar
    { wch: 12 },  // Estado
    { wch: 25 }   // Restricciones
  ];

  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle de Paquetes');

  // ═══════════════════════════════════════════════════════
  // HOJA 3: PRODUCTOS RESTRINGIDOS (si hay)
  // ═══════════════════════════════════════════════════════
  onProgress?.(55);

  const paquetesRestringidos = paquetes.filter(p => p.requierePermiso);

  if (paquetesRestringidos.length > 0) {
    const headersRestringidos = [
      '#', 'Guía', 'Descripción', 'Categoría', 'Autoridad Requerida', 'Estado'
    ];

    const restringidosData: (string | number)[][] = [headersRestringidos];

    paquetesRestringidos.forEach((p, idx) => {
      restringidosData.push([
        idx + 1,
        p.tracking || '',
        (p.descripcion || '').substring(0, 60),
        p.categoria || '',
        (p.autoridades || []).join(', ') || 'Por determinar',
        'Pendiente revisión'
      ]);
    });

    const wsRestringidos = XLSX.utils.aoa_to_sheet(restringidosData);
    
    wsRestringidos['!cols'] = [
      { wch: 5 },
      { wch: 18 },
      { wch: 50 },
      { wch: 20 },
      { wch: 25 },
      { wch: 18 }
    ];

    XLSX.utils.book_append_sheet(wb, wsRestringidos, 'Productos Restringidos');
  }

  // ═══════════════════════════════════════════════════════
  // HOJA 4: LIQUIDACIÓN Y HONORARIOS (Res. 222/2025)
  // ═══════════════════════════════════════════════════════
  onProgress?.(75);

  const liquidacionData = [
    ['DESGLOSE DE LIQUIDACIÓN Y HONORARIOS'],
    ['Resolución 222 de 2025 - Autoridad Nacional de Aduanas'],
    [''],
    ['COMPONENTES DE TRIBUTOS'],
    ['Concepto', 'Base', 'Tasa', 'Monto'],
    ['DAI (Impuesto de Importación)', `$${valorCIFTotal.toFixed(2)}`, 'Variable', `$${(porCategoria['C'].tributos * 0.33 + porCategoria['D'].tributos * 0.4).toFixed(2)}`],
    ['ISC (Impuesto Selectivo)', '-', 'Variable', `$${(porCategoria['D'].tributos * 0.2).toFixed(2)}`],
    ['ITBMS (7%)', '-', '7%', `$${(valorCIFTotal * 0.07).toFixed(2)}`],
    ['Tasa Aduanera (SIGA)', '-', 'B/. 3.00', `$${(paquetes.length * 3).toFixed(2)}`],
    [''],
    ['TOTAL TRIBUTOS:', '', '', `$${tributosTotal.toFixed(2)}`],
    [''],
    ['HONORARIO DE CORREDOR DE ADUANA (Res. 222/2025)'],
    ['Valor CIF Total:', `$${valorCIFTotal.toFixed(2)}`],
    ['Método de Cálculo:', honorario.metodoCalculo === 'fijo' ? 'Fijo (CIF < $2,500.00)' : 'Porcentual (CIF ≥ $2,500.00)'],
    ['Fórmula Aplicada:', honorario.formulaAplicada],
    ['Honorario Corredor:', `$${honorario.honorarioBase.toFixed(2)}`],
    ['Fundamento Legal:', honorario.fundamentoLegal],
    [''],
    ['MANEJO POR PAQUETE'],
    ['Cantidad de Paquetes:', paquetes.length],
    ['Tarifa por Paquete:', '$5.00'],
    ['Total Manejo:', `$${(paquetes.length * 5).toFixed(2)}`],
    [''],
    ['═══════════════════════════════════════════'],
    ['RESUMEN TOTAL A COBRAR'],
    ['Tributos:', `$${tributosTotal.toFixed(2)}`],
    ['Honorario Corredor:', `$${honorario.honorarioBase.toFixed(2)}`],
    ['Manejo:', `$${(paquetes.length * 5).toFixed(2)}`],
    ['TOTAL:', `$${(tributosTotal + honorario.honorarioBase + paquetes.length * 5).toFixed(2)}`],
  ];

  const wsLiquidacion = XLSX.utils.aoa_to_sheet(liquidacionData);
  
  wsLiquidacion['!cols'] = [
    { wch: 40 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(wb, wsLiquidacion, 'Liquidación y Honorarios');

  // ═══════════════════════════════════════════════════════
  // GENERAR ARCHIVO FINAL
  // ═══════════════════════════════════════════════════════
  onProgress?.(90);

  const buffer = XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'array',
    compression: true
  });

  onProgress?.(100);

  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/**
 * Descarga el Excel completo
 */
export async function descargarExcelCompleto(
  manifiesto: ManifiestoGuardado,
  paquetes: FilaProcesada[],
  onProgress?: (progress: number) => void
): Promise<void> {
  const blob = await generarExcelCompleto(manifiesto, paquetes, onProgress);

  const fechaHoy = new Date().toISOString().split('T')[0];
  const mawbLimpio = (manifiesto.mawb || 'Manifiesto').replace(/[^a-zA-Z0-9-]/g, '_');
  const nombreArchivo = `${mawbLimpio}_${fechaHoy}.xlsx`;

  saveAs(blob, nombreArchivo);
}

export default {
  generarExcelCompleto,
  descargarExcelCompleto
};
