/**
 * MATRIZ DE RIESGO OEA — ZENITH Core
 * Motor de evaluación basado en el estándar OEA (Operador Económico Autorizado)
 * Autoridad Nacional de Aduanas de Panamá — 2026
 * 
 * Evalúa 4 pilares con pesos específicos:
 *   Pilar 1 (Asociados): Certificaciones OEA/BASC
 *   Pilar 2 (Carga): Discrepancia de peso
 *   Pilar 3 (Ruta): Origen de zona de alto riesgo
 *   Pilar 4 (Mercancía): Productos restringidos
 */

import CryptoJS from 'crypto-js';

// ============ TIPOS ============

export type NivelRiesgo = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';

export interface FactorRiesgo {
  pilar: 1 | 2 | 3 | 4;
  nombre: string;
  descripcion: string;
  puntos: number;
  activo: boolean;
  detalles?: string;
}

export interface ResultadoMatrizRiesgo {
  nivelRiesgo: NivelRiesgo;
  scoreTotal: number;
  factores: FactorRiesgo[];
  mensajeStella: string;
  mensajeZod: string | null;
  bloqueado: boolean;
  requiereInspeccion17Puntos: boolean;
  canalSugerido: 'verde' | 'amarillo' | 'rojo' | 'bloqueado';
  hashAuditoria: string;
  timestamp: string;
}

export interface ParametrosEvaluacion {
  // Pilar 1 — Asociados
  clienteOEA: boolean;
  transportistasBASC: boolean;

  // Pilar 2 — Carga
  pesoDeclarado: number;
  pesoVerificado: number;
  tipoCarga: 'general' | 'granel' | 'courier';

  // Pilar 3 — Ruta
  paisOrigen: string;
  zonaAltoRiesgo: boolean;

  // Pilar 4 — Mercancía
  productosRestringidosMINSA: number;
  productosRestringidosMIDA: number;
  totalProductos: number;

  // Contexto
  mawb?: string;
  operador?: string;
}

// ============ ZONAS DE ALTO RIESGO ============

const ZONAS_ALTO_RIESGO = new Set([
  'AF', // Afganistán
  'CO', // Colombia (ciertas regiones)
  'VE', // Venezuela
  'MM', // Myanmar
  'LA', // Laos
  'SY', // Siria
  'IQ', // Irak
  'IR', // Irán
  'KP', // Corea del Norte
  'LY', // Libia
  'YE', // Yemen
  'SO', // Somalia
  'SD', // Sudán
]);

// ============ MOTOR DE EVALUACIÓN ============

export class MatrizRiesgoOEA {

