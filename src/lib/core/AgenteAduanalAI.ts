// ============================================
// AGENTE ADUANAL AI-FIRST
// Orquestador principal - Cumplimiento total Panamá 2025
// Integración Multi-Modal, Exoneraciones, Multi-Agencia
// ============================================

import { ManifestRow } from '@/types/manifest';
import { Arancel } from '@/types/aduanas';
import { ZonaAduanera, ModoTransporte } from '@/types/transporte';
import { MotorClasificacionHTS, ResultadoClasificacionHTS } from './MotorClasificacionHTS';
import { MotorLiquidacionSIGA, ResultadoLiquidacionSIGA } from './MotorLiquidacionSIGA';
import { DetectorRiesgos, AuditoriaLote } from './DetectorRiesgos';
import { descargarExcelInteligente, DatosExcelInteligente } from './GeneradorExcelInteligente';
import { generarFirmaDigital, FirmaDigital, CLAUSULA_RESPONSABILIDAD } from './SistemaFirmaDigital';
import { GestorRestriccionesAprendidas } from '@/lib/aprendizaje/gestorRestriccionesAprendidas';
import { devLog, devWarn } from '@/lib/logger';
import { Liquidacion } from '@/types/aduanas';
import { DetectorCONAPRED, ResultadoDeteccionCONAPRED } from '@/lib/regulatorio/DetectorCONAPRED';
import { 
  obtenerPuntosPorZona,
  verificarRestriccionesPunto, 
  obtenerDocumentosRequeridos,
  calcularTasasPuntoControl 
} from '@/lib/regulatorio/ReglasZonasAduaneras';
import { ValidadorComplianceAI, ValidacionCompliance } from './ValidadorComplianceAI';

// ═══════════════════════════════════════════════════════
// NUEVOS MÓDULOS INTEGRADOS
// ═══════════════════════════════════════════════════════
import { 
  ProcesadorDocumentalMultiModal, 
  DocumentoTransporte, 
  FacturaComercial, 
  ListaEmpaque,
  ResultadoTriangulacion,
  ContenedorExtraido,
  TratadoComercial
} from '@/lib/multimodal/ProcesadorDocumentalMultiModal';
import { 
  MotorExoneraciones, 
  ResultadoExoneracion,
  BeneficioAplicado
} from '@/lib/exoneraciones/MotorExoneraciones';
import { 
  ControlMultiAgencia, 
  ResultadoControlMultiAgencia,
  BloqueoRegulatorio
} from '@/lib/compliance/ControlMultiAgencia';
import { 
  AprendizajeOperativoAI,
  ReglaProyecto
} from '@/lib/aprendizaje/AprendizajeOperativoAI';

// ═══════════════════════════════════════════════════════
// INTERFACES EXTENDIDAS
// ═══════════════════════════════════════════════════════

export interface ResultadoAnalisisCONAPREDManifiesto {
  totalItems: number;
  itemsConAlerta: number;
  alertasCriticas: number;
  alertasAltas: number;
  requiereNotificacionCONAPRED: boolean;
  resultados: ResultadoDeteccionCONAPRED[];
  resumenSustancias: Map<string, number>;
}

export interface ResultadoProcesamientoCompleto {
  // Clasificación y liquidación
  clasificaciones: Map<string, ResultadoClasificacionHTS>;
  liquidaciones: ResultadoLiquidacionSIGA[];
  auditoria: AuditoriaLote;
  
  // Compliance CONAPRED
  analisisCONAPRED: ResultadoAnalisisCONAPREDManifiesto;
  validacionCompliance: Map<string, ValidacionCompliance>;
  
  // Zona aduanera
  tasasZonaAduanera: { concepto: string; monto: number; subtotal: number }[];
  documentosRequeridos: string[];
  
  // ═══ NUEVOS CAMPOS INTEGRADOS ═══
  // Multi-Modal
  triangulacionDocumental?: ResultadoTriangulacion;
  contenedoresExtraidos: ContenedorExtraido[];
  modoTransporteDetectado: ModoTransporte;
  
  // Exoneraciones
  exoneracionesAplicadas: ResultadoExoneracion[];
  ahorroTotalExoneraciones: number;
  tlcDetectado?: TratadoComercial;
  
  // Control Multi-Agencia
  controlMultiAgencia: ResultadoControlMultiAgencia[];
  bloqueosActivos: BloqueoRegulatorio[];
  agenciasInvolucradas: string[];
  
  // Aprendizaje
  reglasProyectoAplicadas: number;
  
