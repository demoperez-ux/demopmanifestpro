/**
 * ALERTA DE CARGA SENSIBLE — Stella Dashboard Intelligence
 * 
 * Motor de priorización para artículos que requieren permisos
 * no arancelarios (Salud, Agricultura, Precursores).
 * Genera items prioritarios para el dashboard de Stella separándolos
 * del flujo de "mercancía general".
 * 
 * Integra: ControlMultiAgencia + DocumentSniffer + Stella Inbox
 * Fundamento: RECAUCA Art. 321 — Mercancías con Restricciones No Arancelarias
 */

import { ManifestRow } from '@/types/manifest';
import { ControlMultiAgencia, type AgenciaReguladora, type ResultadoControlMultiAgencia } from '@/lib/compliance/ControlMultiAgencia';
import { devLog } from '@/lib/logger';

// ─── Tipos ──────────────────────────────────────────────

export type PrioridadSensible = 'critica' | 'alta' | 'media';

export interface AlertaCargaSensibleItem {
  id: string;
  paquete: ManifestRow;
  prioridad: PrioridadSensible;
  agencias: AgenciaReguladora[];
  permisosFaltantes: string[];
  bloqueos: string[];
  stellaNota: string;
  fundamentoLegal: string;
  etaAccion: string;
  evaluacion: ResultadoControlMultiAgencia;
}

export interface ResumenCargaSensible {
  totalPaquetes: number;
  totalSensibles: number;
  totalGenerales: number;
  porPrioridad: { critica: number; alta: number; media: number };
  porAgencia: Record<string, number>;
  bloqueosActivos: number;
  requiereAccionInmediata: boolean;
}

export interface ResultadoCargaSensible {
  alertas: AlertaCargaSensibleItem[];
  generales: ManifestRow[];
  resumen: ResumenCargaSensible;
}

// ─── Notas de Stella por agencia ────────────────────────

const STELLA_NOTAS: Record<string, (paquete: ManifestRow) => string> = {
  CONAPRED: (p) =>
    `Jefe, el paquete "${p.trackingNumber}" contiene sustancias controladas (${p.description.substring(0, 40)}...). CONAPRED exige Licencia de Operación antes del levante. Sin ella, la ANA retendrá la mercancía.`,
  MINSA: (p) =>
    `Producto farmacéutico detectado en guía "${p.trackingNumber}". Sin registro sanitario MINSA-DNFD vigente, no se puede procesar el levante. Te sugiero contactar al importador de inmediato.`,
  MIDA: (p) =>
    `Carga fitosanitaria en guía "${p.trackingNumber}". El MIDA requiere certificado del país de origen para inspección. Coordina con el shipper antes del arribo.`,
  AUPSA: (p) =>
    `Producto de origen animal en "${p.trackingNumber}". AUPSA exige certificado zoosanitario. Revisa cadena de frío si aplica.`,
  APA: (p) =>
    `Alimento procesado detectado en "${p.trackingNumber}". Verifica registro APA y etiquetado nutricional antes de la liquidación.`,
};

const FUNDAMENTOS_LEGALES: Record<string, string> = {
  CONAPRED: 'Ley 48 de 2003 Art. 8 — Control de Precursores Químicos',
  MINSA: 'Ley 1 de 2001 Art. 106 — Registro Sanitario Obligatorio',
  MIDA: 'Decreto Ejecutivo 121 de 1999 — Certificación Fitosanitaria',
  AUPSA: 'Decreto Ley 11 de 2006 — Seguridad de Alimentos',
  APA: 'Ley 150 de 2020 — Registro de Alimentos Procesados',
};

// ─── AlertaCargaSensible Engine ─────────────────────────

export class AlertaCargaSensible {

