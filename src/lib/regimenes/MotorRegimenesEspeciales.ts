// ============================================
// MOTOR DE REGÍMENES ESPECIALES — CAUCA Cap. VII
// Régimen 20: Admisión Temporal para Perfeccionamiento Activo
// Alertas automáticas a 90, 60, 30 días de vencimiento
// Temporizador de cuenta regresiva para Stella Dashboard
// ============================================

import { supabase } from '@/integrations/supabase/client';
import { devLog, devWarn, devError } from '@/lib/logger';

// ── Types ──

export interface RegimenTemporal {
  id: string;
  embarqueId?: string;
  corredorId: string;
  regimenCodigo: number;
  regimenNombre: string;
  referencia: string;
  consignatario: string;
  descripcionMercancia?: string;
  valorCif: number;
  fechaIngreso: string;
  fechaVencimiento: string;
  estado: 'activo' | 'vencido' | 'reexportado' | 'nacionalizado' | 'en_prorroga';
  alertasEnviadas: AlertaRegimen[];
  reexportacionReferencia?: string;
  notas?: string;
}

export interface AlertaRegimen {
  tipo: 'alerta_90' | 'alerta_60' | 'alerta_30' | 'vencido' | 'critica';
  diasRestantes: number;
  fechaEmision: string;
  mensaje: string;
  stellaMensaje: string;
}

export interface EstadisticasRegimenes {
  totalActivos: number;
  proximos30Dias: number;
  proximos60Dias: number;
  proximos90Dias: number;
  vencidos: number;
  reexportados: number;
  valorCifTotal: number;
}

export interface CuentaRegresiva {
  id: string;
  referencia: string;
  consignatario: string;
  diasTotales: number;
  diasRestantes: number;
  diasTranscurridos: number;
  porcentajeAvance: number;
  fechaVencimiento: string;
  estado: RegimenTemporal['estado'];
  nivelAlerta: 'normal' | 'precaucion' | 'urgente' | 'critico';
  stellaMensaje: string;
}

// ── Constants ──

const REGIMENES_ESPECIALES: Record<number, { nombre: string; plazoMaximoDias: number; fundamentoLegal: string }> = {
  20: {
    nombre: 'Admisión Temporal para Perfeccionamiento Activo',
    plazoMaximoDias: 365,
    fundamentoLegal: 'CAUCA Art. 98, RECAUCA Art. 375-395',
  },
  21: {
    nombre: 'Admisión Temporal con Reexportación en el Mismo Estado',
    plazoMaximoDias: 365,
    fundamentoLegal: 'CAUCA Art. 97, RECAUCA Art. 362-374',
  },
  22: {
    nombre: 'Zona Franca',
    plazoMaximoDias: 1825, // 5 years
    fundamentoLegal: 'Ley 32 de 2011 (Zonas Francas de Panamá)',
  },
  23: {
    nombre: 'Depósito Aduanero',
    plazoMaximoDias: 365,
    fundamentoLegal: 'CAUCA Art. 93, RECAUCA Art. 341-361',
  },
};

const UMBRALES_ALERTA = [90, 60, 30];

// ── Motor de Regímenes ──

export class MotorRegimenesEspeciales {

