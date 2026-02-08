// ============================================
// BÓVEDA DOCUMENTAL — 60 MESES INMUTABLES
// Convenio de Kyoto Revisado, Norma 9.5
// Formato de inspección ANA para exportación de auditoría
// ============================================

import CryptoJS from 'crypto-js';
import jsPDF from 'jspdf';
import { devLog, devWarn } from '@/lib/logger';
import { AuditVault, type PaqueteAuditVault, type DatosTramite } from './AuditVault';

// ── Types ──

export interface ExpedienteAuditoria {
  id: string;
  tramiteId: string;
  referencia: string;
  paqueteVault: PaqueteAuditVault;
  fechaCreacion: string;
  fechaExpiracion: string; // 60 meses desde creación
  inmutable: boolean;
  hashIntegridad: string;
  formatoANA: FormatoInspeccionANA;
}

export interface FormatoInspeccionANA {
  /** Encabezado de inspección */
  numeroExpediente: string;
  fechaApertura: string;
  tipoProcedimiento: string;
  recintoAduanero: string;
  /** Sección de identificación */
  importador: {
    nombre: string;
    ruc: string;
    direccion?: string;
  };
  corredor: {
    nombre: string;
    licencia: string;
    cedula: string;
  };
  /** Sección documental */
  documentosSoporte: Array<{
    tipo: string;
    numero: string;
    fecha: string;
    verificado: boolean;
    hashSHA256?: string;
  }>;
  /** Sección de mercancías */
  resumenMercancias: {
    totalArticulos: number;
    pesoTotalKg: number;
    valorCIF: number;
    fraccionesArancelarias: string[];
    paisesOrigen: string[];
  };
  /** Sección tributaria */
  liquidacion: {
    valorCIF: number;
    totalTributos: number;
    totalAPagar: number;
    numeroDeclaracion?: string;
  };
  /** Sección de cumplimiento */
  validacionesCumplimiento: Array<{
    modulo: string;
    resultado: string;
    detalle: string;
  }>;
  /** Sellos de integridad */
  selloIntegridad: {
    hashExpediente: string;
    hashCadenaAuditoria: string;
    firmaDigitalCorredorHash?: string;
    timestampVerificacion: string;
  };
}

// ── Constants ──

const RETENCION_MESES = 60; // 5 años según Kyoto Revisado Norma 9.5

// ── Bóveda Documental ──

export class BovedaDocumental {