  /**
   * Evalúa los 4 pilares de riesgo OEA y retorna el resultado completo
   */
  static evaluar(params: ParametrosEvaluacion): ResultadoMatrizRiesgo {
    const factores: FactorRiesgo[] = [];
    let scoreTotal = 0;
    const timestamp = new Date().toISOString();

    // ─── PILAR 1: Asociados ───
    if (params.clienteOEA) {
      factores.push({
        pilar: 1,
        nombre: 'Cliente OEA Certificado',
        descripcion: 'El cliente posee certificación OEA vigente',
        puntos: -30,
        activo: true,
        detalles: 'Reducción de riesgo por certificación OEA del consignatario',
      });
      scoreTotal -= 30;
    }

    if (params.transportistasBASC) {
      factores.push({
        pilar: 1,
        nombre: 'Transportista BASC',
        descripcion: 'El transportista está certificado BASC v6-2022',
        puntos: -20,
        activo: true,
        detalles: 'Reducción de riesgo por certificación BASC del transportista',
      });
      scoreTotal -= 20;
    }

    if (!params.clienteOEA) {
      factores.push({
        pilar: 1,
        nombre: 'Cliente sin certificación OEA',
        descripcion: 'El cliente no posee certificación OEA',
        puntos: 0,
        activo: true,
        detalles: 'Sin beneficio de reducción — Se recomienda verificar antecedentes',
      });
    }

    // ─── PILAR 2: Carga — Discrepancia de Peso ───
    const discrepanciaPeso = this.calcularDiscrepanciaPeso(
      params.pesoDeclarado,
      params.pesoVerificado,
      params.tipoCarga
    );

    if (discrepanciaPeso.excedeTolerance) {
      factores.push({
        pilar: 2,
        nombre: 'Discrepancia de Peso CRÍTICA',
        descripcion: `Peso declarado vs verificado excede tolerancia ANA (${discrepanciaPeso.tolerancia}%)`,
        puntos: 100,
        activo: true,
        detalles: `Declarado: ${params.pesoDeclarado.toFixed(2)} LB | Verificado: ${params.pesoVerificado.toFixed(2)} LB | Diferencia: ${discrepanciaPeso.porcentaje.toFixed(2)}% (Tolerancia: ${discrepanciaPeso.tolerancia}%)`,
      });
      scoreTotal += 100;
    } else if (params.pesoDeclarado > 0 && params.pesoVerificado > 0) {
      factores.push({
        pilar: 2,
        nombre: 'Peso Verificado',
        descripcion: 'El peso declarado coincide con el verificado dentro de la tolerancia ANA',
        puntos: 0,
        activo: true,
        detalles: `Diferencia: ${discrepanciaPeso.porcentaje.toFixed(2)}% (Tolerancia: ${discrepanciaPeso.tolerancia}%)`,
      });
    }

    // ─── PILAR 3: Ruta — Zona de Alto Riesgo ───
    const esZonaRiesgo = params.zonaAltoRiesgo || ZONAS_ALTO_RIESGO.has(params.paisOrigen.toUpperCase());

    if (esZonaRiesgo) {
      factores.push({
        pilar: 3,
        nombre: 'Origen Zona de Alto Riesgo',
        descripcion: `País de origen (${params.paisOrigen}) clasificado como zona de alto riesgo`,
        puntos: 25,
        activo: true,
        detalles: 'Según listas OFAC/ONU y clasificación ANA de rutas sensibles',
      });
      scoreTotal += 25;
    } else {
      factores.push({
        pilar: 3,
        nombre: 'Ruta Estándar',
        descripcion: `País de origen (${params.paisOrigen}) — Sin alertas de ruta`,
        puntos: 0,
        activo: true,
      });
    }

    // ─── PILAR 4: Mercancía — Productos Restringidos ───
    const totalRestringidos = params.productosRestringidosMINSA + params.productosRestringidosMIDA;

    if (totalRestringidos > 0) {
      factores.push({
        pilar: 4,
        nombre: 'Productos Restringidos (MINSA/MIDA)',
        descripcion: `${totalRestringidos} producto(s) con restricciones sanitarias detectados`,
        puntos: 15,
        activo: true,
        detalles: `MINSA: ${params.productosRestringidosMINSA} | MIDA: ${params.productosRestringidosMIDA} de ${params.totalProductos} total`,
      });
      scoreTotal += 15;
    } else {
      factores.push({
        pilar: 4,
        nombre: 'Mercancía Sin Restricciones',
        descripcion: 'No se detectaron productos con restricciones sanitarias',
        puntos: 0,
        activo: true,
      });
    }

    // ─── Calcular nivel y generar resultado ───
    // Score mínimo es 0 (las reducciones no llevan a negativo)
    const scoreEfectivo = Math.max(0, scoreTotal);
    const nivelRiesgo = this.calcularNivel(scoreEfectivo);
    const bloqueado = nivelRiesgo === 'CRITICO';
    const requiereInspeccion = nivelRiesgo === 'ALTO' || nivelRiesgo === 'CRITICO';

    const canalSugerido: ResultadoMatrizRiesgo['canalSugerido'] =
      bloqueado ? 'bloqueado' :
      nivelRiesgo === 'ALTO' ? 'rojo' :
      nivelRiesgo === 'MEDIO' ? 'amarillo' : 'verde';

    const mensajeStella = this.generarMensajeStella(nivelRiesgo, scoreEfectivo, factores, canalSugerido);
    const mensajeZod = bloqueado
      ? 'Veredicto de Zod: Integridad comprometida. Operación bloqueada por protocolo de seguridad. La discrepancia detectada supera los límites tolerables. Se requiere intervención del Oficial de Seguridad BASC.'
      : nivelRiesgo === 'ALTO'
        ? 'Zod Integrity: Nivel de riesgo ALTO detectado. Se requiere la Inspección de 17 Puntos antes de proceder con la liquidación SIGA.'
        : null;

    const hashData = `oea_risk:${scoreEfectivo}:${nivelRiesgo}:${params.mawb || 'N/A'}:${timestamp}`;
    const hashAuditoria = CryptoJS.SHA256(hashData).toString(CryptoJS.enc.Hex);

    return {
      nivelRiesgo,
      scoreTotal: scoreEfectivo,
      factores,
      mensajeStella,
      mensajeZod,
      bloqueado,
      requiereInspeccion17Puntos: requiereInspeccion,
      canalSugerido,
      hashAuditoria,
      timestamp,
    };
  }