  /**
   * Registra un nuevo trámite bajo régimen temporal
   */
  static async registrarRegimen(params: {
    embarqueId?: string;
    corredorId: string;
    regimenCodigo: number;
    referencia: string;
    consignatario: string;
    descripcionMercancia?: string;
    valorCif: number;
    fechaIngreso?: string;
    plazoDias?: number;
    notas?: string;
  }): Promise<RegimenTemporal | null> {
    const config = REGIMENES_ESPECIALES[params.regimenCodigo];
    if (!config) {
      devError(`[Regímenes] Código de régimen no reconocido: ${params.regimenCodigo}`);
      return null;
    }

    const fechaIngreso = params.fechaIngreso || new Date().toISOString();
    const plazoDias = params.plazoDias || config.plazoMaximoDias;
    const fechaVencimiento = new Date(new Date(fechaIngreso).getTime() + plazoDias * 86400000).toISOString();

    try {
      const { data, error } = await supabase
        .from('regimenes_temporales')
        .insert({
          embarque_id: params.embarqueId || null,
          corredor_id: params.corredorId,
          regimen_codigo: params.regimenCodigo,
          regimen_nombre: config.nombre,
          referencia: params.referencia,
          consignatario: params.consignatario,
          descripcion_mercancia: params.descripcionMercancia,
          valor_cif: params.valorCif,
          fecha_ingreso: fechaIngreso,
          fecha_vencimiento: fechaVencimiento,
          estado: 'activo',
          alertas_enviadas: [],
          notas: params.notas,
        })
        .select()
        .single();

      if (error) {
        devError('[Regímenes] Error registrando régimen:', error);
        return null;
      }

      devLog(`[Regímenes] Registrado: ${config.nombre} — ${params.referencia} (vence: ${new Date(fechaVencimiento).toLocaleDateString('es-PA')})`);

      return this.mapearDesdeDB(data);
    } catch (e) {
      devError('[Regímenes] Error:', e);
      return null;
    }
  }

  /**
   * Obtiene todos los regímenes activos y calcula cuentas regresivas
   */
  static async obtenerRegimenesActivos(corredorId?: string): Promise<RegimenTemporal[]> {
    try {
      let query = supabase
        .from('regimenes_temporales')
        .select('*')
        .in('estado', ['activo', 'en_prorroga'])
        .order('fecha_vencimiento', { ascending: true });

      if (corredorId) {
        query = query.eq('corredor_id', corredorId);
      }

      const { data, error } = await query;

      if (error) {
        devError('[Regímenes] Error cargando regímenes:', error);
        return [];
      }

      return (data || []).map(r => this.mapearDesdeDB(r));
    } catch (e) {
      devError('[Regímenes] Error:', e);
      return [];
    }
  }

  /**
   * Calcula cuentas regresivas para el Dashboard de Stella
   */
  static calcularCuentasRegresivas(regimenes: RegimenTemporal[]): CuentaRegresiva[] {
    const ahora = Date.now();

    return regimenes.map(r => {
      const inicio = new Date(r.fechaIngreso).getTime();
      const fin = new Date(r.fechaVencimiento).getTime();
      const diasTotales = Math.ceil((fin - inicio) / 86400000);
      const diasRestantes = Math.max(0, Math.ceil((fin - ahora) / 86400000));
      const diasTranscurridos = diasTotales - diasRestantes;
      const porcentajeAvance = diasTotales > 0 ? Math.min(100, Math.round((diasTranscurridos / diasTotales) * 100)) : 100;

      let nivelAlerta: CuentaRegresiva['nivelAlerta'] = 'normal';
      if (diasRestantes <= 0) nivelAlerta = 'critico';
      else if (diasRestantes <= 30) nivelAlerta = 'critico';
      else if (diasRestantes <= 60) nivelAlerta = 'urgente';
      else if (diasRestantes <= 90) nivelAlerta = 'precaucion';

      const stellaMensaje = this.generarMensajeStella(r, diasRestantes);

      return {
        id: r.id,
        referencia: r.referencia,
        consignatario: r.consignatario,
        diasTotales,
        diasRestantes,
        diasTranscurridos,
        porcentajeAvance,
        fechaVencimiento: r.fechaVencimiento,
        estado: r.estado,
        nivelAlerta,
        stellaMensaje,
      };
    });
  }

