// ============================================
// HONORARIOS MÍNIMOS DEL CORREDOR DE ADUANA
// Resolución 222 de 2025 - ANA Panamá
// Vigente desde febrero 2026
// ============================================

import { devLog } from '@/lib/logger';

/**
 * Resultado del cálculo de honorarios del corredor
 */
export interface ResultadoHonorarioCorredor {
  valorCIF: number;
  honorarioBase: number;
  metodoCalculo: 'fijo' | 'porcentual';
  formulaAplicada: string;
  fundamentoLegal: string;
}

/**
 * Constantes de la Resolución 222 de 2025
 */
const RES_222 = {
  UMBRAL_FIJO: 2500.00,        // <= $2,499.99 → honorario fijo
  HONORARIO_FIJO: 60.00,       // $60.00 fijo
  FACTOR_PORCENTUAL: 0.0027,   // 0.27% del CIF
  BASE_PORCENTUAL: 80.00,      // + $80.00
  FUNDAMENTA: 'Resolución 222 de 2025 - Autoridad Nacional de Aduanas',
};

/**
 * Calcula el honorario mínimo del corredor de aduana
 * según Resolución 222 de 2025
 * 
 * Reglas:
 *   - CIF <= $2,499.99 → Honorario fijo de $60.00
 *   - CIF >= $2,500.00 → (CIF × 0.0027) + $80.00
 */
export function calcularHonorarioCorredor(valorCIF: number): ResultadoHonorarioCorredor {
  const redondear = (v: number) => Math.round(v * 100) / 100;

  if (valorCIF < RES_222.UMBRAL_FIJO) {
    devLog(`[Honorarios Res.222] CIF=$${valorCIF.toFixed(2)} → Fijo $${RES_222.HONORARIO_FIJO.toFixed(2)}`);
    return {
      valorCIF: redondear(valorCIF),
      honorarioBase: RES_222.HONORARIO_FIJO,
      metodoCalculo: 'fijo',
      formulaAplicada: `Honorario fijo = $${RES_222.HONORARIO_FIJO.toFixed(2)} (CIF < $${RES_222.UMBRAL_FIJO.toFixed(2)})`,
      fundamentoLegal: RES_222.FUNDAMENTA,
    };
  }

  const honorario = redondear(valorCIF * RES_222.FACTOR_PORCENTUAL + RES_222.BASE_PORCENTUAL);

  devLog(`[Honorarios Res.222] CIF=$${valorCIF.toFixed(2)} → ($${valorCIF.toFixed(2)} × 0.0027) + $80.00 = $${honorario.toFixed(2)}`);

  return {
    valorCIF: redondear(valorCIF),
    honorarioBase: honorario,
    metodoCalculo: 'porcentual',
    formulaAplicada: `($${valorCIF.toFixed(2)} × 0.0027) + $80.00 = $${honorario.toFixed(2)}`,
    fundamentoLegal: RES_222.FUNDAMENTA,
  };
}

/**
 * Genera desglose completo para el Excel de liquidación
 */
export function desgloseHonorariosCorredor(valorCIF: number): {
  concepto: string;
  monto: number;
  detalle: string;
}[] {
  const resultado = calcularHonorarioCorredor(valorCIF);

  return [
    {
      concepto: 'Honorario de Corredor de Aduana',
      monto: resultado.honorarioBase,
      detalle: resultado.formulaAplicada,
    },
  ];
}

export default {
  calcularHonorarioCorredor,
  desgloseHonorariosCorredor,
};
