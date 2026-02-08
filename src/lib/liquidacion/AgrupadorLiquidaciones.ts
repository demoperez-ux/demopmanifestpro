/**
 * AGRUPADOR DE LIQUIDACIONES — Courier Alto Volumen
 * 
 * Consolida múltiples guías de bajo valor (Categoría B/C) en una sola
 * declaración simplificada, optimizando tasas administrativas según
 * el régimen courier de Panamá (Decreto Ejecutivo 41-2002 y Res. ANA 049-2025).
 * 
 * POLÍTICA:
 * - Solo agrupa paquetes del mismo consignatario (RUC/cédula)
 * - Solo Categoría B (≤$100 CIF) y C ($100-$2000) son agrupables
 * - Si el total agrupado supera $2,000 CIF → escala a Categoría D (requiere corredor)
 * - Carga sensible (MINSA/MIDA/AUPSA) NUNCA se agrupa → se separa automáticamente
 */

import { ManifestRow } from '@/types/manifest';
import { Liquidacion, CategoriaAduanera } from '@/types/aduanas';
import { ConfigService } from '@/lib/config/ConfigService';
import { ControlMultiAgencia } from '@/lib/compliance/ControlMultiAgencia';
import { devLog, devWarn } from '@/lib/logger';

// ─── Tipos ──────────────────────────────────────────────

export interface GrupoLiquidacion {
  id: string;
  tipo: 'simplificada' | 'individual' | 'sensible';
  consignatarioId: string;
  consignatarioNombre: string;
  paquetes: ManifestRow[];
  totalCIF: number;
  totalPaquetes: number;
  categoriaResultante: CategoriaAduanera;
  tasaAdministrativaOriginal: number;
  tasaAdministrativaOptimizada: number;
  ahorro: number;
  requierePermisos: boolean;
  agenciasInvolucradas: string[];
  observaciones: string[];
  fundamentoLegal: string;
}

export interface ResultadoAgrupacion {
  grupos: GrupoLiquidacion[];
  resumen: ResumenAgrupacion;
  alertas: AlertaAgrupacion[];
}

export interface ResumenAgrupacion {
  totalPaquetesOriginales: number;
  totalDeclaracionesResultantes: number;
  declaracionesSimplificadas: number;
  declaracionesIndividuales: number;
  declaracionesSensibles: number;
  tasasTotalesOriginales: number;
  tasasTotalesOptimizadas: number;
  ahorroTotal: number;
  porcentajeAhorro: number;
}

export interface AlertaAgrupacion {
  tipo: 'info' | 'warning' | 'error';
  mensaje: string;
  fundamentoLegal?: string;
}

// ─── Constantes ─────────────────────────────────────────

const TASA_SISTEMA_POR_DECLARACION = 3.00; // B/. 3.00 por cada declaración

// ─── AgrupadorLiquidaciones ─────────────────────────────

export class AgrupadorLiquidaciones {

