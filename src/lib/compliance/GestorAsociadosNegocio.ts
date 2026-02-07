/**
 * GESTOR DE ASOCIADOS DE NEGOCIO — BASC v6-2022
 * Debida diligencia de clientes y proveedores
 * Verificación en listas restrictivas (OFAC, ONU)
 * Auditoría automática por Zod Integrity Engine
 */

import CryptoJS from 'crypto-js';
import { devLog, devWarn } from '@/lib/logger';

// ============ TIPOS ============

export type NivelRiesgo = 'bajo' | 'medio' | 'alto' | 'critico' | 'bloqueado';
export type EstadoAsociado = 'pendiente' | 'aprobado' | 'rechazado' | 'suspendido' | 'vencido';
export type TipoDocumento = 'licencia_comercial' | 'antecedentes_penales' | 'poliza_seguro' | 'ruc' | 'certificado_basc' | 'certificado_oea' | 'otro';

export interface DocumentoAsociado {
  id: string;
  tipo: TipoDocumento;
  nombre: string;
  fechaEmision: string;
  fechaVencimiento?: string;
  verificado: boolean;
  hashDocumento?: string;
}

export interface VerificacionLista {
  lista: 'OFAC_SDN' | 'OFAC_CONSOLIDATED' | 'ONU_SANCTIONS' | 'EU_SANCTIONS' | 'INTERPOL' | 'PEP_PANAMA';
  resultado: 'limpio' | 'coincidencia' | 'coincidencia_parcial' | 'error';
  fechaVerificacion: string;
  detalles?: string;
  puntuacionCoincidencia?: number;
}

export interface AsociadoNegocio {
  id: string;
  nombre: string;
  nombreNormalizado: string;
  ruc?: string;
  tipo: 'cliente' | 'proveedor' | 'transportista' | 'agente';
  pais: string;
  direccion?: string;
  contacto?: string;
  email?: string;
  
  // Debida diligencia
  nivelRiesgo: NivelRiesgo;
  estado: EstadoAsociado;
  puntuacionRiesgo: number; // 0-100
  
  // Documentos
  documentos: DocumentoAsociado[];
  
  // Verificaciones en listas
  verificacionesListas: VerificacionLista[];
  
  // Historial
  fechaRegistro: string;
  ultimaVerificacion?: string;
  despachosTotales: number;
  incidentesReportados: number;
  
  // Integridad
  hashRegistro: string;
  zodVerificado: boolean;
  notas?: string;
}

export interface ResultadoDebidaDiligencia {
  asociadoId: string;
  aprobado: boolean;
  nivelRiesgo: NivelRiesgo;
  puntuacionRiesgo: number;
  alertas: string[];
  bloqueos: string[];
  recomendaciones: string[];
  verificacionesListas: VerificacionLista[];
  documentosFaltantes: TipoDocumento[];
  hashVerificacion: string;
}

// ============ LISTAS RESTRICTIVAS (SIMULACIÓN LOCAL) ============

const LISTA_OFAC_KEYWORDS = [
  'al-qaeda', 'isis', 'hezbollah', 'hamas', 'farc', 'eln',
  'norte corea', 'north korea', 'iran sanctions', 'syria sanctions',
  'taliban', 'cartel sinaloa', 'cartel jalisco', 'clan del golfo',
  'sendero luminoso', 'primera linea'
];

const PAISES_ALTO_RIESGO = [
  'iran', 'siria', 'corea del norte', 'cuba', 'yemen', 'somalia',
  'libia', 'sudan del sur', 'myanmar', 'afganistan', 'venezuela'
];

const NOMBRES_SOSPECHOSOS_PATTERNS = [
  /^(sin nombre|unknown|test|na|n\/a)$/i,
  /^[a-z]{1,2}$/i,
  /^\d+$/,
];

// ============ MOTOR DE DEBIDA DILIGENCIA ============

export class GestorAsociadosNegocio {
  
  private static asociados: Map<string, AsociadoNegocio> = new Map();
  