  /**
   * Verifica todos los regímenes y genera alertas automáticas
   * Debe ejecutarse periódicamente (daily cron o al cargar dashboard)
   */
  static async verificarYGenerarAlertas(corredorId?: string): Promise<AlertaRegimen[]> {
    const regimenes = await this.obtenerRegimenesActivos(corredorId);
    const alertasNuevas: AlertaRegimen[] = [];
    const ahora = Date.now();

    for (const regimen of regimenes) {
      const fin = new Date(regimen.fechaVencimiento).getTime();
      const diasRestantes = Math.ceil((fin - ahora) / 86400000);

      // Verificar si ya venció
      if (diasRestantes <= 0 && regimen.estado === 'activo') {
        await this.actualizarEstado(regimen.id, 'vencido');
        const alerta = this.crearAlerta('vencido', diasRestantes, regimen);
        alertasNuevas.push(alerta);
        await this.registrarAlerta(regimen.id, alerta, regimen.alertasEnviadas);
        continue;
      }

      // Verificar umbrales de alerta
      for (const umbral of UMBRALES_ALERTA) {
        if (diasRestantes <= umbral && diasRestantes > 0) {
          const tipoAlerta = `alerta_${umbral}` as AlertaRegimen['tipo'];
          const yaEnviada = regimen.alertasEnviadas.some(a => a.tipo === tipoAlerta);

          if (!yaEnviada) {
            const alerta = this.crearAlerta(tipoAlerta, diasRestantes, regimen);
            alertasNuevas.push(alerta);
            await this.registrarAlerta(regimen.id, alerta, regimen.alertasEnviadas);
          }
          break; // Solo la alerta más cercana
        }
      }
    }

    if (alertasNuevas.length > 0) {
      devWarn(`[Regímenes] ${alertasNuevas.length} alertas generadas para regímenes temporales`);
    }

    return alertasNuevas;
  }

