// ============================================
// GESTOR DE AUDITORÍA
// Registra todos los cambios en liquidaciones
// ============================================

import { Liquidacion } from '@/types/aduanas';

/**
 * Registro de auditoría
 */
export interface RegistroAuditoria {
  id: string;
  liquidacionId: string;
  numeroGuia: string;
  timestamp: string;
  operador: string;
  accion: 'creacion' | 'modificacion' | 'aprobacion' | 'anulacion';
  cambios: {
    campo: string;
    valorAnterior: unknown;
    valorNuevo: unknown;
  }[];
  justificacion?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Almacenamiento en memoria (en producción usar IndexedDB)
const registros: RegistroAuditoria[] = [];

/**
 * Generar ID único
 */
function generarId(): string {
  return `aud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Gestor de auditoría para liquidaciones
 */
export class GestorAuditoria {
  
  /**
   * Registra creación de liquidación
   */
  static async registrarCreacion(
    liquidacion: Liquidacion,
    operador: string = 'sistema'
  ): Promise<void> {
    const registro: RegistroAuditoria = {
      id: generarId(),
      liquidacionId: liquidacion.id,
      numeroGuia: liquidacion.numeroGuia,
      timestamp: new Date().toISOString(),
      operador,
      accion: 'creacion',
      cambios: [],
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    };
    
    registros.push(registro);
    
    console.log('Auditoría: Creación registrada', {
      liquidacionId: liquidacion.id,
      numeroGuia: liquidacion.numeroGuia,
      operador
    });
  }
  
  /**
   * Registra modificación de liquidación
   */
  static async registrarModificacion(
    liquidacionAnterior: Liquidacion,
    liquidacionNueva: Liquidacion,
    operador: string,
    justificacion?: string
  ): Promise<void> {
    const cambios = this.detectarCambios(liquidacionAnterior, liquidacionNueva);
    
    if (cambios.length === 0) {
      console.debug('Auditoría: No se detectaron cambios');
      return;
    }
    
    const registro: RegistroAuditoria = {
      id: generarId(),
      liquidacionId: liquidacionNueva.id,
      numeroGuia: liquidacionNueva.numeroGuia,
      timestamp: new Date().toISOString(),
      operador,
      accion: 'modificacion',
      cambios,
      justificacion,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    };
    
    registros.push(registro);
    
    console.log('Auditoría: Modificación registrada', {
      liquidacionId: liquidacionNueva.id,
      camposModificados: cambios.map(c => c.campo)
    });
  }
  
  /**
   * Registra aprobación de liquidación
   */
  static async registrarAprobacion(
    liquidacion: Liquidacion,
    operador: string,
    justificacion?: string
  ): Promise<void> {
    const registro: RegistroAuditoria = {
      id: generarId(),
      liquidacionId: liquidacion.id,
      numeroGuia: liquidacion.numeroGuia,
      timestamp: new Date().toISOString(),
      operador,
      accion: 'aprobacion',
      cambios: [
        {
          campo: 'estado',
          valorAnterior: 'calculada',
          valorNuevo: 'aprobada'
        }
      ],
      justificacion,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    };
    
    registros.push(registro);
    
    console.log('Auditoría: Aprobación registrada', {
      liquidacionId: liquidacion.id,
      operador
    });
  }
  
  /**
   * Obtiene historial completo de una liquidación
   */
  static async obtenerHistorial(liquidacionId: string): Promise<RegistroAuditoria[]> {
    return registros
      .filter(r => r.liquidacionId === liquidacionId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
  
  /**
   * Obtiene cambios recientes de un operador
   */
  static async obtenerCambiosOperador(
    operador: string,
    limite: number = 50
  ): Promise<RegistroAuditoria[]> {
    return registros
      .filter(r => r.operador === operador)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limite);
  }
  
  /**
   * Detecta diferencias entre dos liquidaciones
   */
  private static detectarCambios(
    anterior: Liquidacion,
    nueva: Liquidacion
  ): { campo: string; valorAnterior: unknown; valorNuevo: unknown }[] {
    const cambios: { campo: string; valorAnterior: unknown; valorNuevo: unknown }[] = [];
    
    const camposCriticos: (keyof Liquidacion)[] = [
      'hsCode',
      'valorCIF',
      'percentDAI',
      'percentISC',
      'percentITBMS',
      'montoDAI',
      'montoISC',
      'montoITBMS',
      'totalTributos',
      'totalAPagar',
      'estado'
    ];
    
    for (const campo of camposCriticos) {
      const valorAnterior = anterior[campo];
      const valorNuevo = nueva[campo];
      
      if (valorAnterior !== valorNuevo) {
        cambios.push({
          campo,
          valorAnterior,
          valorNuevo
        });
      }
    }
    
    return cambios;
  }
  
  /**
   * Obtiene todos los registros (para exportación)
   */
  static obtenerTodosRegistros(): RegistroAuditoria[] {
    return [...registros];
  }
  
  /**
   * Limpia registros antiguos (más de 90 días)
   */
  static limpiarRegistrosAntiguos(): number {
    const limiteMs = 90 * 24 * 60 * 60 * 1000;
    const ahora = Date.now();
    const inicial = registros.length;
    
    const registrosRecientes = registros.filter(
      r => ahora - new Date(r.timestamp).getTime() < limiteMs
    );
    
    registros.length = 0;
    registros.push(...registrosRecientes);
    
    return inicial - registros.length;
  }
}
