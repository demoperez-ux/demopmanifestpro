/**
 * MOTOR DE CUMPLIMIENTO OEA — Operador Económico Autorizado
 * Matriz de riesgo aduanero basada en Resolución ANA
 * Validación de sellos/precintos y checklist Pilar 2
 * Monitoreo de Ruta Crítica por Stella Help
 */

import CryptoJS from 'crypto-js';
import { devLog, devWarn } from '@/lib/logger';

// ============ TIPOS ============

export type NivelCumplimiento = 'optimo' | 'aceptable' | 'mejorable' | 'deficiente' | 'critico';

export interface ItemChecklistOEA {
  id: string;
  pilar: 1 | 2 | 3 | 4 | 5;
  categoria: string;
  descripcion: string;
  completado: boolean;
  obligatorio: boolean;
  evidencia?: string;
  fechaCumplimiento?: string;
  notas?: string;
}

export interface ValidacionSello {
  id: string;
  mawb: string;
  guia: string;
  selloDeclarado: string;
  selloRecibido: string;
  coincide: boolean;
  tipoSello: 'mecanico' | 'electronico' | 'bolt_seal' | 'cable_seal';
  verificadoPor?: string;
  fechaVerificacion: string;
  hashVerificacion: string;
}

export interface AlertaRutaCritica {
  id: string;
  mawb: string;
  tipo: 'desvio_ruta' | 'demora_excesiva' | 'parada_no_autorizada' | 'cambio_vehiculo' | 'sello_roto';
  severidad: 'info' | 'warning' | 'critical';
  descripcion: string;
  tiempoEsperadoHoras: number;
  tiempoRealHoras?: number;
  desviacionPorcentaje?: number;
  fechaDeteccion: string;
  resuelta: boolean;
  stellaMensaje: string;
}

export interface MatrizRiesgoItem {
  factor: string;
  peso: number; // 1-10
  puntuacion: number; // 0-100
  detalles: string;
  categoria: 'operativo' | 'financiero' | 'regulatorio' | 'logistico' | 'seguridad';
}

export interface ResultadoMatrizRiesgo {
  puntuacionGlobal: number; // 0-100
  nivel: NivelCumplimiento;
  factores: MatrizRiesgoItem[];
  alertasActivas: AlertaRutaCritica[];
  checklistCompletado: number; // porcentaje
  recomendaciones: string[];
  hashAuditoria: string;
}

export interface MetricasOEA {
  cumplimientoGeneral: number;
  pilaresCompletados: Record<number, number>;
  sellosVerificados: number;
  sellosDiscrepantes: number;
  alertasActivas: number;
  alertasResueltas: number;
  tiempoPromedioResolucion: number;
  ultimaAuditoria?: string;
}

// ============ CHECKLIST PILAR 2 (Seguridad del Contenedor y Carga) ============

const CHECKLIST_PILAR_2: Omit<ItemChecklistOEA, 'completado' | 'evidencia' | 'fechaCumplimiento' | 'notas'>[] = [
  { id: 'p2-01', pilar: 2, categoria: 'Integridad del Contenedor', descripcion: 'Inspección visual de 7 puntos del contenedor (piso, techo, paredes, puertas, rieles, soportes)', obligatorio: true },
  { id: 'p2-02', pilar: 2, categoria: 'Integridad del Contenedor', descripcion: 'Verificación de sellos/precintos al momento de carga', obligatorio: true },
  { id: 'p2-03', pilar: 2, categoria: 'Integridad del Contenedor', descripcion: 'Registro fotográfico del estado del contenedor antes del sellado', obligatorio: true },
  { id: 'p2-04', pilar: 2, categoria: 'Control de Acceso a la Carga', descripcion: 'Identificación del personal autorizado para manipular carga', obligatorio: true },
  { id: 'p2-05', pilar: 2, categoria: 'Control de Acceso a la Carga', descripcion: 'Registro de entrada/salida en área de carga', obligatorio: true },
  { id: 'p2-06', pilar: 2, categoria: 'Almacenamiento', descripcion: 'Carga almacenada en área segura con acceso controlado', obligatorio: true },
  { id: 'p2-07', pilar: 2, categoria: 'Almacenamiento', descripcion: 'Segregación de carga según tipo y destino', obligatorio: false },
  { id: 'p2-08', pilar: 2, categoria: 'Monitoreo', descripcion: 'Sistema de videovigilancia (CCTV) en área de carga operativo', obligatorio: true },
  { id: 'p2-09', pilar: 2, categoria: 'Monitoreo', descripcion: 'Iluminación adecuada en todas las áreas de almacenamiento', obligatorio: false },
  { id: 'p2-10', pilar: 2, categoria: 'Documentación', descripcion: 'Manifiesto de carga conciliado con documentos de transporte', obligatorio: true },
  { id: 'p2-11', pilar: 2, categoria: 'Documentación', descripcion: 'Carta de porte / BL / AWB verificado contra físico', obligatorio: true },
  { id: 'p2-12', pilar: 2, categoria: 'Trazabilidad', descripcion: 'Rastreo GPS activo durante el transporte', obligatorio: false },
];