  /**
   * Analiza un lote de paquetes y separa carga sensible del flujo general.
   * Genera alertas priorizadas para el dashboard de Stella.
   */
  static analizar(paquetes: ManifestRow[]): ResultadoCargaSensible {
    const alertas: AlertaCargaSensibleItem[] = [];
    const generales: ManifestRow[] = [];
    const conteoAgencias = new Map<string, number>();

    for (const paquete of paquetes) {
      const evaluacion = ControlMultiAgencia.evaluarCumplimiento({
        descripcion: paquete.description,
        hsCode: paquete.hsCode || '',
        valorUSD: paquete.valueUSD,
        pesoKg: paquete.weight ? paquete.weight * 0.4536 : undefined,
      });

      if (evaluacion.agenciasInvolucradas.length === 0) {
        generales.push(paquete);
        continue;
      }

      // Determinar prioridad
      const prioridad = this.calcularPrioridad(evaluacion);

      // Generar nota de Stella usando la primera agencia
      const agenciaPrincipal = evaluacion.agenciasInvolucradas[0];
      const notaFn = STELLA_NOTAS[agenciaPrincipal] || STELLA_NOTAS.APA;
      const stellaNota = notaFn!(paquete);

      const fundamentoLegal = evaluacion.agenciasInvolucradas
        .map(ag => FUNDAMENTOS_LEGALES[ag] || `${ag} — Verificar normativa`)
        .join(' | ');

      // Conteo por agencia
      for (const ag of evaluacion.agenciasInvolucradas) {
        conteoAgencias.set(ag, (conteoAgencias.get(ag) || 0) + 1);
      }

      alertas.push({
        id: crypto.randomUUID(),
        paquete,
        prioridad,
        agencias: evaluacion.agenciasInvolucradas,
        permisosFaltantes: evaluacion.documentosFaltantes,
        bloqueos: evaluacion.bloqueos.map(b => b.razon),
        stellaNota,
        fundamentoLegal,
        etaAccion: this.calcularEtaAccion(prioridad),
        evaluacion,
      });
    }

    // Ordenar por prioridad: critica → alta → media
    const ordenPrioridad: Record<PrioridadSensible, number> = { critica: 0, alta: 1, media: 2 };
    alertas.sort((a, b) => ordenPrioridad[a.prioridad] - ordenPrioridad[b.prioridad]);

    const porPrioridad = {
      critica: alertas.filter(a => a.prioridad === 'critica').length,
      alta: alertas.filter(a => a.prioridad === 'alta').length,
      media: alertas.filter(a => a.prioridad === 'media').length,
    };

    const porAgencia: Record<string, number> = {};
    for (const [ag, count] of conteoAgencias) {
      porAgencia[ag] = count;
    }

    const bloqueosActivos = alertas.filter(a => a.bloqueos.length > 0).length;

    devLog(`[AlertaCargaSensible] ${alertas.length} sensibles (${porPrioridad.critica} críticos), ${generales.length} generales`);

    return {
      alertas,
      generales,
      resumen: {
        totalPaquetes: paquetes.length,
        totalSensibles: alertas.length,
        totalGenerales: generales.length,
        porPrioridad,
        porAgencia,
        bloqueosActivos,
        requiereAccionInmediata: porPrioridad.critica > 0,
      },
    };
  }

  /**
   * Calcula prioridad según bloqueos y tipo de agencia.
   */
  private static calcularPrioridad(evaluacion: ResultadoControlMultiAgencia): PrioridadSensible {
    // Critica: hay bloqueos obligatorios (CONAPRED, MINSA)
    if (evaluacion.bloqueos.some(b => b.tipoBloqueo === 'obligatorio')) {
      return 'critica';
    }
    // Alta: hay documentos faltantes
    if (evaluacion.documentosFaltantes.length > 0) {
      return 'alta';
    }
    // Media: solo advertencias
    return 'media';
  }

  /**
   * Genera texto de acción requerida según prioridad.
   */
  private static calcularEtaAccion(prioridad: PrioridadSensible): string {
    switch (prioridad) {
      case 'critica':
        return 'Acción inmediata — Bloqueo de liquidación activo';
      case 'alta':
        return 'Antes del levante — Documentos pendientes';
      case 'media':
        return 'Verificar antes de transmisión SIGA';
    }
  }

  /**
   * Genera ítems para el cuadrante "Regulatory Urgencies" de Stella's Inbox.
   */
  static generarItemsStellaInbox(alertas: AlertaCargaSensibleItem[]): Array<{
    referencia: string;
    consignatario: string;
    descripcion: string;
    agencia: string;
    permisoRequerido: string;
    stellaNota: string;
    baseLegal: string;
    prioridad: PrioridadSensible;
  }> {
    return alertas.map(alerta => ({
      referencia: alerta.paquete.trackingNumber,
      consignatario: alerta.paquete.recipient,
      descripcion: `${alerta.agencias.join('/')} — ${alerta.paquete.description.substring(0, 60)}`,
      agencia: alerta.agencias[0],
      permisoRequerido: alerta.permisosFaltantes[0] || 'Verificación requerida',
      stellaNota: alerta.stellaNota,
      baseLegal: alerta.fundamentoLegal,
      prioridad: alerta.prioridad,
    }));
  }
}

export default AlertaCargaSensible;