  /**
   * Obtiene estadísticas de regímenes para el dashboard
   */
  static async obtenerEstadisticas(corredorId?: string): Promise<EstadisticasRegimenes> {
    const regimenes = await this.obtenerRegimenesActivos(corredorId);
    const ahora = Date.now();

    let vencidos = 0;
    let reexportados = 0;
    try {
      const { count: vCount } = await supabase
        .from('regimenes_temporales')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'vencido');
      vencidos = vCount || 0;

      const { count: rCount } = await supabase
        .from('regimenes_temporales')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'reexportado');
      reexportados = rCount || 0;
    } catch (_) { /* fallback to 0 */ }

    let proximos30 = 0, proximos60 = 0, proximos90 = 0, valorCifTotal = 0;

    for (const r of regimenes) {
      const dias = Math.ceil((new Date(r.fechaVencimiento).getTime() - ahora) / 86400000);
      if (dias <= 30) proximos30++;
      if (dias <= 60) proximos60++;
      if (dias <= 90) proximos90++;
      valorCifTotal += r.valorCif;
    }

    return {
      totalActivos: regimenes.length,
      proximos30Dias: proximos30,
      proximos60Dias: proximos60,
      proximos90Dias: proximos90,
      vencidos,
      reexportados,
      valorCifTotal,
    };
  }

  /**
   * Obtener info del régimen por código
   */
  static obtenerInfoRegimen(codigo: number) {
    return REGIMENES_ESPECIALES[codigo] || null;
  }

  /**
   * Actualizar estado de un régimen
   */
  static async actualizarEstado(
    regimenId: string,
    nuevoEstado: RegimenTemporal['estado'],
    reexportacionRef?: string
  ): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = { estado: nuevoEstado };
      if (reexportacionRef) updateData.reexportacion_referencia = reexportacionRef;

      const { error } = await supabase
        .from('regimenes_temporales')
        .update(updateData)
        .eq('id', regimenId);

      if (error) {
        devError('[Regímenes] Error actualizando estado:', error);
        return false;
      }
      return true;
    } catch (e) {
      devError('[Regímenes] Error:', e);
      return false;
    }
  }

  // ── Private helpers ──

  private static crearAlerta(
    tipo: AlertaRegimen['tipo'],
    diasRestantes: number,
    regimen: RegimenTemporal
  ): AlertaRegimen {
    const mensajes: Record<string, string> = {
      alerta_90: `Régimen ${regimen.regimenCodigo} (${regimen.referencia}) vence en ${diasRestantes} días.`,
      alerta_60: `⚠️ URGENTE: Régimen ${regimen.regimenCodigo} (${regimen.referencia}) vence en ${diasRestantes} días. Iniciar gestión de reexportación.`,
      alerta_30: `🔴 CRÍTICO: Régimen ${regimen.regimenCodigo} (${regimen.referencia}) vence en ${diasRestantes} días. Riesgo de infracción CAUCA.`,
      vencido: `⛔ VENCIDO: Régimen ${regimen.regimenCodigo} (${regimen.referencia}) ha excedido el plazo legal. Sanciones aplicables.`,
      critica: `⛔ Alerta crítica para régimen ${regimen.referencia}.`,
    };

    const stellaMensajes: Record<string, string> = {
      alerta_90: `Jefe, le recuerdo que el régimen temporal ${regimen.referencia} de ${regimen.consignatario} vence en ${diasRestantes} días. CAUCA Art. 98 establece la obligación de reexportar antes del vencimiento.`,
      alerta_60: `Jefe, urgente: Quedan ${diasRestantes} días para el régimen temporal ${regimen.referencia}. Recomiendo iniciar los trámites de reexportación o solicitud de prórroga ante la ANA. RECAUCA Art. 390.`,
      alerta_30: `⚠️ Jefe, situación crítica: Solo quedan ${diasRestantes} días para el vencimiento del régimen ${regimen.referencia} (${regimen.consignatario}). Si no se reexporta o nacionaliza, se aplicarán sanciones según CAUCA Art. 102 y multas según Art. 614 del Código Fiscal.`,
      vencido: `⛔ Jefe, el régimen temporal ${regimen.referencia} de ${regimen.consignatario} ha VENCIDO. Zod ha bloqueado operaciones relacionadas. Se requiere acción inmediata: nacionalización forzosa o gestión de multa ante la ANA.`,
      critica: `⛔ Alerta crítica para ${regimen.referencia}.`,
    };

    return {
      tipo,
      diasRestantes,
      fechaEmision: new Date().toISOString(),
      mensaje: mensajes[tipo] || mensajes.critica,
      stellaMensaje: stellaMensajes[tipo] || stellaMensajes.critica,
    };
  }

  private static async registrarAlerta(
    regimenId: string,
    alerta: AlertaRegimen,
    alertasPrevias: AlertaRegimen[]
  ): Promise<void> {
    try {
      const nuevasAlertas = [...alertasPrevias, alerta];
      await supabase
        .from('regimenes_temporales')
        .update({ alertas_enviadas: JSON.parse(JSON.stringify(nuevasAlertas)) })
        .eq('id', regimenId);
    } catch (e) {
      devWarn('[Regímenes] Error registrando alerta:', e);
    }
  }

  private static generarMensajeStella(regimen: RegimenTemporal, diasRestantes: number): string {
    if (diasRestantes <= 0) {
      return `⛔ VENCIDO — ${regimen.referencia}: Plazo legal excedido. Acción inmediata requerida.`;
    }
    if (diasRestantes <= 30) {
      return `🔴 ${regimen.referencia}: ${diasRestantes}d restantes — Riesgo de sanción CAUCA Art. 102`;
    }
    if (diasRestantes <= 60) {
      return `🟠 ${regimen.referencia}: ${diasRestantes}d restantes — Iniciar gestión de cierre`;
    }
    if (diasRestantes <= 90) {
      return `🟡 ${regimen.referencia}: ${diasRestantes}d restantes — Monitoreo preventivo`;
    }
    return `🟢 ${regimen.referencia}: ${diasRestantes}d restantes — En plazo`;
  }

  private static mapearDesdeDB(data: Record<string, unknown>): RegimenTemporal {
    return {
      id: data.id as string,
      embarqueId: data.embarque_id as string | undefined,
      corredorId: data.corredor_id as string,
      regimenCodigo: data.regimen_codigo as number,
      regimenNombre: data.regimen_nombre as string,
      referencia: data.referencia as string,
      consignatario: data.consignatario as string,
      descripcionMercancia: data.descripcion_mercancia as string | undefined,
      valorCif: Number(data.valor_cif) || 0,
      fechaIngreso: data.fecha_ingreso as string,
      fechaVencimiento: data.fecha_vencimiento as string,
      estado: data.estado as RegimenTemporal['estado'],
      alertasEnviadas: (data.alertas_enviadas as AlertaRegimen[]) || [],
      reexportacionReferencia: data.reexportacion_referencia as string | undefined,
      notas: data.notas as string | undefined,
    };
  }
}
