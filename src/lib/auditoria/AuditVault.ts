// ============================================
// AUDIT VAULT — PAQUETE DE ARCHIVO DIGITAL
// Convenio de Kyoto Revisado, Capítulo 9
// Norma 9.5: Conservación documental mínima 5 años
// Norma 9.6: Archivo electrónico con integridad verificable
// ============================================

import CryptoJS from 'crypto-js';
import jsPDF from 'jspdf';
import { devLog, devError, devSuccess } from '@/lib/logger';
import { GestorAuditoria, type RegistroAuditoria } from './gestorAuditoria';
import { generarFirmaDigital, verificarFirma, CLAUSULA_RESPONSABILIDAD, type FirmaDigital } from '@/lib/core/SistemaFirmaDigital';

// ── Types ──

/**
 * Estructura del paquete de archivo digital según Kyoto Revisado Cap. 9
 */
export interface PaqueteAuditVault {
  /** Metadatos del paquete */
  metadata: VaultMetadata;
  /** Datos del trámite desde la ingesta */
  tramite: DatosTramite;
  /** Cadena de auditoría completa */
  auditTrail: RegistroAuditoria[];
  /** Resultado de verificación de integridad */
  integridad: ResultadoIntegridad;
  /** Firma digital del corredor responsable */
  firma: FirmaDigital | null;
  /** Sello de archivo Kyoto */
  selloKyoto: SelloKyoto;
}

export interface VaultMetadata {
  vaultId: string;
  version: string;
  fechaGeneracion: string;
  generadoPor: string;
  formatoArchivo: 'ZENITH-VAULT-1.0';
  normaAplicable: string;
  hashPaquete: string;
  hashAlgoritmo: 'SHA-256';
  tamanoBytes: number;
}

export interface DatosTramite {
  /** Identificador único del trámite */
  tramiteId: string;
  /** MAWB o referencia principal */
  referencia: string;
  /** Tipo de operación aduanera */
  tipoOperacion: string;
  /** Fecha de inicio (ingesta LEXIS) */
  fechaIngesta: string;
  /** Fecha de finalización (boleta generada) */
  fechaFinalizacion: string;
  /** Datos del importador */
  importador: {
    nombre: string;
    identificacion: string;
    direccion?: string;
  };
  /** Datos del corredor actuante */
  corredor: {
    nombre: string;
    licencia: string;
    cedula: string;
  };
  /** Resumen de mercancías */
  mercancias: ResumenMercancias;
  /** Liquidación oficial */
  liquidacion: ResumenLiquidacion;
  /** Documentos de soporte referenciados */
  documentosSoporte: DocumentoSoporte[];
  /** Resultado de validaciones de cumplimiento */
  validaciones: ValidacionCumplimiento[];
}

export interface ResumenMercancias {
  totalArticulos: number;
  pesoTotalKg: number;
  valorFOBTotal: number;
  valorCIFTotal: number;
  paisesOrigen: string[];
  fraccionesArancelarias: string[];
  incoterm?: string;
}

export interface ResumenLiquidacion {
  valorCIF: number;
  montoDAI: number;
  montoISC: number;
  montoITBM: number;
  tasaSistema: number;
  totalTributos: number;
  totalAPagar: number;
  numeroDeclaracion?: string;
  numeroBoleta?: string;
  fechaRegistro: string;
}

export interface DocumentoSoporte {
  tipo: 'factura_comercial' | 'conocimiento_embarque' | 'lista_empaque' | 'certificado_origen' | 'permiso_anuente' | 'declaracion_aduanera' | 'boleta_pago' | 'otro';
  referencia: string;
  fechaDocumento: string;
  hashDocumento?: string;
  notas?: string;
}

export interface ValidacionCumplimiento {
  modulo: string;
  resultado: 'aprobado' | 'rechazado' | 'advertencia' | 'pendiente';
  detalle: string;
  timestamp: string;
  fundamentoLegal?: string;
}

export interface ResultadoIntegridad {
  cadenaValida: boolean;
  totalRegistros: number;
  registrosVerificados: number;
  errores: string[];
  hashCadena: string;
  verificadoEn: string;
}

export interface SelloKyoto {
  norma: string;
  estandar: string;
  capitulo: string;
  articulos: string[];
  periodoRetencion: string;
  fechaExpiracionArchivo: string;
  declaracionCumplimiento: string;
  hashSello: string;
}

// ── Constants ──

const VAULT_VERSION = '1.0.0';
const KYOTO_RETENCION_ANOS = 5;

