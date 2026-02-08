// ============================================
// SANCTION RISK MONITOR — Pre-Payment Audit
// Motor de Calificación de Riesgo de Sanción
// Score > 50 → Zod Hard Stop (bloqueo de transmisión)
// Override solo por Corredor Senior con firma digital
// ============================================

import CryptoJS from 'crypto-js';
import { devLog, devWarn } from '@/lib/logger';

// ── Types ──

export interface SanctionInput {
  referencia: string;
  /** Discrepancias de peso/bultos entre documentos */
  discrepanciaPeso?: {
    pesoBL: number;
    pesoFactura: number;
    pesoManifiesto?: number;
    diferenciaKg: number;
  };
  discrepanciaBultos?: {
    bultosBL: number;
    bultosFactura: number;
    diferenciaUnidades: number;
  };
  /** Documentos obligatorios faltantes (detectados vía LEXIS) */
  documentosFaltantes?: DocumentoFaltante[];
  /** Precio unitario fuera de rango histórico */
  alertasSubvaluacion?: AlertaPrecio[];
  /** Metadata adicional */
  consignatario?: string;
  valorCIF?: number;
  paisOrigen?: string;
}

export interface DocumentoFaltante {
  tipo: string;
  label: string;
  obligatorio: boolean;
  fundamentoLegal?: string;
}

export interface AlertaPrecio {
  descripcion: string;
  precioDeclarado: number;
  precioReferenciaMin: number;
  precioReferenciaMax: number;
  diferenciaPorcentaje: number;
}

export interface HallazgoStella {
  id: string;
  categoria: 'peso' | 'documento' | 'precio' | 'cumplimiento';
  puntos: number;
  severidad: 'critica' | 'alta' | 'media' | 'baja';
  titulo: string;
  detalle: string;
  stellaMensaje: string;
  fundamentoLegal?: string;
}

export interface SanctionScore {
  referencia: string;
  scoreTotal: number;
  maxScore: number;
  hallazgos: HallazgoStella[];
  /** Score > 50 = Hard Stop */
  zodHardStop: boolean;
  zodMensaje: string;
  stellaVeredicto: string;
  nivelRiesgo: 'bajo' | 'moderado' | 'alto' | 'critico';
  overridePermitido: boolean;
  overrideAplicado: boolean;
  overridePor?: string;
  overrideFirmaHash?: string;
  hashAuditoria: string;
  timestamp: string;
}

// ── Scoring Constants ──

const PUNTOS = {
  DISCREPANCIA_PESO: 40,
  DISCREPANCIA_BULTOS: 40,
  DOCUMENTO_FALTANTE: 60,
  PRECIO_FUERA_RANGO: 30,
} as const;

const UMBRAL_HARD_STOP = 50;

// ── Engine ──

export class SanctionScoreEngine {