  /**
   * Genera un expediente digital completo según formato de inspección ANA
   * con inmutabilidad de 60 meses
   */
  static async generarExpediente(
    tramite: DatosTramite,
    corredorId: string,
    corredorNombre: string,
    recintoAduanero: string = 'Aeropuerto Internacional de Tocumen'
  ): Promise<ExpedienteAuditoria> {
    devLog(`[Bóveda] Generando expediente para: ${tramite.referencia}`);

    // 1. Generar paquete AuditVault completo
    const paqueteVault = await AuditVault.generarPaquete(tramite, corredorId, corredorNombre);

    // 2. Generar formato ANA
    const formatoANA = this.generarFormatoANA(tramite, paqueteVault, recintoAduanero);

    // 3. Calcular fechas de retención
    const fechaCreacion = new Date().toISOString();
    const fechaExpiracion = new Date(Date.now() + RETENCION_MESES * 30.44 * 86400000).toISOString();

    // 4. Hash de integridad del expediente completo
    const hashData = JSON.stringify({ paqueteVault: paqueteVault.metadata.hashPaquete, formatoANA, fechaCreacion });
    const hashIntegridad = CryptoJS.SHA256(hashData).toString(CryptoJS.enc.Hex);

    const expedienteId = `EXP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const expediente: ExpedienteAuditoria = {
      id: expedienteId,
      tramiteId: tramite.tramiteId,
      referencia: tramite.referencia,
      paqueteVault,
      fechaCreacion,
      fechaExpiracion,
      inmutable: true,
      hashIntegridad,
      formatoANA,
    };

    devLog(`[Bóveda] Expediente generado: ${expedienteId} (retención hasta ${new Date(fechaExpiracion).toLocaleDateString('es-PA')})`);
    return expediente;
  }

  /**
   * Genera PDF de exportación para auditoría ANA
   */
  static generarPDFAuditoria(expediente: ExpedienteAuditoria): Blob {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = margin;

    const checkPage = (needed: number) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const drawLine = () => {
      doc.setDrawColor(180);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
    };

    const f = expediente.formatoANA;

    // ─── Header ───
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTORIDAD NACIONAL DE ADUANAS', pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(10);
    doc.text('EXPEDIENTE DE AUDITORÍA — FORMATO DE INSPECCIÓN', pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Generado por ZENITH — Convenio de Kyoto Revisado, Norma 9.5`, pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text(`Retención: ${RETENCION_MESES} meses (inmutable hasta ${new Date(expediente.fechaExpiracion).toLocaleDateString('es-PA')})`, pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.setTextColor(0);
    drawLine();

    // ─── Datos del Expediente ───
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('I. DATOS DEL EXPEDIENTE', margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    const datosExp = [
      ['No. Expediente', f.numeroExpediente],
      ['Fecha Apertura', new Date(f.fechaApertura).toLocaleDateString('es-PA')],
      ['Tipo Procedimiento', f.tipoProcedimiento],
      ['Recinto Aduanero', f.recintoAduanero],
    ];
    for (const [l, v] of datosExp) {
      doc.setFont('helvetica', 'bold');
      doc.text(`${l}:`, margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(v, margin + 45, y);
      y += 4;
    }
    y += 2;
    drawLine();

    // ─── Identificación ───
    checkPage(30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('II. IDENTIFICACIÓN DE PARTES', margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    const idRows = [
      ['Importador', f.importador.nombre],
      ['RUC/Cédula', f.importador.ruc],
      ['Corredor Aduanero', `${f.corredor.nombre} — Lic. ${f.corredor.licencia}`],
      ['Cédula Corredor', f.corredor.cedula],
    ];
    for (const [l, v] of idRows) {
      doc.setFont('helvetica', 'bold');
      doc.text(`${l}:`, margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(v, margin + 45, y);
      y += 4;
    }
    y += 2;
    drawLine();

    // ─── Documentos ───
    checkPage(20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('III. DOCUMENTOS DE SOPORTE', margin, y);
    y += 5;
    doc.setFontSize(8);

    for (const docSoporte of f.documentosSoporte) {
      checkPage(8);
      const icon = docSoporte.verificado ? '✓' : '○';
      doc.setFont('helvetica', 'normal');
      doc.text(`${icon} ${docSoporte.tipo}: ${docSoporte.numero} (${new Date(docSoporte.fecha).toLocaleDateString('es-PA')})`, margin + 2, y);
      y += 4;
      if (docSoporte.hashSHA256) {
        doc.setTextColor(120);
        doc.setFontSize(6);
        doc.text(`SHA-256: ${docSoporte.hashSHA256.substring(0, 48)}...`, margin + 6, y);
        doc.setTextColor(0);
        doc.setFontSize(8);
        y += 3;
      }
    }
    y += 2;
    drawLine();

    // ─── Mercancías ───
    checkPage(25);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('IV. RESUMEN DE MERCANCÍAS', margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    const mercRows = [
      ['Total Artículos', String(f.resumenMercancias.totalArticulos)],
      ['Peso Total', `${f.resumenMercancias.pesoTotalKg.toFixed(3)} kg`],
      ['Valor CIF', `B/. ${f.resumenMercancias.valorCIF.toFixed(2)}`],
      ['Fracciones', f.resumenMercancias.fraccionesArancelarias.join(', ') || 'N/A'],
      ['Países Origen', f.resumenMercancias.paisesOrigen.join(', ') || 'N/A'],
    ];
    for (const [l, v] of mercRows) {
      doc.setFont('helvetica', 'bold');
      doc.text(`${l}:`, margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(v, margin + 45, y);
      y += 4;
    }
    y += 2;
    drawLine();

    // ─── Liquidación ───
    checkPage(20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('V. LIQUIDACIÓN TRIBUTARIA', margin, y);
    y += 5;
    doc.setFontSize(8);

    const liqRows = [
      ['Valor CIF', `B/. ${f.liquidacion.valorCIF.toFixed(2)}`],
      ['Total Tributos', `B/. ${f.liquidacion.totalTributos.toFixed(2)}`],
      ['TOTAL A PAGAR', `B/. ${f.liquidacion.totalAPagar.toFixed(2)}`],
    ];
    if (f.liquidacion.numeroDeclaracion) {
      liqRows.push(['No. Declaración', f.liquidacion.numeroDeclaracion]);
    }
    for (const [l, v] of liqRows) {
      const bold = l === 'TOTAL A PAGAR';
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(`${l}:`, margin + 2, y);
      doc.text(v, margin + 45, y);
      y += 4;
    }
    y += 2;
    drawLine();

    // ─── Cumplimiento ───
    checkPage(20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('VI. VALIDACIONES DE CUMPLIMIENTO', margin, y);
    y += 5;
    doc.setFontSize(8);

    for (const val of f.validacionesCumplimiento) {
      checkPage(6);
      const icon = val.resultado === 'aprobado' ? '✓' : val.resultado === 'rechazado' ? '✗' : '⚠';
      doc.setFont('helvetica', 'bold');
      doc.text(`${icon} ${val.modulo}:`, margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(val.resultado.toUpperCase(), margin + 55, y);
      y += 3.5;
      doc.text(`  ${val.detalle}`, margin + 4, y);
      y += 4;
    }
    y += 2;
    drawLine();

    // ─── Sellos de Integridad ───
    doc.addPage();
    y = margin;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('VII. SELLOS DE INTEGRIDAD CRIPTOGRÁFICA', margin, y);
    y += 6;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');

    const sellos = [
      ['Hash Expediente', f.selloIntegridad.hashExpediente],
      ['Hash Cadena Auditoría', f.selloIntegridad.hashCadenaAuditoria],
      ['Firma Digital Corredor', f.selloIntegridad.firmaDigitalCorredorHash || 'N/A'],
      ['Verificado', new Date(f.selloIntegridad.timestampVerificacion).toLocaleString('es-PA')],
    ];
    for (const [l, v] of sellos) {
      doc.setFont('helvetica', 'bold');
      doc.text(`${l}:`, margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(v, margin + 50, y);
      y += 4;
    }

    y += 8;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, pageWidth - margin * 2, 25);
    y += 5;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('DECLARACIÓN DE INMUTABILIDAD — BÓVEDA DOCUMENTAL ZENITH', margin + 3, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(`Este expediente es inmutable por un período de ${RETENCION_MESES} meses (${RETENCION_MESES / 12} años) desde su generación,`, margin + 3, y);
    y += 3;
    doc.text('conforme al Convenio de Kyoto Revisado, Norma 9.5, y al Código Fiscal de Panamá, Art. 762-O.', margin + 3, y);
    y += 3;
    doc.text(`Fecha de generación: ${new Date(expediente.fechaCreacion).toLocaleString('es-PA')} | Expira: ${new Date(expediente.fechaExpiracion).toLocaleString('es-PA')}`, margin + 3, y);

    return doc.output('blob');
  }

  /**
   * Verifica la integridad de un expediente existente
   */
  static verificarExpediente(expediente: ExpedienteAuditoria): {
    integro: boolean;
    hashOriginal: string;
    hashRecalculado: string;
    vigente: boolean;
    diasRestantes: number;
    mensaje: string;
  } {
    const hashData = JSON.stringify({
      paqueteVault: expediente.paqueteVault.metadata.hashPaquete,
      formatoANA: expediente.formatoANA,
      fechaCreacion: expediente.fechaCreacion,
    });
    const hashRecalculado = CryptoJS.SHA256(hashData).toString(CryptoJS.enc.Hex);
    const integro = hashRecalculado === expediente.hashIntegridad;

    const ahora = Date.now();
    const expiracion = new Date(expediente.fechaExpiracion).getTime();
    const vigente = ahora < expiracion;
    const diasRestantes = Math.max(0, Math.ceil((expiracion - ahora) / 86400000));

    return {
      integro,
      hashOriginal: expediente.hashIntegridad,
      hashRecalculado,
      vigente,
      diasRestantes,
      mensaje: integro
        ? `✓ Expediente ${expediente.id} íntegro. Vigente por ${diasRestantes} días.`
        : `⛔ Expediente ${expediente.id} COMPROMETIDO — Hash no coincide.`,
    };
  }

  /**
   * Exporta el expediente completo (JSON + PDF) para auditoría
   */
  static exportarParaAuditoria(expediente: ExpedienteAuditoria): {
    json: Blob;
    pdf: Blob;
    nombreArchivo: string;
  } {
    const json = new Blob([JSON.stringify(expediente, null, 2)], { type: 'application/json' });
    const pdf = this.generarPDFAuditoria(expediente);
    const nombreArchivo = `ANA-EXP-${expediente.referencia}-${new Date(expediente.fechaCreacion).toISOString().split('T')[0]}`;

    return { json, pdf, nombreArchivo };
  }

  // ── Private ──

  private static generarFormatoANA(
    tramite: DatosTramite,
    paquete: PaqueteAuditVault,
    recintoAduanero: string
  ): FormatoInspeccionANA {
    const numeroExpediente = `ANA-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    return {
      numeroExpediente,
      fechaApertura: tramite.fechaIngesta,
      tipoProcedimiento: tramite.tipoOperacion,
      recintoAduanero,
      importador: {
        nombre: tramite.importador.nombre,
        ruc: tramite.importador.identificacion,
        direccion: tramite.importador.direccion,
      },
      corredor: {
        nombre: tramite.corredor.nombre,
        licencia: tramite.corredor.licencia,
        cedula: tramite.corredor.cedula,
      },
      documentosSoporte: tramite.documentosSoporte.map(d => ({
        tipo: d.tipo.replace(/_/g, ' ').toUpperCase(),
        numero: d.referencia,
        fecha: d.fechaDocumento,
        verificado: !!d.hashDocumento,
        hashSHA256: d.hashDocumento,
      })),
      resumenMercancias: {
        totalArticulos: tramite.mercancias.totalArticulos,
        pesoTotalKg: tramite.mercancias.pesoTotalKg,
        valorCIF: tramite.mercancias.valorCIFTotal,
        fraccionesArancelarias: tramite.mercancias.fraccionesArancelarias,
        paisesOrigen: tramite.mercancias.paisesOrigen,
      },
      liquidacion: {
        valorCIF: tramite.liquidacion.valorCIF,
        totalTributos: tramite.liquidacion.totalTributos,
        totalAPagar: tramite.liquidacion.totalAPagar,
        numeroDeclaracion: tramite.liquidacion.numeroDeclaracion,
      },
      validacionesCumplimiento: tramite.validaciones.map(v => ({
        modulo: v.modulo,
        resultado: v.resultado,
        detalle: v.detalle,
      })),
      selloIntegridad: {
        hashExpediente: paquete.metadata.hashPaquete,
        hashCadenaAuditoria: paquete.integridad.hashCadena,
        firmaDigitalCorredorHash: paquete.firma?.hash,
        timestampVerificacion: new Date().toISOString(),
      },
    };
  }
}