  resumen: {
    total: number;
    deMinimis: number;
    liquidacion: number;
    conPermisos: number;
    requierenRevision: number;
    alertasCONAPRED: number;
    bloqueosMultiAgencia: number;
    exoneracionesAplicadas: number;
    ahorroExoneraciones: number;
    totalTributos: number;
    totalAPagar: number;
  };
}

export interface OpcionesProcesamientoAgente {
  fechaRegistro?: Date;
  facturasLineItems?: Map<string, string[]>;
  zonaAduanera?: ZonaAduanera;
  modoTransporte?: ModoTransporte;
  validarComplianceAI?: boolean;
  
  // ═══ NUEVAS OPCIONES ═══
  proyecto?: string;                    // Nombre del proyecto (ej. "Minera Panamá")
  documentoTransporte?: DocumentoTransporte;
  facturaComercial?: FacturaComercial;
  listaEmpaque?: ListaEmpaque;
  aplicarExoneraciones?: boolean;       // Default: true
  validarMultiAgencia?: boolean;        // Default: true
  buscarReglasProyecto?: boolean;       // Default: true
}

// ═══════════════════════════════════════════════════════
// AGENTE PRINCIPAL
// ═══════════════════════════════════════════════════════

export class AgenteAduanalAI {
  
  static async procesarManifiesto(
    paquetes: ManifestRow[],
    manifiestoId: string,
    opciones: OpcionesProcesamientoAgente = {}
  ): Promise<ResultadoProcesamientoCompleto> {
    devLog(`[Agente] ═══════════════════════════════════════════`);
    devLog(`[Agente] Procesando ${paquetes.length} paquetes - IPL Group AI-First`);
    devLog(`[Agente] ═══════════════════════════════════════════`);
    
    const zonaAduanera = opciones.zonaAduanera || 'aeropuerto_tocumen';
    const modoTransporte = opciones.modoTransporte || 'aereo';
    
    // ═══════════════════════════════════════════════════════
    // FASE 0: TRIANGULACIÓN DOCUMENTAL (Multi-Modal)
    // ═══════════════════════════════════════════════════════
    let triangulacionDocumental: ResultadoTriangulacion | undefined;
    let contenedoresExtraidos: ContenedorExtraido[] = [];
    
    if (opciones.documentoTransporte || opciones.facturaComercial || opciones.listaEmpaque) {
      triangulacionDocumental = ProcesadorDocumentalMultiModal.triangularDocumentos(
        opciones.documentoTransporte || null,
        opciones.facturaComercial || null,
        opciones.listaEmpaque || null
      );
      
      if (!triangulacionDocumental.esConsistente) {
        devWarn(`[Agente][MultiModal] ⚠️ Discrepancias documentales detectadas: ${triangulacionDocumental.discrepancias.length}`);
      }
      
      contenedoresExtraidos = opciones.documentoTransporte?.contenedores || [];
      devLog(`[Agente][MultiModal] Contenedores: ${contenedoresExtraidos.length}, Consistencia: ${triangulacionDocumental.confianza}%`);
    }
    
    // ═══════════════════════════════════════════════════════
    // FASE 1: ANÁLISIS CONAPRED - Precursores químicos
    // ═══════════════════════════════════════════════════════
    const itemsCONAPRED = paquetes.map(p => ({
      descripcion: p.description || '',
      pesoKg: (p.weight || 0) * 0.453592,
      guia: p.trackingNumber
    }));
    const analisisCONAPRED = DetectorCONAPRED.analizarManifiesto(itemsCONAPRED);
    
    if (analisisCONAPRED.alertasCriticas > 0) {
      devWarn(`[Agente][CONAPRED] ⚠️ ALERTA CRÍTICA: ${analisisCONAPRED.alertasCriticas} sustancias controladas`);
    }
    
    // ═══════════════════════════════════════════════════════
    // FASE 2: BÚSQUEDA DE REGLAS POR PROYECTO (Aprendizaje)
    // ═══════════════════════════════════════════════════════
    let reglasProyectoAplicadas = 0;
    
    if (opciones.buscarReglasProyecto !== false && opciones.proyecto) {
      devLog(`[Agente][Aprendizaje] Buscando reglas para proyecto: ${opciones.proyecto}`);
      
      for (const paquete of paquetes) {
        const regla = await AprendizajeOperativoAI.buscarClasificacionProyecto(
          opciones.proyecto,
          paquete.description || ''
        );
        
        if (regla) {
          paquete.hsCode = regla.hsCodeAsignado;
          paquete.descripcionArancelaria = regla.descripcionArancelaria;
          reglasProyectoAplicadas++;
        }
      }
      
      if (reglasProyectoAplicadas > 0) {
        devLog(`[Agente][Aprendizaje] ✓ ${reglasProyectoAplicadas} clasificaciones aplicadas desde reglas de proyecto`);
      }
    }
    
    // ═══════════════════════════════════════════════════════
    // FASE 3: CLASIFICACIÓN HTS con AI
    // ═══════════════════════════════════════════════════════
    const { clasificaciones, requierenRevision } = await MotorClasificacionHTS.procesarLoteConAI(
      paquetes,
      opciones.facturasLineItems
    );
    
    // Enriquecer paquetes con código HTS
    paquetes.forEach(paquete => {
      if (paquete.hsCode) return; // Ya tiene HTS de regla de proyecto
      
      const clasificacion = clasificaciones.get(paquete.trackingNumber);
      if (clasificacion) {
        paquete.hsCode = clasificacion.hsCode;
        paquete.descripcionArancelaria = clasificacion.descripcionArancelaria;
        paquete.confianzaHTS = clasificacion.confianzaClasificacion;
        if (clasificacion.autoridadesInvolucradas.length > 0) {
          paquete.autoridadAnuente = clasificacion.autoridadesInvolucradas[0];
        }
      }
    });
    
    devLog(`[Agente] HTS asignados: ${clasificaciones.size} (AI) + ${reglasProyectoAplicadas} (Proyecto)`);
    
    // ═══════════════════════════════════════════════════════
    // FASE 4: CONTROL MULTI-AGENCIA (360°)
    // ═══════════════════════════════════════════════════════
    const controlMultiAgencia: ResultadoControlMultiAgencia[] = [];
    const bloqueosActivos: BloqueoRegulatorio[] = [];
    const agenciasSet = new Set<string>();
    
    if (opciones.validarMultiAgencia !== false) {
      for (const paquete of paquetes) {
        const resultado = ControlMultiAgencia.evaluarCumplimiento({
          descripcion: paquete.description || '',
          hsCode: paquete.hsCode || '',
          valorUSD: paquete.valueUSD || 0,
          pesoKg: (paquete.weight || 0) * 0.453592
        });
        
        controlMultiAgencia.push(resultado);
        bloqueosActivos.push(...resultado.bloqueos);
        resultado.agenciasInvolucradas.forEach(a => agenciasSet.add(a));
      }
      
      if (bloqueosActivos.length > 0) {
        devWarn(`[Agente][MultiAgencia] ⛔ ${bloqueosActivos.length} bloqueos activos`);
      }
    }
    
    // ═══════════════════════════════════════════════════════
    // FASE 5: VALIDACIÓN COMPLIANCE AI
    // ═══════════════════════════════════════════════════════
    let validacionCompliance = new Map<string, ValidacionCompliance>();
    if (opciones.validarComplianceAI !== false) {
      const resultadoCompliance = await ValidadorComplianceAI.validarLote(paquetes);
      validacionCompliance = resultadoCompliance.resultados;
      
      if (resultadoCompliance.erroresCriticos > 0) {
        devWarn(`[Agente][Compliance] ${resultadoCompliance.erroresCriticos} errores críticos`);
      }
    }
    
    // ═══════════════════════════════════════════════════════
    // FASE 6: LIQUIDACIÓN SIGA
    // ═══════════════════════════════════════════════════════
    const aranceles = new Map<string, Arancel>();
    clasificaciones.forEach((c, guia) => aranceles.set(guia, c.arancel));
    
    const { liquidaciones, resumen } = MotorLiquidacionSIGA.procesarLote(
      paquetes, aranceles, manifiestoId, { fechaRegistro: opciones.fechaRegistro }
    );
    
    // ═══════════════════════════════════════════════════════
    // FASE 7: EVALUACIÓN DE EXONERACIONES
    // ═══════════════════════════════════════════════════════
    const exoneracionesAplicadas: ResultadoExoneracion[] = [];
    let ahorroTotalExoneraciones = 0;
    let tlcDetectado: TratadoComercial | undefined;
    
    if (opciones.aplicarExoneraciones !== false) {
      for (const liquidacion of liquidaciones) {
        const paquete = paquetes.find(p => p.trackingNumber === liquidacion.numeroGuia);
        
        const exoneracion = MotorExoneraciones.evaluarExoneraciones({
          hsCode: liquidacion.hsCode,
          descripcion: paquete?.description || '',
          valorCIF: liquidacion.valorCIF,
          paisOrigen: opciones.facturaComercial?.paisOrigen || '',
          destinatario: paquete?.recipient || '',
          proyecto: opciones.proyecto,
          zonaDestino: zonaAduanera,
          certificadoOrigen: opciones.facturaComercial?.certificadoOrigen,
          daiPercent: liquidacion.percentDAI,
          itbmsPercent: liquidacion.percentITBMS,
          iscPercent: liquidacion.percentISC
        });
        
        if (exoneracion.aplicaExoneracion) {
          exoneracionesAplicadas.push(exoneracion);
          ahorroTotalExoneraciones += exoneracion.ahorro;
          
          // Ajustar liquidación con exoneración
          liquidacion.montoDAI -= exoneracion.daiExonerado;
          liquidacion.montoITBMS -= exoneracion.itbmsExonerado;
          liquidacion.montoISC -= exoneracion.iscExonerado;
          
          // Actualizar observaciones
          const exoneracionTexto = ` | EXONERACIÓN: ${exoneracion.beneficios.map(b => b.nombre).join(', ')}`;
          const obsActuales = Array.isArray(liquidacion.observaciones) 
            ? liquidacion.observaciones.join('; ') 
            : (liquidacion.observaciones || '');
          liquidacion.observaciones = [obsActuales + exoneracionTexto];
        }
        
        // Detectar TLC
        if (!tlcDetectado && opciones.facturaComercial?.paisOrigen) {
          tlcDetectado = MotorExoneraciones.detectarTLCAplicable(opciones.facturaComercial.paisOrigen);
          if (tlcDetectado !== 'NINGUNO') {
            devLog(`[Agente][Exoneraciones] TLC detectado: ${tlcDetectado}`);
          }
        }
      }
      
      if (exoneracionesAplicadas.length > 0) {
        devLog(`[Agente][Exoneraciones] ✓ ${exoneracionesAplicadas.length} exoneraciones, ahorro total: $${ahorroTotalExoneraciones.toFixed(2)}`);
      }
    }
    
    // ═══════════════════════════════════════════════════════
    // FASE 8: TASAS Y DOCUMENTOS POR ZONA
    // ═══════════════════════════════════════════════════════
    const puntos = obtenerPuntosPorZona(zonaAduanera);
    const codigoPunto = puntos.length > 0 ? puntos[0].codigo : zonaAduanera;
    const tasasZonaAduanera = calcularTasasPuntoControl(codigoPunto, {
      modo: modoTransporte,
      cantidadBultos: paquetes.length,
      cantidadContenedores: contenedoresExtraidos.length
    });
    const documentosRequeridos = obtenerDocumentosRequeridos(codigoPunto);
    
    // ═══════════════════════════════════════════════════════
    // FASE 9: AUDITORÍA DE RIESGOS
    // ═══════════════════════════════════════════════════════
    const hsCodes = new Map<string, string>();
    clasificaciones.forEach((c, guia) => hsCodes.set(guia, c.hsCode));
    const auditoria = DetectorRiesgos.auditarLote(paquetes, { hsCodes });
    
    // Calcular items que requieren revisión
    let itemsRequierenRevision = requierenRevision.length;
    validacionCompliance.forEach((v) => {
      if (v.requiereRevisionManual) itemsRequierenRevision++;
    });
    
    devLog(`[Agente] ═══════════════════════════════════════════`);
    devLog(`[Agente] Procesamiento completado`);
    devLog(`[Agente] ═══════════════════════════════════════════`);
    
    return {
      clasificaciones,
      liquidaciones,
      auditoria,
      analisisCONAPRED,
      validacionCompliance,
      tasasZonaAduanera,
      documentosRequeridos,
      
      // Nuevos campos
      triangulacionDocumental,
      contenedoresExtraidos,
      modoTransporteDetectado: modoTransporte,
      exoneracionesAplicadas,
      ahorroTotalExoneraciones,
      tlcDetectado: tlcDetectado !== 'NINGUNO' ? tlcDetectado : undefined,
      controlMultiAgencia,
      bloqueosActivos,
      agenciasInvolucradas: Array.from(agenciasSet),
      reglasProyectoAplicadas,
      
      resumen: {
        total: paquetes.length,
        deMinimis: resumen.porCategoria.B.cantidad,
        liquidacion: resumen.porCategoria.C.cantidad + resumen.porCategoria.D.cantidad,
        conPermisos: liquidaciones.filter(l => l.tieneRestricciones).length,
        requierenRevision: itemsRequierenRevision,
        alertasCONAPRED: analisisCONAPRED.itemsConAlerta,
        bloqueosMultiAgencia: bloqueosActivos.length,
        exoneracionesAplicadas: exoneracionesAplicadas.length,
        ahorroExoneraciones: ahorroTotalExoneraciones,
        totalTributos: resumen.totalTributos - ahorroTotalExoneraciones,
        totalAPagar: resumen.totalAPagar - ahorroTotalExoneraciones
      }
    };
  }
  