  /**
   * Registra un nuevo asociado de negocio
   */
  static registrarAsociado(datos: {
    nombre: string;
    ruc?: string;
    tipo: AsociadoNegocio['tipo'];
    pais: string;
    direccion?: string;
    contacto?: string;
    email?: string;
  }): AsociadoNegocio {
    const id = `asoc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const nombreNorm = datos.nombre.toUpperCase().trim().replace(/\s+/g, ' ');
    
    const asociado: AsociadoNegocio = {
      id,
      nombre: datos.nombre,
      nombreNormalizado: nombreNorm,
      ruc: datos.ruc,
      tipo: datos.tipo,
      pais: datos.pais,
      direccion: datos.direccion,
      contacto: datos.contacto,
      email: datos.email,
      nivelRiesgo: 'medio',
      estado: 'pendiente',
      puntuacionRiesgo: 50,
      documentos: [],
      verificacionesListas: [],
      fechaRegistro: new Date().toISOString(),
      despachosTotales: 0,
      incidentesReportados: 0,
      hashRegistro: '',
      zodVerificado: false,
    };
    
    asociado.hashRegistro = this.generarHash(asociado);
    this.asociados.set(id, asociado);
    
    devLog(`[BASC] Asociado registrado: ${datos.nombre} (${datos.tipo})`);
    return asociado;
  }
  
  /**
   * Ejecuta debida diligencia completa sobre un asociado
   */
  static ejecutarDebidaDiligencia(asociadoId: string): ResultadoDebidaDiligencia {
    const asociado = this.asociados.get(asociadoId);
    if (!asociado) {
      return {
        asociadoId,
        aprobado: false,
        nivelRiesgo: 'bloqueado',
        puntuacionRiesgo: 100,
        alertas: ['Asociado no encontrado en el sistema'],
        bloqueos: ['ID de asociado inválido'],
        recomendaciones: ['Registre al asociado antes de solicitar despacho'],
        verificacionesListas: [],
        documentosFaltantes: ['licencia_comercial', 'antecedentes_penales', 'ruc'],
        hashVerificacion: CryptoJS.SHA256(`invalid:${asociadoId}:${Date.now()}`).toString(),
      };
    }
    
    const alertas: string[] = [];
    const bloqueos: string[] = [];
    const recomendaciones: string[] = [];
    let puntuacion = 0;
    
    // 1. Verificación en listas restrictivas
    const verificaciones = this.verificarListasRestrictivas(asociado);
    asociado.verificacionesListas = verificaciones;
    
    const coincidencias = verificaciones.filter(v => v.resultado === 'coincidencia');
    const parciales = verificaciones.filter(v => v.resultado === 'coincidencia_parcial');
    
    if (coincidencias.length > 0) {
      bloqueos.push(`BLOQUEO OFAC/ONU: Coincidencia directa en ${coincidencias.map(c => c.lista).join(', ')}`);
      puntuacion = 100;
    }
    
    if (parciales.length > 0) {
      alertas.push(`Coincidencia parcial en ${parciales.map(p => p.lista).join(', ')} — Requiere revisión manual`);
      puntuacion += 30 * parciales.length;
    }
    
    // 2. Verificación de país de alto riesgo
    if (PAISES_ALTO_RIESGO.includes(asociado.pais.toLowerCase())) {
      alertas.push(`País de alto riesgo: ${asociado.pais}`);
      puntuacion += 25;
    }
    
    // 3. Verificación de documentos
    const documentosFaltantes = this.verificarDocumentos(asociado);
    if (documentosFaltantes.length > 0) {
      alertas.push(`Documentos faltantes: ${documentosFaltantes.join(', ')}`);
      puntuacion += 5 * documentosFaltantes.length;
    }
    
    // 4. Verificación de documentos vencidos
    const vencidos = asociado.documentos.filter(d => {
      if (!d.fechaVencimiento) return false;
      return new Date(d.fechaVencimiento) < new Date();
    });
    if (vencidos.length > 0) {
      alertas.push(`Documentos vencidos: ${vencidos.map(d => d.nombre).join(', ')}`);
      puntuacion += 15 * vencidos.length;
    }
    
    // 5. Validación de nombre
    if (NOMBRES_SOSPECHOSOS_PATTERNS.some(p => p.test(asociado.nombre))) {
      bloqueos.push('Nombre del asociado es sospechoso o inválido');
      puntuacion += 40;
    }
    
    // 6. Historial de incidentes
    if (asociado.incidentesReportados > 0) {
      alertas.push(`${asociado.incidentesReportados} incidente(s) previo(s) reportado(s)`);
      puntuacion += 10 * asociado.incidentesReportados;
    }
    
    // Recomendaciones
    if (puntuacion > 70) {
      recomendaciones.push('Requerir supervisión directa del Oficial de Seguridad BASC');
    }
    if (puntuacion > 40) {
      recomendaciones.push('Solicitar documentación adicional antes de aprobar despachos');
    }
    if (!asociado.ruc) {
      recomendaciones.push('Verificar RUC/Cédula del asociado en el Registro Público');
    }
    
    // Determinar nivel y estado
    puntuacion = Math.min(100, puntuacion);
    const nivelRiesgo = this.calcularNivelRiesgo(puntuacion, bloqueos.length > 0);
    
    asociado.puntuacionRiesgo = puntuacion;
    asociado.nivelRiesgo = nivelRiesgo;
    asociado.estado = bloqueos.length > 0 ? 'rechazado' : puntuacion > 60 ? 'pendiente' : 'aprobado';
    asociado.ultimaVerificacion = new Date().toISOString();
    asociado.zodVerificado = true;
    asociado.hashRegistro = this.generarHash(asociado);
    
    const hashVerificacion = CryptoJS.SHA256(
      `dd:${asociadoId}:${puntuacion}:${bloqueos.length}:${Date.now()}`
    ).toString();
    
    devLog(`[BASC] Debida diligencia completada: ${asociado.nombre} → Riesgo: ${nivelRiesgo} (${puntuacion})`);
    
    return {
      asociadoId,
      aprobado: bloqueos.length === 0 && puntuacion <= 60,
      nivelRiesgo,
      puntuacionRiesgo: puntuacion,
      alertas,
      bloqueos,
      recomendaciones,
      verificacionesListas: verificaciones,
      documentosFaltantes,
      hashVerificacion,
    };
  }
  
  /**
   * Verificar nombre contra listas restrictivas
   */
  private static verificarListasRestrictivas(asociado: AsociadoNegocio): VerificacionLista[] {
    const nombre = asociado.nombreNormalizado.toLowerCase();
    const now = new Date().toISOString();
    const listas: VerificacionLista['lista'][] = [
      'OFAC_SDN', 'OFAC_CONSOLIDATED', 'ONU_SANCTIONS', 'EU_SANCTIONS', 'INTERPOL', 'PEP_PANAMA'
    ];
    
    return listas.map(lista => {
      // Verificación local contra keywords
      const esCoincidencia = LISTA_OFAC_KEYWORDS.some(kw => nombre.includes(kw));
      const esParcial = !esCoincidencia && LISTA_OFAC_KEYWORDS.some(kw => {
        const words = kw.split(' ');
        return words.some(w => w.length > 3 && nombre.includes(w));
      });
      
      return {
        lista,
        resultado: esCoincidencia ? 'coincidencia' as const : esParcial ? 'coincidencia_parcial' as const : 'limpio' as const,
        fechaVerificacion: now,
        detalles: esCoincidencia ? 'Coincidencia directa detectada' : esParcial ? 'Coincidencia parcial — verificar manualmente' : undefined,
        puntuacionCoincidencia: esCoincidencia ? 100 : esParcial ? 45 : 0,
      };
    });
  }
  
  /**
   * Verificar documentos requeridos
   */
  private static verificarDocumentos(asociado: AsociadoNegocio): TipoDocumento[] {
    const requeridos: TipoDocumento[] = ['licencia_comercial', 'ruc'];
    
    if (asociado.tipo === 'transportista') {
      requeridos.push('poliza_seguro');
    }
    
    const tiposExistentes = new Set(asociado.documentos.map(d => d.tipo));
    return requeridos.filter(r => !tiposExistentes.has(r));
  }
  
  /**
   * Calcular nivel de riesgo
   */
  private static calcularNivelRiesgo(puntuacion: number, tieneBloqueos: boolean): NivelRiesgo {
    if (tieneBloqueos) return 'bloqueado';
    if (puntuacion >= 80) return 'critico';
    if (puntuacion >= 60) return 'alto';
    if (puntuacion >= 30) return 'medio';
    return 'bajo';
  }
  
  /**
   * Verificar si un consignatario puede despachar
   */
  static puedeDespachar(nombreConsignatario: string): {
    permitido: boolean;
    razon?: string;
    nivelRiesgo: NivelRiesgo;
  } {
    const normalizado = nombreConsignatario.toUpperCase().trim();
    
    // Buscar en asociados registrados
    for (const [, asociado] of this.asociados) {
      if (asociado.nombreNormalizado === normalizado) {
        if (asociado.estado === 'rechazado' || asociado.estado === 'suspendido') {
          return {
            permitido: false,
            razon: `Asociado ${asociado.estado}: ${asociado.nombre}. Zod bloquea cualquier despacho asociado.`,
            nivelRiesgo: asociado.nivelRiesgo,
          };
        }
        if (asociado.estado === 'vencido') {
          return {
            permitido: false,
            razon: `Documentación vencida para ${asociado.nombre}. Actualice documentos antes de despachar.`,
            nivelRiesgo: 'alto',
          };
        }
        return { permitido: true, nivelRiesgo: asociado.nivelRiesgo };
      }
    }
    
    // No registrado — verificación rápida contra listas
    const esEnLista = LISTA_OFAC_KEYWORDS.some(kw => normalizado.toLowerCase().includes(kw));
    if (esEnLista) {
      return {
        permitido: false,
        razon: 'Coincidencia detectada en listas restrictivas. Requiere verificación completa.',
        nivelRiesgo: 'bloqueado',
      };
    }
    
    return { permitido: true, nivelRiesgo: 'bajo' };
  }
  
  /**
   * Agregar documento a un asociado
   */
  static agregarDocumento(asociadoId: string, doc: Omit<DocumentoAsociado, 'id'>): boolean {
    const asociado = this.asociados.get(asociadoId);
    if (!asociado) return false;
    
    const documento: DocumentoAsociado = {
      ...doc,
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    };
    
    asociado.documentos.push(documento);
    asociado.hashRegistro = this.generarHash(asociado);
    devLog(`[BASC] Documento agregado: ${doc.nombre} → ${asociado.nombre}`);
    return true;
  }
  
  /**
   * Obtener todos los asociados
   */
  static obtenerAsociados(): AsociadoNegocio[] {
    return Array.from(this.asociados.values());
  }
  
  /**
   * Obtener asociado por ID
   */
  static obtenerAsociado(id: string): AsociadoNegocio | undefined {
    return this.asociados.get(id);
  }
  
  /**
   * Obtener métricas BASC
   */
  static obtenerMetricasBASC(): {
    totalAsociados: number;
    aprobados: number;
    pendientes: number;
    rechazados: number;
    porNivelRiesgo: Record<NivelRiesgo, number>;
    cumplimientoPorcentaje: number;
  } {
    const asociados = Array.from(this.asociados.values());
    const porNivel: Record<NivelRiesgo, number> = { bajo: 0, medio: 0, alto: 0, critico: 0, bloqueado: 0 };
    let aprobados = 0, pendientes = 0, rechazados = 0;
    
    for (const a of asociados) {
      porNivel[a.nivelRiesgo]++;
      if (a.estado === 'aprobado') aprobados++;
      else if (a.estado === 'pendiente') pendientes++;
      else rechazados++;
    }
    
    const total = asociados.length || 1;
    const cumplimiento = Math.round((aprobados / total) * 100);
    
    return {
      totalAsociados: asociados.length,
      aprobados,
      pendientes,
      rechazados,
      porNivelRiesgo: porNivel,
      cumplimientoPorcentaje: cumplimiento,
    };
  }
  
  /**
   * Generar hash de integridad
   */
  private static generarHash(asociado: AsociadoNegocio): string {
    const data = JSON.stringify({
      id: asociado.id,
      nombre: asociado.nombreNormalizado,
      ruc: asociado.ruc,
      estado: asociado.estado,
      puntuacionRiesgo: asociado.puntuacionRiesgo,
      fechaRegistro: asociado.fechaRegistro,
    });
    return CryptoJS.SHA256(data).toString();
  }
}