// ============ MOTOR OEA ============

export class MotorCumplimientoOEA {
  
  private static checklist: ItemChecklistOEA[] = [];
  private static validacionesSellos: ValidacionSello[] = [];
  private static alertasRutaCritica: AlertaRutaCritica[] = [];
  private static inicializado = false;
  
  /**
   * Inicializar checklist de Pilar 2
   */
  static inicializarChecklist(): ItemChecklistOEA[] {
    if (this.inicializado && this.checklist.length > 0) return this.checklist;
    
    this.checklist = CHECKLIST_PILAR_2.map(item => ({
      ...item,
      completado: false,
    }));
    
    this.inicializado = true;
    devLog(`[OEA] Checklist Pilar 2 inicializado: ${this.checklist.length} ítems`);
    return this.checklist;
  }
  
  /**
   * Completar ítem del checklist
   */
  static completarItem(itemId: string, evidencia?: string, notas?: string): boolean {
    const item = this.checklist.find(i => i.id === itemId);
    if (!item) return false;
    
    item.completado = true;
    item.evidencia = evidencia;
    item.notas = notas;
    item.fechaCumplimiento = new Date().toISOString();
    
    devLog(`[OEA] Ítem completado: ${item.descripcion.substring(0, 50)}...`);
    return true;
  }
  
  /**
   * Obtener checklist actual
   */
  static obtenerChecklist(): ItemChecklistOEA[] {
    if (!this.inicializado) this.inicializarChecklist();
    return [...this.checklist];
  }
  
  /**
   * Validar sello/precinto declarado vs recibido
   */
  static validarSello(params: {
    mawb: string;
    guia: string;
    selloDeclarado: string;
    selloRecibido: string;
    tipoSello: ValidacionSello['tipoSello'];
    verificadoPor?: string;
  }): ValidacionSello {
    const coincide = params.selloDeclarado.trim().toUpperCase() === params.selloRecibido.trim().toUpperCase();
    
    const hashData = `sello:${params.mawb}:${params.guia}:${params.selloDeclarado}:${params.selloRecibido}:${Date.now()}`;
    
    const validacion: ValidacionSello = {
      id: `seal_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      mawb: params.mawb,
      guia: params.guia,
      selloDeclarado: params.selloDeclarado,
      selloRecibido: params.selloRecibido,
      coincide,
      tipoSello: params.tipoSello,
      verificadoPor: params.verificadoPor,
      fechaVerificacion: new Date().toISOString(),
      hashVerificacion: CryptoJS.SHA256(hashData).toString(),
    };
    
    this.validacionesSellos.push(validacion);
    
    if (!coincide) {
      devWarn(`[OEA] ⚠️ Discrepancia de sello: Declarado=${params.selloDeclarado}, Recibido=${params.selloRecibido}`);
      
      // Generar alerta de ruta crítica
      this.registrarAlertaRutaCritica({
        mawb: params.mawb,
        tipo: 'sello_roto',
        severidad: 'critical',
        descripcion: `Sello declarado (${params.selloDeclarado}) no coincide con sello recibido (${params.selloRecibido}). Posible contaminación de carga.`,
        tiempoEsperadoHoras: 0,
      });
    }
    
    return validacion;
  }
  
  /**
   * Registrar alerta de ruta crítica
   */
  static registrarAlertaRutaCritica(params: {
    mawb: string;
    tipo: AlertaRutaCritica['tipo'];
    severidad: AlertaRutaCritica['severidad'];
    descripcion: string;
    tiempoEsperadoHoras: number;
    tiempoRealHoras?: number;
  }): AlertaRutaCritica {
    const desviacion = params.tiempoRealHoras && params.tiempoEsperadoHoras > 0
      ? ((params.tiempoRealHoras - params.tiempoEsperadoHoras) / params.tiempoEsperadoHoras) * 100
      : undefined;
    
    const stellaMensajes: Record<AlertaRutaCritica['tipo'], string> = {
      desvio_ruta: `Jefe, he detectado un desvío en la ruta del envío ${params.mawb}. Esto podría indicar una parada no autorizada. Recomiendo verificar con el transportista.`,
      demora_excesiva: `Jefe, el tránsito del envío ${params.mawb} excede el tiempo estimado en ${desviacion?.toFixed(0) || '?'}%. Esto es una señal de alerta según el protocolo OEA.`,
      parada_no_autorizada: `Jefe, se detectó una parada no programada en la ruta del envío ${params.mawb}. Protocolo BASC requiere verificación inmediata.`,
      cambio_vehiculo: `Jefe, el envío ${params.mawb} fue transferido a otro vehículo sin autorización previa. Esto viola el protocolo de cadena de custodia.`,
      sello_roto: `⚠️ Jefe, atención crítica: El sello del envío ${params.mawb} no coincide. Zod ha bloqueado la liquidación hasta verificar la integridad de la carga.`,
    };
    
    const alerta: AlertaRutaCritica = {
      id: `alrt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      mawb: params.mawb,
      tipo: params.tipo,
      severidad: params.severidad,
      descripcion: params.descripcion,
      tiempoEsperadoHoras: params.tiempoEsperadoHoras,
      tiempoRealHoras: params.tiempoRealHoras,
      desviacionPorcentaje: desviacion,
      fechaDeteccion: new Date().toISOString(),
      resuelta: false,
      stellaMensaje: stellaMensajes[params.tipo],
    };
    
    this.alertasRutaCritica.push(alerta);
    devWarn(`[OEA] Alerta ruta crítica: ${params.tipo} — ${params.descripcion}`);
    return alerta;
  }
  