const KYOTO_NORMAS = {
  norma: 'Convenio Internacional para la Simplificación y Armonización de los Regímenes Aduaneros (Convenio de Kyoto Revisado)',
  estandar: 'Anexo General, Capítulo 9 — Información, Decisiones y Dictámenes de la Aduana',
  capitulo: 'Capítulo 9: Información, Decisiones y Dictámenes',
  articulos: [
    'Norma 9.5: La legislación nacional establecerá los plazos mínimos de conservación de documentos por la aduana y los operadores comerciales.',
    'Norma 9.6: Los documentos podrán conservarse en formato electrónico siempre que la aduana pueda acceder a ellos y verificar su autenticidad e integridad.',
    'Norma 9.7: La aduana cooperará con los operadores comerciales para facilitar el archivo electrónico de documentos.',
    'Norma Transitoria 9.3: La aduana aceptará documentos archivados electrónicamente como equivalentes legales de los originales en papel.',
  ],
};

// ── Core Class ──

export class AuditVault {

  /**
   * Genera un paquete de archivo digital completo para un trámite finalizado
   */
  static async generarPaquete(
    tramite: DatosTramite,
    corredorId: string,
    corredorNombre: string
  ): Promise<PaqueteAuditVault> {
    devLog('[AuditVault] Generando paquete de archivo digital...');

    const vaultId = `VAULT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const fechaGeneracion = new Date().toISOString();

    // 1. Obtener cadena de auditoría
    const auditTrail = await this.recopilarAuditTrail(tramite.tramiteId);

    // 2. Verificar integridad de la cadena
    const integridad = await this.verificarIntegridadCadena(auditTrail);

    // 3. Generar firma digital
    const contenidoParaFirma = JSON.stringify({
      tramite,
      auditTrail: auditTrail.map(r => r.hashContenido),
      integridad: integridad.hashCadena,
    });
    const firma = await generarFirmaDigital(
      contenidoParaFirma,
      corredorId,
      corredorNombre,
      vaultId
    );

    // 4. Generar sello Kyoto
    const selloKyoto = this.generarSelloKyoto(fechaGeneracion, vaultId);

    // 5. Ensamblar paquete
    const paqueteSinMeta: Omit<PaqueteAuditVault, 'metadata'> = {
      tramite,
      auditTrail,
      integridad,
      firma,
      selloKyoto,
    };

    const paqueteJSON = JSON.stringify(paqueteSinMeta);
    const hashPaquete = CryptoJS.SHA256(paqueteJSON).toString(CryptoJS.enc.Hex);

    const metadata: VaultMetadata = {
      vaultId,
      version: VAULT_VERSION,
      fechaGeneracion,
      generadoPor: corredorNombre,
      formatoArchivo: 'ZENITH-VAULT-1.0',
      normaAplicable: KYOTO_NORMAS.norma,
      hashPaquete,
      hashAlgoritmo: 'SHA-256',
      tamanoBytes: new Blob([paqueteJSON]).size,
    };

    const paquete: PaqueteAuditVault = { metadata, ...paqueteSinMeta };

    devSuccess(`[AuditVault] Paquete generado: ${vaultId} (${auditTrail.length} registros, hash: ${hashPaquete.substring(0, 16)}...)`);
    return paquete;
  }

  /**
   * Exporta el paquete como archivo JSON descargable
   */
  static exportarJSON(paquete: PaqueteAuditVault): Blob {
    const json = JSON.stringify(paquete, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  /**
   * Genera un PDF de auditoría con toda la trazabilidad
   */
  static generarPDF(paquete: PaqueteAuditVault): Blob {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const addPage = () => {
      doc.addPage();
      y = margin;
    };

    const checkPage = (needed: number) => {
      if (y + needed > doc.internal.pageSize.getHeight() - margin) {
        addPage();
      }
    };

    const drawLine = () => {
      doc.setDrawColor(180);
      doc.line(margin, y, pageWidth - margin, y);
      y += 3;
    };

    // ─── Header ───
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ZENITH — PAQUETE DE ARCHIVO DIGITAL', margin, y);
    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Convenio de Kyoto Revisado — Capítulo 9`, margin, y);
    y += 4;
    doc.text(`Vault ID: ${paquete.metadata.vaultId}`, margin, y);
    doc.text(`Fecha: ${new Date(paquete.metadata.fechaGeneracion).toLocaleString('es-PA')}`, pageWidth - margin - 60, y);
    y += 6;
    doc.setTextColor(0);
    drawLine();