  /**
   * Calcula la discrepancia de peso según tolerancias ANA 2026:
   * - Granel: 0.5%
   * - Carga general/courier: 0% (exacto)
   */
  private static calcularDiscrepanciaPeso(
    declarado: number,
    verificado: number,
    tipoCarga: 'general' | 'granel' | 'courier'
  ): { porcentaje: number; tolerancia: number; excedeTolerance: boolean } {
    if (declarado <= 0 || verificado <= 0) {
      return { porcentaje: 0, tolerancia: 0, excedeTolerance: false };
    }

    const diferencia = Math.abs(declarado - verificado);
    const porcentaje = (diferencia / declarado) * 100;

    // Tolerancias ANA Panamá 2026
    const tolerancia = tipoCarga === 'granel' ? 0.5 : 0;

    return {
      porcentaje,
      tolerancia,
      excedeTolerance: porcentaje > tolerancia,
    };
  }

  /**
   * Determina el nivel de riesgo basado en el score
   */
  private static calcularNivel(score: number): NivelRiesgo {
    if (score >= 100) return 'CRITICO';
    if (score >= 40) return 'ALTO';
    if (score >= 15) return 'MEDIO';
    return 'BAJO';
  }

  /**
   * Genera el mensaje proactivo de Stella Help según el nivel
   */
  private static generarMensajeStella(
    nivel: NivelRiesgo,
    score: number,
    factores: FactorRiesgo[],
    canal: ResultadoMatrizRiesgo['canalSugerido']
  ): string {
    const factoresPositivos = factores.filter(f => f.puntos < 0);
    const factoresNegativos = factores.filter(f => f.puntos > 0);

    switch (nivel) {
      case 'BAJO':
        return `Jefe, he revisado el perfil completo del envío y cumple con los estándares OEA. ${
          factoresPositivos.length > 0
            ? `Las certificaciones ${factoresPositivos.map(f => f.nombre).join(' y ')} reducen el riesgo significativamente. `
            : ''
        }Podemos proceder con el Canal Verde. Score de riesgo: ${score}.`;

      case 'MEDIO':
        return `Jefe, el análisis OEA muestra un riesgo moderado (score: ${score}). ${
          factoresNegativos.length > 0
            ? `Factores de atención: ${factoresNegativos.map(f => f.nombre).join(', ')}. `
            : ''
        }Sugiero Canal Amarillo: verificar documentación faltante antes de proceder con la liquidación.`;

      case 'ALTO':
        return `⚠️ Jefe, atención: El análisis OEA indica riesgo ALTO (score: ${score}). ${
          factoresNegativos.map(f => f.nombre).join(', ')
        }. Se requiere la Inspección de 17 Puntos obligatoria y la subida de fotos antes de permitir el avance. Canal Rojo activado.`;

      case 'CRITICO':
        return `🚨 ALERTA CRÍTICA: El motor OEA ha identificado riesgo CRÍTICO (score: ${score}). ${
          factoresNegativos.map(f => f.nombre).join(', ')
        }. Zod ha bloqueado la liquidación SIGA. Se requiere intervención inmediata del Oficial de Seguridad BASC.`;
    }
  }

  /**
   * Verifica si un país está en la lista de zonas de alto riesgo
   */
  static esZonaAltoRiesgo(codigoPais: string): boolean {
    return ZONAS_ALTO_RIESGO.has(codigoPais.toUpperCase());
  }

  /**
   * Obtiene los datos para el gráfico radar
   */
  static obtenerDatosRadar(resultado: ResultadoMatrizRiesgo): Array<{
    pilar: string;
    valor: number;
    maximo: number;
    fullMark: number;
  }> {
    const pilarScores: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

    resultado.factores.forEach(f => {
      // For radar, we normalize: negative (good) becomes low, positive (bad) becomes high
      const scorePilar = Math.max(0, f.puntos);
      pilarScores[f.pilar] = Math.max(pilarScores[f.pilar], scorePilar);
    });

    return [
      { pilar: 'Asociados', valor: pilarScores[1] === 0 ? 10 : 5, maximo: 100, fullMark: 100 },
      { pilar: 'Carga', valor: pilarScores[2], maximo: 100, fullMark: 100 },
      { pilar: 'Ruta', valor: pilarScores[3], maximo: 100, fullMark: 100 },
      { pilar: 'Mercancía', valor: pilarScores[4], maximo: 100, fullMark: 100 },
    ];
  }
}