  /**
   * Calcular matriz de riesgo aduanero
   */
  static calcularMatrizRiesgo(params: {
    totalPaquetes: number;
    paquetesConErrores: number;
    paquetesRestringidos: number;
    valorCIFTotal: number;
    sellosDiscrepantes: number;
    incidentesPrevios: number;
    diasUltimaAuditoria?: number;
  }): ResultadoMatrizRiesgo {
    const factores: MatrizRiesgoItem[] = [];
    
    // Factor 1: Tasa de errores
    const tasaErrores = params.totalPaquetes > 0 ? (params.paquetesConErrores / params.totalPaquetes) * 100 : 0;
    factores.push({
      factor: 'Tasa de errores en declaraciones',
      peso: 8,
      puntuacion: Math.min(100, tasaErrores * 5),
      detalles: `${params.paquetesConErrores}/${params.totalPaquetes} paquetes con errores (${tasaErrores.toFixed(1)}%)`,
      categoria: 'operativo',
    });
    
    // Factor 2: Mercancías restringidas
    const tasaRestringidas = params.totalPaquetes > 0 ? (params.paquetesRestringidos / params.totalPaquetes) * 100 : 0;
    factores.push({
      factor: 'Concentración de mercancías restringidas',
      peso: 9,
      puntuacion: Math.min(100, tasaRestringidas * 3),
      detalles: `${params.paquetesRestringidos} paquetes con restricciones sanitarias o regulatorias`,
      categoria: 'regulatorio',
    });
    
    // Factor 3: Integridad de sellos
    factores.push({
      factor: 'Integridad de sellos y precintos',
      peso: 10,
      puntuacion: params.sellosDiscrepantes > 0 ? Math.min(100, params.sellosDiscrepantes * 50) : 0,
      detalles: params.sellosDiscrepantes > 0 ? `${params.sellosDiscrepantes} sello(s) con discrepancia` : 'Todos los sellos verificados correctamente',
      categoria: 'seguridad',
    });
    
    // Factor 4: Valor CIF
    factores.push({
      factor: 'Exposición por valor CIF',
      peso: 6,
      puntuacion: params.valorCIFTotal > 50000 ? 70 : params.valorCIFTotal > 20000 ? 40 : 15,
      detalles: `Valor CIF total: $${params.valorCIFTotal.toFixed(2)}`,
      categoria: 'financiero',
    });
    
    // Factor 5: Incidentes previos
    factores.push({
      factor: 'Historial de incidentes',
      peso: 7,
      puntuacion: Math.min(100, params.incidentesPrevios * 20),
      detalles: `${params.incidentesPrevios} incidentes previos registrados`,
      categoria: 'seguridad',
    });
    
    // Factor 6: Frecuencia de auditoría
    const diasAudit = params.diasUltimaAuditoria || 999;
    factores.push({
      factor: 'Frecuencia de auto-evaluación',
      peso: 5,
      puntuacion: diasAudit > 90 ? 80 : diasAudit > 30 ? 30 : 5,
      detalles: diasAudit > 365 ? 'Sin auditoría registrada' : `Última auditoría hace ${diasAudit} días`,
      categoria: 'operativo',
    });
    
    // Checklist
    const totalChecklist = this.checklist.length || 1;
    const completados = this.checklist.filter(i => i.completado).length;
    const checklistPorcentaje = Math.round((completados / totalChecklist) * 100);
    
    // Calcular puntuación global ponderada
    const sumaPesos = factores.reduce((s, f) => s + f.peso, 0);
    const puntuacionGlobal = factores.reduce((s, f) => s + (f.puntuacion * f.peso), 0) / sumaPesos;
    
    const nivel = this.calcularNivelCumplimiento(puntuacionGlobal, checklistPorcentaje);
    
    // Recomendaciones
    const recomendaciones: string[] = [];
    if (puntuacionGlobal > 60) recomendaciones.push('Realizar auditoría interna inmediata según protocolo BASC');
    if (params.sellosDiscrepantes > 0) recomendaciones.push('Investigar discrepancias de sellos antes de liberar carga');
    if (checklistPorcentaje < 80) recomendaciones.push(`Completar checklist OEA Pilar 2 (actualmente ${checklistPorcentaje}%)`);
    if (diasAudit > 60) recomendaciones.push('Programar auto-evaluación de seguridad (vencida o próxima a vencer)');
    
    const hashAuditoria = CryptoJS.SHA256(
      `oea:${puntuacionGlobal}:${checklistPorcentaje}:${this.alertasRutaCritica.length}:${Date.now()}`
    ).toString();
    
    return {
      puntuacionGlobal: Math.round(puntuacionGlobal),
      nivel,
      factores,
      alertasActivas: this.alertasRutaCritica.filter(a => !a.resuelta),
      checklistCompletado: checklistPorcentaje,
      recomendaciones,
      hashAuditoria,
    };
  }
  