    // ─── Section: Datos del Trámite ───
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('1. DATOS DEL TRÁMITE', margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    const t = paquete.tramite;
    const tramiteRows = [
      ['Referencia', t.referencia],
      ['Tipo Operación', t.tipoOperacion],
      ['Importador', `${t.importador.nombre} (${t.importador.identificacion})`],
      ['Corredor', `${t.corredor.nombre} — Lic. ${t.corredor.licencia}`],
      ['Fecha Ingesta (LEXIS)', new Date(t.fechaIngesta).toLocaleString('es-PA')],
      ['Fecha Finalización', new Date(t.fechaFinalizacion).toLocaleString('es-PA')],
    ];

    for (const [label, value] of tramiteRows) {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value), margin + 45, y);
      y += 4;
    }
    y += 2;
    drawLine();

    // ─── Section: Mercancías ───
    checkPage(30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('2. RESUMEN DE MERCANCÍAS', margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    const m = t.mercancias;
    const mercRows = [
      ['Total Artículos', String(m.totalArticulos)],
      ['Peso Total', `${m.pesoTotalKg.toFixed(3)} kg`],
      ['Valor FOB Total', `B/. ${m.valorFOBTotal.toFixed(2)}`],
      ['Valor CIF Total', `B/. ${m.valorCIFTotal.toFixed(2)}`],
      ['Países de Origen', m.paisesOrigen.join(', ')],
      ['Fracciones Arancelarias', m.fraccionesArancelarias.join(', ')],
    ];
    if (m.incoterm) mercRows.push(['Incoterm ICC 2020', m.incoterm]);

    for (const [label, value] of mercRows) {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 50, y);
      y += 4;
    }
    y += 2;
    drawLine();

    // ─── Section: Liquidación ───
    checkPage(40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('3. LIQUIDACIÓN OFICIAL ANA', margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    const liq = t.liquidacion;
    const liqRows = [
      ['Valor CIF', `B/. ${liq.valorCIF.toFixed(2)}`],
      ['DAI (Impuesto de Importación)', `B/. ${liq.montoDAI.toFixed(2)}`],
      ['ISC (Selectivo al Consumo)', `B/. ${liq.montoISC.toFixed(2)}`],
      ['ITBM', `B/. ${liq.montoITBM.toFixed(2)}`],
      ['Tasa SIGA', `B/. ${liq.tasaSistema.toFixed(2)}`],
      ['Total Tributos', `B/. ${liq.totalTributos.toFixed(2)}`],
      ['TOTAL A PAGAR', `B/. ${liq.totalAPagar.toFixed(2)}`],
    ];
    if (liq.numeroDeclaracion) liqRows.push(['No. Declaración', liq.numeroDeclaracion]);
    if (liq.numeroBoleta) liqRows.push(['No. Boleta', liq.numeroBoleta]);

    for (const [label, value] of liqRows) {
      const isBold = label === 'TOTAL A PAGAR';
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      if (isBold) doc.setFontSize(9);
      doc.text(`${label}:`, margin + 2, y);
      doc.text(value, margin + 55, y);
      if (isBold) doc.setFontSize(8);
      y += 4;
    }
    y += 2;
    drawLine();

    // ─── Section: Documentos de Soporte ───
    checkPage(20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('4. DOCUMENTOS DE SOPORTE', margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    if (t.documentosSoporte.length === 0) {
      doc.text('No se registraron documentos de soporte.', margin + 2, y);
      y += 4;
    } else {
      for (const docSoporte of t.documentosSoporte) {
        checkPage(8);
        doc.text(`• ${this.tipoDocLabel(docSoporte.tipo)}: ${docSoporte.referencia}`, margin + 2, y);
        y += 3.5;
        if (docSoporte.hashDocumento) {
          doc.setTextColor(100);
          doc.text(`  SHA-256: ${docSoporte.hashDocumento.substring(0, 32)}...`, margin + 4, y);
          doc.setTextColor(0);
          y += 3.5;
        }
      }
    }
    y += 2;
    drawLine();

    // ─── Section: Validaciones de Cumplimiento ───
    checkPage(20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('5. VALIDACIONES DE CUMPLIMIENTO', margin, y);
    y += 5;
    doc.setFontSize(8);

    for (const val of t.validaciones) {
      checkPage(10);
      const icon = val.resultado === 'aprobado' ? '✓' : val.resultado === 'rechazado' ? '✗' : val.resultado === 'advertencia' ? '⚠' : '○';
      doc.setFont('helvetica', 'bold');
      doc.text(`${icon} ${val.modulo}`, margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`— ${val.resultado.toUpperCase()}`, margin + 50, y);
      y += 3.5;
      doc.text(`  ${val.detalle}`, margin + 4, y);
      y += 3.5;
      if (val.fundamentoLegal) {
        doc.setTextColor(100);
        doc.text(`  Base Legal: ${val.fundamentoLegal}`, margin + 4, y);
        doc.setTextColor(0);
        y += 3.5;
      }
    }
    y += 2;
    drawLine();

    // ─── Section: Audit Trail ───
    addPage();
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('6. CADENA DE AUDITORÍA (TRAZABILIDAD COMPLETA)', margin, y);
    y += 5;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');

    doc.setTextColor(100);
    doc.text(`Total de registros: ${paquete.auditTrail.length}`, margin + 2, y);
    y += 3;
    doc.text(`Integridad de cadena: ${paquete.integridad.cadenaValida ? 'VÁLIDA' : 'COMPROMETIDA'}`, margin + 2, y);
    y += 3;
    doc.text(`Hash de cadena: ${paquete.integridad.hashCadena.substring(0, 48)}...`, margin + 2, y);
    y += 5;
    doc.setTextColor(0);

    for (const reg of paquete.auditTrail) {
      checkPage(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`[Seq ${reg.numeroSecuencia}] ${reg.accion.toUpperCase()}`, margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${new Date(reg.timestamp).toLocaleString('es-PA')} — ${reg.operador}`, margin + 55, y);
      y += 3.5;

      if (reg.cambios && reg.cambios.length > 0) {
        for (const cambio of reg.cambios.slice(0, 5)) {
          checkPage(4);
          doc.setTextColor(80);
          doc.text(`  ${cambio.campo}: ${String(cambio.valorAnterior)} → ${String(cambio.valorNuevo)}`, margin + 4, y);
          y += 3;
        }
        if (reg.cambios.length > 5) {
          doc.text(`  ... y ${reg.cambios.length - 5} cambios más`, margin + 4, y);
          y += 3;
        }
        doc.setTextColor(0);
      }

      if (reg.justificacion) {
        doc.setTextColor(60);
        doc.text(`  Justificación: ${reg.justificacion}`, margin + 4, y);
        doc.setTextColor(0);
        y += 3;
      }

      doc.setTextColor(150);
      doc.text(`  Hash: ${reg.hashContenido.substring(0, 40)}...`, margin + 4, y);
      doc.setTextColor(0);
      y += 5;
    }

    drawLine();

    // ─── Section: Firma Digital ───
    addPage();
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('7. FIRMA DIGITAL Y CLÁUSULA DE RESPONSABILIDAD', margin, y);
    y += 6;

    if (paquete.firma) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      const firmaRows = [
        ['Corredor Firmante', paquete.firma.corredorNombre],
        ['ID Corredor', paquete.firma.corredorId],
        ['Documento Firmado', paquete.firma.documentoId],
        ['Timestamp', new Date(paquete.firma.timestamp).toLocaleString('es-PA')],
        ['Hash SHA-256', paquete.firma.hash],
        ['Cláusula Aceptada', paquete.firma.clausulaAceptada ? 'SÍ' : 'NO'],
      ];

      for (const [label, value] of firmaRows) {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, margin + 2, y);
        doc.setFont('helvetica', 'normal');
        const maxW = contentWidth - 50;
        const lines = doc.splitTextToSize(String(value), maxW);
        doc.text(lines, margin + 45, y);
        y += lines.length * 3.5;
        y += 1;
      }

      y += 4;
      doc.setFontSize(7);
      doc.setTextColor(60);
      const clausulaLines = doc.splitTextToSize(CLAUSULA_RESPONSABILIDAD.trim(), contentWidth - 10);
      for (const line of clausulaLines) {
        checkPage(4);
        doc.text(line, margin + 5, y);
        y += 3;
      }
      doc.setTextColor(0);
    } else {
      doc.setFontSize(8);
      doc.text('Sin firma digital. Paquete no firmado.', margin + 2, y);
    }

    y += 6;
    drawLine();

    // ─── Section: Sello Kyoto ───
    checkPage(50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('8. SELLO DE ARCHIVO — CONVENIO DE KYOTO REVISADO', margin, y);
    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    const sk = paquete.selloKyoto;
    doc.text(`Norma: ${sk.norma}`, margin + 2, y); y += 4;
    doc.text(`Capítulo: ${sk.capitulo}`, margin + 2, y); y += 4;
    doc.text(`Período de Retención: ${sk.periodoRetencion}`, margin + 2, y); y += 4;
    doc.text(`Expiración de Archivo: ${new Date(sk.fechaExpiracionArchivo).toLocaleDateString('es-PA')}`, margin + 2, y); y += 6;

    doc.setFontSize(7);
    doc.setTextColor(60);
    for (const art of sk.articulos) {
      checkPage(8);
      const artLines = doc.splitTextToSize(`• ${art}`, contentWidth - 10);
      for (const line of artLines) {
        doc.text(line, margin + 4, y);
        y += 3;
      }
      y += 1;
    }
    doc.setTextColor(0);

    y += 4;
    doc.setFontSize(7);
    doc.setTextColor(100);
    const declLines = doc.splitTextToSize(sk.declaracionCumplimiento, contentWidth - 10);
    for (const line of declLines) {
      checkPage(4);
      doc.text(line, margin + 2, y);
      y += 3;
    }

    y += 4;
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Hash del Sello: ${sk.hashSello}`, margin + 2, y);

    // ─── Footer on all pages ───
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(6);
      doc.setTextColor(150);
      doc.text(
        `ZENITH AuditVault v${VAULT_VERSION} — ${paquete.metadata.vaultId} — Página ${i}/${totalPages}`,
        margin,
        pageH - 8
      );
      doc.text(
        `Hash del Paquete: ${paquete.metadata.hashPaquete.substring(0, 48)}...`,
        margin,
        pageH - 5
      );
    }

    return doc.output('blob');
  }

  /**
   * Verifica la autenticidad de un paquete existente
   */
  static verificarPaquete(paquete: PaqueteAuditVault): {
    autentico: boolean;
    detalles: string[];
  } {
    const detalles: string[] = [];
    let autentico = true;

    // 1. Verificar hash del paquete
    const { metadata, ...sinMeta } = paquete;
    const hashRecalculado = CryptoJS.SHA256(JSON.stringify(sinMeta)).toString(CryptoJS.enc.Hex);

    if (hashRecalculado !== metadata.hashPaquete) {
      autentico = false;
      detalles.push(`Hash del paquete no coincide. Esperado: ${metadata.hashPaquete.substring(0, 16)}..., Calculado: ${hashRecalculado.substring(0, 16)}...`);
    } else {
      detalles.push('Hash del paquete verificado correctamente.');
    }

    // 2. Verificar firma digital
    if (paquete.firma) {
      if (verificarFirma(paquete.firma)) {
        detalles.push(`Firma digital válida (Corredor: ${paquete.firma.corredorNombre}).`);
      } else {
        autentico = false;
        detalles.push('Firma digital inválida o incompleta.');
      }
    } else {
      detalles.push('Paquete sin firma digital.');
    }

    // 3. Verificar integridad de la cadena
    if (paquete.integridad.cadenaValida) {
      detalles.push(`Cadena de auditoría íntegra (${paquete.integridad.totalRegistros} registros).`);
    } else {
      autentico = false;
      detalles.push(`Cadena de auditoría comprometida: ${paquete.integridad.errores.join('; ')}`);
    }

    // 4. Verificar sello Kyoto
    const selloRecalculado = CryptoJS.SHA256(
      `${paquete.selloKyoto.norma}|${paquete.selloKyoto.periodoRetencion}|${paquete.selloKyoto.fechaExpiracionArchivo}|${metadata.vaultId}`
    ).toString(CryptoJS.enc.Hex);

    if (selloRecalculado !== paquete.selloKyoto.hashSello) {
      autentico = false;
      detalles.push('Sello de Kyoto manipulado.');
    } else {
      detalles.push('Sello de Kyoto verificado correctamente.');
    }

    return { autentico, detalles };
  }

  /**
   * Descarga el paquete completo (JSON + PDF) como archivos separados
   */
  static descargarPaquete(paquete: PaqueteAuditVault): void {
    const ref = paquete.tramite.referencia || paquete.metadata.vaultId;
    const fecha = new Date().toISOString().split('T')[0];

    // JSON
    const jsonBlob = this.exportarJSON(paquete);
    this.descargarBlob(jsonBlob, `AuditVault_${ref}_${fecha}.json`);

    // PDF
    const pdfBlob = this.generarPDF(paquete);
    this.descargarBlob(pdfBlob, `AuditVault_${ref}_${fecha}.pdf`);

    devSuccess(`[AuditVault] Paquete descargado: ${ref}`);
  }

  // ── Private Helpers ──

  private static async recopilarAuditTrail(tramiteId: string): Promise<RegistroAuditoria[]> {
    try {
      const historial = await GestorAuditoria.obtenerHistorial(tramiteId);
      if (historial.length > 0) return historial;

      // Fallback: get all and filter
      const todos = await GestorAuditoria.obtenerTodosRegistros();
      return todos
        .filter(r => r.liquidacionId === tramiteId || r.numeroGuia === tramiteId)
        .sort((a, b) => (a.numeroSecuencia || 0) - (b.numeroSecuencia || 0));
    } catch {
      devError('[AuditVault] Error recopilando audit trail');
      return [];
    }
  }

  private static async verificarIntegridadCadena(registros: RegistroAuditoria[]): Promise<ResultadoIntegridad> {
    const verificadoEn = new Date().toISOString();

    if (registros.length === 0) {
      return {
        cadenaValida: true,
        totalRegistros: 0,
        registrosVerificados: 0,
        errores: [],
        hashCadena: CryptoJS.SHA256('EMPTY_CHAIN').toString(CryptoJS.enc.Hex),
        verificadoEn,
      };
    }

    try {
      const resultado = await GestorAuditoria.verificarIntegridad();
      const chainContent = registros.map(r => r.hashContenido).join('|');
      const hashCadena = CryptoJS.SHA256(chainContent).toString(CryptoJS.enc.Hex);

      return {
        cadenaValida: resultado.esValida,
        totalRegistros: resultado.totalRegistros,
        registrosVerificados: resultado.registrosVerificados,
        errores: resultado.errores,
        hashCadena,
        verificadoEn,
      };
    } catch {
      const chainContent = registros.map(r => r.hashContenido || '').join('|');
      return {
        cadenaValida: false,
        totalRegistros: registros.length,
        registrosVerificados: 0,
        errores: ['Error al verificar integridad'],
        hashCadena: CryptoJS.SHA256(chainContent).toString(CryptoJS.enc.Hex),
        verificadoEn,
      };
    }
  }

  private static generarSelloKyoto(fechaGeneracion: string, vaultId: string): SelloKyoto {
    const fechaExpiracion = new Date(fechaGeneracion);
    fechaExpiracion.setFullYear(fechaExpiracion.getFullYear() + KYOTO_RETENCION_ANOS);

    const periodoRetencion = `${KYOTO_RETENCION_ANOS} años (${new Date(fechaGeneracion).getFullYear()}–${fechaExpiracion.getFullYear()})`;

    const declaracion =
      `Este paquete de archivo digital ha sido generado en cumplimiento del Convenio de Kyoto Revisado, ` +
      `Anexo General, Capítulo 9. El contenido ha sido firmado digitalmente con SHA-256 y su integridad puede ` +
      `ser verificada en cualquier momento durante el período de retención legal. La Autoridad Nacional de Aduanas ` +
      `de Panamá podrá acceder a este archivo electrónico como equivalente legal del expediente físico, ` +
      `conforme a la Norma Transitoria 9.3 del Convenio.`;

    const hashSello = CryptoJS.SHA256(
      `${KYOTO_NORMAS.norma}|${periodoRetencion}|${fechaExpiracion.toISOString()}|${vaultId}`
    ).toString(CryptoJS.enc.Hex);

    return {
      norma: KYOTO_NORMAS.norma,
      estandar: KYOTO_NORMAS.estandar,
      capitulo: KYOTO_NORMAS.capitulo,
      articulos: KYOTO_NORMAS.articulos,
      periodoRetencion,
      fechaExpiracionArchivo: fechaExpiracion.toISOString(),
      declaracionCumplimiento: declaracion,
      hashSello,
    };
  }

  private static tipoDocLabel(tipo: DocumentoSoporte['tipo']): string {
    const labels: Record<DocumentoSoporte['tipo'], string> = {
      factura_comercial: 'Factura Comercial',
      conocimiento_embarque: 'Conocimiento de Embarque',
      lista_empaque: 'Lista de Empaque',
      certificado_origen: 'Certificado de Origen',
      permiso_anuente: 'Permiso de Autoridad Anuente',
      declaracion_aduanera: 'Declaración Aduanera',
      boleta_pago: 'Boleta de Pago',
      otro: 'Otro Documento',
    };
    return labels[tipo] || tipo;
  }

  private static descargarBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