  /**
   * Agrupa paquetes de un manifiesto en declaraciones optimizadas.
   * Separa automáticamente carga sensible del flujo general.
   */
  static agrupar(
    paquetes: ManifestRow[],
    opciones: {
      maxPorGrupo?: number;
      forzarIndividual?: boolean;
    } = {}
  ): ResultadoAgrupacion {
    const maxPorGrupo = opciones.maxPorGrupo || 50;
    const alertas: AlertaAgrupacion[] = [];
    const grupos: GrupoLiquidacion[] = [];

    // 1. Clasificar cada paquete: sensible vs. general
    const sensibles: ManifestRow[] = [];
    const generales: ManifestRow[] = [];

    for (const paquete of paquetes) {
      const evaluacion = ControlMultiAgencia.evaluarCumplimiento({
        descripcion: paquete.description,
        hsCode: paquete.hsCode || '',
        valorUSD: paquete.valueUSD,
        pesoKg: paquete.weight ? paquete.weight * 0.4536 : undefined, // lb → kg
      });

      if (evaluacion.agenciasInvolucradas.length > 0) {
        sensibles.push(paquete);
      } else {
        generales.push(paquete);
      }
    }

    devLog(`[Agrupador] Total: ${paquetes.length}, Sensibles: ${sensibles.length}, Generales: ${generales.length}`);

    // 2. Separar carga sensible en declaraciones individuales
    for (const paq of sensibles) {
      const evaluacion = ControlMultiAgencia.evaluarCumplimiento({
        descripcion: paq.description,
        hsCode: paq.hsCode || '',
        valorUSD: paq.valueUSD,
      });

      const cifEstimado = this.estimarCIF(paq.valueUSD);
      const cat = ConfigService.clasificarPorValor(cifEstimado);

      grupos.push({
        id: crypto.randomUUID(),
        tipo: 'sensible',
        consignatarioId: paq.identification || paq.consigneeId || paq.recipient,
        consignatarioNombre: paq.recipient,
        paquetes: [paq],
        totalCIF: cifEstimado,
        totalPaquetes: 1,
        categoriaResultante: cat,
        tasaAdministrativaOriginal: TASA_SISTEMA_POR_DECLARACION,
        tasaAdministrativaOptimizada: TASA_SISTEMA_POR_DECLARACION,
        ahorro: 0,
        requierePermisos: true,
        agenciasInvolucradas: evaluacion.agenciasInvolucradas,
        observaciones: [
          `Carga sensible — requiere permisos: ${evaluacion.agenciasInvolucradas.join(', ')}`,
          ...evaluacion.advertencias,
        ],
        fundamentoLegal: 'Res. ANA 049-2025 Art. 15 — Mercancía sensible: declaración individual obligatoria',
      });
    }

    if (sensibles.length > 0) {
      alertas.push({
        tipo: 'warning',
        mensaje: `${sensibles.length} paquete(s) con carga sensible separados del flujo de agrupación`,
        fundamentoLegal: 'Decreto Ejecutivo 41-2002 Art. 8 — Mercancías restringidas',
      });
    }

    // 3. Agrupar generales por consignatario
    if (!opciones.forzarIndividual) {
      const porConsignatario = new Map<string, ManifestRow[]>();

      for (const paq of generales) {
        const clave = (paq.identification || paq.normalizedRecipient || paq.recipient || 'SIN_ID').toLowerCase().trim();
        if (!porConsignatario.has(clave)) {
          porConsignatario.set(clave, []);
        }
        porConsignatario.get(clave)!.push(paq);
      }

      for (const [consigId, paqsConsig] of porConsignatario) {
        // Subdividir en chunks de maxPorGrupo
        for (let i = 0; i < paqsConsig.length; i += maxPorGrupo) {
          const chunk = paqsConsig.slice(i, i + maxPorGrupo);
          const totalCIF = chunk.reduce((sum, p) => sum + this.estimarCIF(p.valueUSD), 0);
          const catResultante = ConfigService.clasificarPorValor(totalCIF);
          
          const tasaOriginal = chunk.length * TASA_SISTEMA_POR_DECLARACION;
          const tasaOptimizada = TASA_SISTEMA_POR_DECLARACION; // Una sola declaración
          const ahorro = tasaOriginal - tasaOptimizada;

          const observaciones: string[] = [];

          // Si el total agrupado escala a Cat D
          if (catResultante === 'D') {
            observaciones.push(
              `⚠️ Total agrupado ($${totalCIF.toFixed(2)}) excede $2,000 CIF — Escala a Categoría D (requiere corredor)`
            );
            alertas.push({
              tipo: 'warning',
              mensaje: `Grupo de ${consigId}: Total $${totalCIF.toFixed(2)} escala a Cat. D`,
              fundamentoLegal: 'CAUCA Art. 100 — Corredor obligatorio > $2,000',
            });
          }

          // Solo agrupar si hay beneficio (más de 1 paquete)
          const esAgrupable = chunk.length > 1;

          grupos.push({
            id: crypto.randomUUID(),
            tipo: esAgrupable ? 'simplificada' : 'individual',
            consignatarioId: consigId,
            consignatarioNombre: chunk[0].recipient,
            paquetes: chunk,
            totalCIF,
            totalPaquetes: chunk.length,
            categoriaResultante: catResultante,
            tasaAdministrativaOriginal: tasaOriginal,
            tasaAdministrativaOptimizada: tasaOptimizada,
            ahorro: esAgrupable ? ahorro : 0,
            requierePermisos: false,
            agenciasInvolucradas: [],
            observaciones,
            fundamentoLegal: esAgrupable
              ? 'Res. ANA 049-2025 Art. 12 — Declaración simplificada courier'
              : 'Decreto Ejecutivo 41-2002 — Declaración individual',
          });
        }
      }
    } else {
      // Modo individual forzado
      for (const paq of generales) {
        const cifEstimado = this.estimarCIF(paq.valueUSD);
        const cat = ConfigService.clasificarPorValor(cifEstimado);
        
        grupos.push({
          id: crypto.randomUUID(),
          tipo: 'individual',
          consignatarioId: paq.identification || paq.recipient,
          consignatarioNombre: paq.recipient,
          paquetes: [paq],
          totalCIF: cifEstimado,
          totalPaquetes: 1,
          categoriaResultante: cat,
          tasaAdministrativaOriginal: TASA_SISTEMA_POR_DECLARACION,
          tasaAdministrativaOptimizada: TASA_SISTEMA_POR_DECLARACION,
          ahorro: 0,
          requierePermisos: false,
          agenciasInvolucradas: [],
          observaciones: [],
          fundamentoLegal: 'Decreto Ejecutivo 41-2002 — Declaración individual',
        });
      }
    }

    // 4. Calcular resumen
    const tasasTotalesOriginales = grupos.reduce((s, g) => s + g.tasaAdministrativaOriginal, 0);
    const tasasTotalesOptimizadas = grupos.reduce((s, g) => s + g.tasaAdministrativaOptimizada, 0);
    const ahorroTotal = tasasTotalesOriginales - tasasTotalesOptimizadas;

    const resumen: ResumenAgrupacion = {
      totalPaquetesOriginales: paquetes.length,
      totalDeclaracionesResultantes: grupos.length,
      declaracionesSimplificadas: grupos.filter(g => g.tipo === 'simplificada').length,
      declaracionesIndividuales: grupos.filter(g => g.tipo === 'individual').length,
      declaracionesSensibles: grupos.filter(g => g.tipo === 'sensible').length,
      tasasTotalesOriginales,
      tasasTotalesOptimizadas,
      ahorroTotal,
      porcentajeAhorro: tasasTotalesOriginales > 0 
        ? Math.round((ahorroTotal / tasasTotalesOriginales) * 100) 
        : 0,
    };

    if (ahorroTotal > 0) {
      alertas.push({
        tipo: 'info',
        mensaje: `Ahorro estimado en tasas: B/. ${ahorroTotal.toFixed(2)} (${resumen.porcentajeAhorro}%) al consolidar ${resumen.declaracionesSimplificadas} declaraciones`,
      });
    }

    devLog(`[Agrupador] Resultado: ${grupos.length} grupos, ahorro B/. ${ahorroTotal.toFixed(2)}`);

    return { grupos, resumen, alertas };
  }

  /**
   * Estima el valor CIF a partir del FOB.
   * CIF = FOB + Flete (7%) + Seguro (1%)
   */
  private static estimarCIF(valorFOB: number): number {
    const flete = valorFOB * 0.07;
    const seguro = valorFOB * 0.01;
    return Math.round((valorFOB + flete + seguro) * 100) / 100;
  }
}

export default AgrupadorLiquidaciones;