  /**
   * Calcula el puntaje de riesgo de sanción pre-pago
   */
  static calculateSanctionScore(input: SanctionInput): SanctionScore {
    devLog(`[SanctionScore] Calculando score para: ${input.referencia}`);

    const hallazgos: HallazgoStella[] = [];
    let scoreTotal = 0;

    // ── 1. Discrepancia en pesos (+40 pts) ──
    if (input.discrepanciaPeso) {
      const { pesoBL, pesoFactura, diferenciaKg } = input.discrepanciaPeso;
      const porcentaje = Math.max(pesoBL, pesoFactura) > 0
        ? (diferenciaKg / Math.max(pesoBL, pesoFactura)) * 100
        : 0;

      if (diferenciaKg > 0.5 || porcentaje > 1) {
        scoreTotal += PUNTOS.DISCREPANCIA_PESO;
        hallazgos.push({
          id: `peso-${Date.now()}`,
          categoria: 'peso',
          puntos: PUNTOS.DISCREPANCIA_PESO,
          severidad: porcentaje > 5 ? 'critica' : 'alta',
          titulo: 'Discrepancia de Peso Bruto',
          detalle: `BL: ${pesoBL.toFixed(2)} kg | Factura: ${pesoFactura.toFixed(2)} kg | Diferencia: ${diferenciaKg.toFixed(2)} kg (${porcentaje.toFixed(1)}%)`,
          stellaMensaje: `Stella: El peso bruto en el BL no coincide con la Factura por ${diferenciaKg.toFixed(2)} kg (${porcentaje.toFixed(1)}%). RECAUCA Art. 321 inc. b) establece sanción por inexactitud.`,
          fundamentoLegal: 'RECAUCA Art. 321 inc. b): Diferencia en peso declarado',
        });
      }
    }

    // ── 2. Discrepancia en bultos (+40 pts) ──
    if (input.discrepanciaBultos) {
      const { bultosBL, bultosFactura, diferenciaUnidades } = input.discrepanciaBultos;

      if (diferenciaUnidades >= 1) {
        scoreTotal += PUNTOS.DISCREPANCIA_BULTOS;
        hallazgos.push({
          id: `bultos-${Date.now()}`,
          categoria: 'peso',
          puntos: PUNTOS.DISCREPANCIA_BULTOS,
          severidad: diferenciaUnidades > 3 ? 'critica' : 'alta',
          titulo: 'Discrepancia en Cantidad de Bultos',
          detalle: `BL: ${bultosBL} bultos | Factura: ${bultosFactura} bultos | Diferencia: ${diferenciaUnidades} unidades`,
          stellaMensaje: `Stella: La cantidad de bultos difiere entre el BL (${bultosBL}) y la Factura (${bultosFactura}). Diferencia de ${diferenciaUnidades} unidad(es). Verificar antes de pago.`,
          fundamentoLegal: 'RECAUCA Art. 321 inc. a): Diferencia en cantidad de bultos',
        });
      }
    }

    // ── 3. Documentos obligatorios faltantes vía LEXIS (+60 pts c/u) ──
    if (input.documentosFaltantes && input.documentosFaltantes.length > 0) {
      for (const doc of input.documentosFaltantes) {
        if (doc.obligatorio) {
          scoreTotal += PUNTOS.DOCUMENTO_FALTANTE;
          hallazgos.push({
            id: `doc-${doc.tipo}-${Date.now()}`,
            categoria: 'documento',
            puntos: PUNTOS.DOCUMENTO_FALTANTE,
            severidad: 'critica',
            titulo: `Documento Faltante: ${doc.label}`,
            detalle: `El documento "${doc.label}" es obligatorio para este trámite y no fue detectado por LEXIS.`,
            stellaMensaje: `Stella: Falta el documento obligatorio "${doc.label}". Sin este documento, la transmisión a SIGA será rechazada. ${doc.fundamentoLegal || ''}`,
            fundamentoLegal: doc.fundamentoLegal || 'CAUCA Art. 60: Documentos soporte de la declaración',
          });
        }
      }
    }

    // ── 4. Precio unitario fuera de rango histórico (+30 pts c/u) ──
    if (input.alertasSubvaluacion && input.alertasSubvaluacion.length > 0) {
      for (const alerta of input.alertasSubvaluacion) {
        scoreTotal += PUNTOS.PRECIO_FUERA_RANGO;
        hallazgos.push({
          id: `precio-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          categoria: 'precio',
          puntos: PUNTOS.PRECIO_FUERA_RANGO,
          severidad: alerta.diferenciaPorcentaje > 50 ? 'critica' : 'media',
          titulo: 'Precio Fuera de Rango Histórico',
          detalle: `"${alerta.descripcion}": Declarado $${alerta.precioDeclarado.toFixed(2)} | Rango: $${alerta.precioReferenciaMin.toFixed(2)} - $${alerta.precioReferenciaMax.toFixed(2)} (${alerta.diferenciaPorcentaje.toFixed(0)}% inferior)`,
          stellaMensaje: `Stella: "${alerta.descripcion}" declarado a $${alerta.precioDeclarado.toFixed(2)} está ${alerta.diferenciaPorcentaje.toFixed(0)}% por debajo del rango de referencia ($${alerta.precioReferenciaMin.toFixed(2)}-$${alerta.precioReferenciaMax.toFixed(2)}). Posible subvaluación, Art. 1 Acuerdo OMC.`,
          fundamentoLegal: 'Art. 1 Acuerdo de Valoración OMC: Valor de Transacción',
        });
      }
    }

    // ── Determinar nivel de riesgo ──
    let nivelRiesgo: SanctionScore['nivelRiesgo'] = 'bajo';
    if (scoreTotal > 100) nivelRiesgo = 'critico';
    else if (scoreTotal > UMBRAL_HARD_STOP) nivelRiesgo = 'alto';
    else if (scoreTotal > 25) nivelRiesgo = 'moderado';

    const zodHardStop = scoreTotal > UMBRAL_HARD_STOP;

    // ── Generar veredicto de Stella ──
    const stellaVeredicto = this.generarVeredictoStella(scoreTotal, hallazgos, input.referencia);

    // ── Generar mensaje de Zod ──
    const zodMensaje = zodHardStop
      ? `⛔ ZOD HARD STOP: Score ${scoreTotal} pts excede el umbral de ${UMBRAL_HARD_STOP}. Transmisión SIGA y pago de impuestos BLOQUEADOS. Se requiere resolución de hallazgos o Override por Corredor Senior con firma digital.`
      : scoreTotal > 25
        ? `⚠️ ZOD: Score ${scoreTotal} pts — Riesgo moderado. Se permite continuar con precaución.`
        : `✓ ZOD: Score ${scoreTotal} pts — Riesgo bajo. Aprobado para transmisión.`;

    // ── Hash de auditoría ──
    const hashData = `sanction:${input.referencia}:${scoreTotal}:${hallazgos.length}:${Date.now()}`;
    const hashAuditoria = CryptoJS.SHA256(hashData).toString(CryptoJS.enc.Hex);

    const result: SanctionScore = {
      referencia: input.referencia,
      scoreTotal,
      maxScore: 300, // theoretical max
      hallazgos,
      zodHardStop,
      zodMensaje,
      stellaVeredicto,
      nivelRiesgo,
      overridePermitido: zodHardStop, // only relevant when blocked
      overrideAplicado: false,
      hashAuditoria,
      timestamp: new Date().toISOString(),
    };

    if (zodHardStop) {
      devWarn(`[SanctionScore] ⛔ HARD STOP: ${input.referencia} — Score: ${scoreTotal}/${UMBRAL_HARD_STOP}`);
    } else {
      devLog(`[SanctionScore] Score: ${scoreTotal} — ${nivelRiesgo} — ${input.referencia}`);
    }

    return result;
  }

  /**
   * Aplica un override (salto de seguridad) por Corredor Senior
   * Genera firma digital y registra responsabilidad legal
   */
  static aplicarOverride(
    score: SanctionScore,
    corredorId: string,
    corredorNombre: string
  ): SanctionScore {
    const firmaData = `override:${score.referencia}:${score.scoreTotal}:${corredorId}:${Date.now()}`;
    const firmaHash = CryptoJS.SHA256(firmaData).toString(CryptoJS.enc.Hex);

    devWarn(`[SanctionScore] ⚠️ OVERRIDE aplicado por ${corredorNombre} (${corredorId}) para ${score.referencia}`);

    return {
      ...score,
      zodHardStop: false, // Unlock
      overrideAplicado: true,
      overridePor: corredorNombre,
      overrideFirmaHash: firmaHash,
      zodMensaje: `⚠️ ZOD: Hard Stop desactivado por Override de ${corredorNombre}. Score original: ${score.scoreTotal} pts. Responsabilidad legal asumida. Firma: ${firmaHash.substring(0, 16)}`,
    };
  }

  // ── Private ──

  private static generarVeredictoStella(
    score: number,
    hallazgos: HallazgoStella[],
    referencia: string
  ): string {
    if (score === 0) {
      return `Jefe, el expediente ${referencia} está limpio. No se detectaron hallazgos de riesgo. Aprobado para transmisión y pago.`;
    }

    const criticas = hallazgos.filter(h => h.severidad === 'critica').length;
    const categorias = [...new Set(hallazgos.map(h => h.categoria))];

    if (score > UMBRAL_HARD_STOP) {
      return `Jefe, el expediente ${referencia} presenta ${hallazgos.length} hallazgo(s) con un score de ${score} puntos. ${criticas > 0 ? `${criticas} son críticos. ` : ''}Zod ha bloqueado la transmisión. Las áreas afectadas son: ${categorias.join(', ')}. Se requiere corrección o autorización de Corredor Senior para continuar.`;
    }

    return `Jefe, ${referencia} tiene ${hallazgos.length} hallazgo(s) menores (score: ${score}/${UMBRAL_HARD_STOP}). Se permite continuar, pero recomiendo revisar: ${categorias.join(', ')}.`;
  }
}