  /**
   * Obtener métricas OEA
   */
  static obtenerMetricas(): MetricasOEA {
    const checklist = this.checklist.length > 0 ? this.checklist : this.inicializarChecklist();
    const completados = checklist.filter(i => i.completado).length;
    const total = checklist.length || 1;
    
    const pilaresCompletados: Record<number, number> = {};
    for (let p = 1; p <= 5; p++) {
      const items = checklist.filter(i => i.pilar === p);
      const done = items.filter(i => i.completado).length;
      pilaresCompletados[p] = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
    }
    
    const alertasActivas = this.alertasRutaCritica.filter(a => !a.resuelta).length;
    const alertasResueltas = this.alertasRutaCritica.filter(a => a.resuelta).length;
    
    return {
      cumplimientoGeneral: Math.round((completados / total) * 100),
      pilaresCompletados,
      sellosVerificados: this.validacionesSellos.length,
      sellosDiscrepantes: this.validacionesSellos.filter(s => !s.coincide).length,
      alertasActivas,
      alertasResueltas,
      tiempoPromedioResolucion: 0,
      ultimaAuditoria: this.alertasRutaCritica.length > 0 
        ? this.alertasRutaCritica[this.alertasRutaCritica.length - 1].fechaDeteccion 
        : undefined,
    };
  }
  
  /**
   * Obtener alertas de ruta crítica
   */
  static obtenerAlertas(): AlertaRutaCritica[] {
    return [...this.alertasRutaCritica];
  }
  
  /**
   * Calcular nivel de cumplimiento
   */
  private static calcularNivelCumplimiento(puntuacionRiesgo: number, checklistPct: number): NivelCumplimiento {
    if (puntuacionRiesgo <= 20 && checklistPct >= 90) return 'optimo';
    if (puntuacionRiesgo <= 40 && checklistPct >= 70) return 'aceptable';
    if (puntuacionRiesgo <= 60) return 'mejorable';
    if (puntuacionRiesgo <= 80) return 'deficiente';
    return 'critico';
  }
}