  // ═══════════════════════════════════════════════════════
  // MÉTODOS DE APRENDIZAJE
  // ═══════════════════════════════════════════════════════
  
  static async aprenderClasificacionProyecto(params: {
    proyecto: string;
    descripcion: string;
    hsCode: string;
    descripcionArancelaria: string;
    corredorId: string;
    corredorNombre: string;
  }): Promise<boolean> {
    return AprendizajeOperativoAI.aprenderClasificacionProyecto({
      proyecto: params.proyecto,
      destinatario: '',
      descripcion: params.descripcion,
      hsCode: params.hsCode,
      descripcionArancelaria: params.descripcionArancelaria,
      corredorId: params.corredorId,
      corredorNombre: params.corredorNombre
    });
  }
  
  // ═══════════════════════════════════════════════════════
  // DESCARGA CON FIRMA
  // ═══════════════════════════════════════════════════════
  
  static async descargarConFirma(
    resultado: ResultadoProcesamientoCompleto,
    paquetes: ManifestRow[],
    corredor: { id: string; nombre: string },
    mawb?: string
  ): Promise<{ firma: FirmaDigital; archivoDescargado: boolean }> {
    const documentoId = `DOC_${Date.now()}`;
    const contenido = JSON.stringify({ 
      total: paquetes.length, 
      mawb,
      exoneraciones: resultado.exoneracionesAplicadas.length,
      ahorro: resultado.ahorroTotalExoneraciones
    });
    
    const firma = await generarFirmaDigital(contenido, corredor.id, corredor.nombre, documentoId);
    
    const liquidaciones: Liquidacion[] = resultado.liquidaciones.map(l => ({
      id: l.id || `LIQ_${l.numeroGuia}`,
      numeroGuia: l.numeroGuia,
      manifiestoId: mawb || 'SIN_MAWB',
      categoriaAduanera: l.categoriaAduanera,
      categoriaDescripcion: l.categoriaDescripcion || '',
      valorFOB: l.valorFOB,
      valorFlete: l.valorFlete,
      valorSeguro: l.valorSeguro,
      valorCIF: l.valorCIF,
      monedaOriginal: 'USD',
      tipoCambio: 1,
      hsCode: l.hsCode,
      descripcionArancelaria: l.descripcionArancelaria,
      percentDAI: l.percentDAI,
      percentISC: l.percentISC,
      percentITBMS: l.percentITBMS,
      montoDAI: l.montoDAI,
      baseISC: l.valorCIF + l.montoDAI,
      montoISC: l.montoISC,
      baseITBMS: l.valorCIF + l.montoDAI + l.montoISC,
      montoITBMS: l.montoITBMS,
      tasaAduanera: l.tasaAduanera,
      tasasAdicionales: 0,
      totalTributos: l.boletaPago.montoActual - l.valorCIF,
      totalAPagar: l.boletaPago.montoActual,
      estado: l.estado as any || 'calculada',
      tieneRestricciones: l.tieneRestricciones,
      restricciones: l.restricciones,
      observaciones: l.observaciones,
      requiereRevisionManual: l.requiereRevisionManual,
      calculadaPor: 'SISTEMA_AI',
      fechaCalculo: new Date().toISOString(),
      version: 1
    }));

    const datos: DatosExcelInteligente = {
      paquetes,
      liquidaciones,
      mawb: mawb || 'SIN_MAWB',
      fechaProceso: new Date()
    };
    
    await descargarExcelInteligente(datos);
    return { firma, archivoDescargado: true };
  }
  
  static registrarAprendizaje(guia: string, palabraClave: string, autoridad: string, descripcion: string): void {
    GestorRestriccionesAprendidas.aprenderRestriccion(palabraClave, 'farmaceutico', autoridad, descripcion, { guiaOrigen: guia });
  }
  
  // ═══════════════════════════════════════════════════════
  // ACCESO DIRECTO A MÓDULOS
  // ═══════════════════════════════════════════════════════
  
  static get DetectorCONAPRED() { return DetectorCONAPRED; }
  static get ValidadorComplianceAI() { return ValidadorComplianceAI; }
  static get ProcesadorDocumentalMultiModal() { return ProcesadorDocumentalMultiModal; }
  static get MotorExoneraciones() { return MotorExoneraciones; }
  static get ControlMultiAgencia() { return ControlMultiAgencia; }
  static get AprendizajeOperativoAI() { return AprendizajeOperativoAI; }
  
  static get CLAUSULA_RESPONSABILIDAD() { return CLAUSULA_RESPONSABILIDAD; }
}

export default AgenteAduanalAI;
