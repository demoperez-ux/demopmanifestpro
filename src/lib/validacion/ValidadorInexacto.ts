// ============================================
// VALIDADOR DE INEXACTITUD — ANTI-SANCIÓN
// RECAUCA Art. 320-325: Infracciones Aduaneras
// Comparación cruzada: BL ↔ Manifiesto ↔ Factura
// Umbral de diferencia > 1% = Riesgo de Infracción
// ============================================

import CryptoJS from 'crypto-js';
import { devLog, devWarn } from '@/lib/logger';

// ── Types ──

export interface DocumentoComparacion {
  fuente: 'bl' | 'manifiesto' | 'factura';
  referencia: string;
  pesoBrutoKg?: number;
  pesoNetoKg?: number;
  cantidadBultos?: number;
  tipoEmbalaje?: string;
  valorFOB?: number;
  descripcionGeneral?: string;
}

export interface DiscrepanciaDetectada {
  campo: string;
  campoLabel: string;
  fuenteA: string;
  fuenteB: string;
  valorA: number | string;
  valorB: number | string;
  diferencia: number; // porcentaje para numéricos
  diferenciaSuperaUmbral: boolean;
  umbral: number;
  severidad: 'critica' | 'advertencia' | 'informativa';
  fundamentoLegal: string;
  zodMensaje: string;
}

export interface ResultadoValidacionInexacta {
  referencia: string;
  documentosComparados: string[];
  totalDiscrepancias: number;
  discrepanciasCriticas: number;
  discrepancias: DiscrepanciaDetectada[];
  riesgoInfraccion: boolean;
  zodBloqueo: boolean;
  zodHash: string;
  stellaMensaje: string;
  fundamentoLegal: string;
  timestamp: string;
}

// ── Constants ──

const UMBRAL_PORCENTAJE = 1; // > 1% = riesgo de infracción
const UMBRAL_PESO_KG = 0.5; // tolerancia mínima en kg para pesos muy pequeños

const FUNDAMENTO_LEGAL = {
  general: 'RECAUCA Art. 320-325: Infracciones aduaneras por inexactitud en declaraciones',
  peso: 'RECAUCA Art. 321 inc. b): Diferencia en peso bruto/neto declarado vs verificado',
  bultos: 'RECAUCA Art. 321 inc. a): Diferencia en cantidad de bultos declarados',
  embalaje: 'RECAUCA Art. 321 inc. c): Tipo de embalaje no coincide con declaración',
  valor: 'RECAUCA Art. 322: Inexactitud en valor declarado que genere perjuicio fiscal',
};

const CAMPOS_NUMERICOS: Array<{
  campo: keyof DocumentoComparacion;
  label: string;
  fundamentoLegal: string;
}> = [
  { campo: 'pesoBrutoKg', label: 'Peso Bruto (kg)', fundamentoLegal: FUNDAMENTO_LEGAL.peso },
  { campo: 'pesoNetoKg', label: 'Peso Neto (kg)', fundamentoLegal: FUNDAMENTO_LEGAL.peso },
  { campo: 'cantidadBultos', label: 'Cantidad de Bultos', fundamentoLegal: FUNDAMENTO_LEGAL.bultos },
  { campo: 'valorFOB', label: 'Valor FOB (USD)', fundamentoLegal: FUNDAMENTO_LEGAL.valor },
];

// ── Labels ──

const FUENTE_LABELS: Record<string, string> = {
  bl: 'B/L (Conocimiento de Embarque)',
  manifiesto: 'Manifiesto de Carga',
  factura: 'Factura Comercial',
};

// ── Validator ──

export class ValidadorInexacto {

  /**
   * Compara campos críticos entre documentos y detecta discrepancias > 1%
   */
  static validar(documentos: DocumentoComparacion[]): ResultadoValidacionInexacta {
    if (documentos.length < 2) {
      return this.resultadoVacio('Se requieren al menos 2 documentos para comparación cruzada');
    }

    const referencia = documentos[0].referencia;
    devLog(`[Inexacto] Validando ${documentos.length} documentos para: ${referencia}`);

    const discrepancias: DiscrepanciaDetectada[] = [];

    // Comparar cada par de documentos
    for (let i = 0; i < documentos.length; i++) {
      for (let j = i + 1; j < documentos.length; j++) {
        const docA = documentos[i];
        const docB = documentos[j];

        // Comparar campos numéricos
        for (const config of CAMPOS_NUMERICOS) {
          const valorA = docA[config.campo] as number | undefined;
          const valorB = docB[config.campo] as number | undefined;

          if (valorA != null && valorB != null && valorA > 0 && valorB > 0) {
            const resultado = this.compararNumerico(
              valorA,
              valorB,
              config.label,
              FUENTE_LABELS[docA.fuente] || docA.fuente,
              FUENTE_LABELS[docB.fuente] || docB.fuente,
              config.fundamentoLegal,
              config.campo
            );
            if (resultado) {
              discrepancias.push(resultado);
            }
          }
        }

        // Comparar tipo de embalaje (campo textual)
        if (docA.tipoEmbalaje && docB.tipoEmbalaje) {
          const embA = docA.tipoEmbalaje.trim().toUpperCase();
          const embB = docB.tipoEmbalaje.trim().toUpperCase();

          if (embA !== embB) {
            discrepancias.push({
              campo: 'tipoEmbalaje',
              campoLabel: 'Tipo de Embalaje',
              fuenteA: FUENTE_LABELS[docA.fuente] || docA.fuente,
              fuenteB: FUENTE_LABELS[docB.fuente] || docB.fuente,
              valorA: docA.tipoEmbalaje,
              valorB: docB.tipoEmbalaje,
              diferencia: 100, // 100% diferente para texto
              diferenciaSuperaUmbral: true,
              umbral: 0,
              severidad: 'advertencia',
              fundamentoLegal: FUNDAMENTO_LEGAL.embalaje,
              zodMensaje: `⚠️ ZOD: Tipo de embalaje difiere entre ${FUENTE_LABELS[docA.fuente]} ("${docA.tipoEmbalaje}") y ${FUENTE_LABELS[docB.fuente]} ("${docB.tipoEmbalaje}"). Verificar RECAUCA Art. 321 inc. c).`,
            });
          }
        }
      }
    }

    const criticas = discrepancias.filter(d => d.severidad === 'critica').length;
    const riesgoInfraccion = criticas > 0;
    const zodBloqueo = criticas >= 2; // Bloqueo si hay 2+ discrepancias críticas

    const hashData = `inexacto:${referencia}:${discrepancias.length}:${criticas}:${Date.now()}`;
    const zodHash = CryptoJS.SHA256(hashData).toString(CryptoJS.enc.Hex);

    let stellaMensaje: string;
    if (zodBloqueo) {
      stellaMensaje = `⛔ Jefe, Zod ha bloqueado la liquidación de ${referencia}. Se detectaron ${criticas} discrepancias críticas entre documentos que superan el umbral del ${UMBRAL_PORCENTAJE}%. RECAUCA Art. 320-325 establece sanciones por inexactitud. Requiere corrección antes de transmitir a SIGA.`;
    } else if (riesgoInfraccion) {
      stellaMensaje = `⚠️ Jefe, atención: ${referencia} presenta ${criticas} discrepancia(s) que superan el ${UMBRAL_PORCENTAJE}% de tolerancia entre documentos. Recomiendo verificar antes de la transmisión para evitar multa por inexactitud (RECAUCA Art. 321).`;
    } else if (discrepancias.length > 0) {
      stellaMensaje = `ℹ️ Jefe, ${referencia} tiene ${discrepancias.length} diferencia(s) menores entre documentos, todas dentro del umbral aceptable. Aprobado para transmisión.`;
    } else {
      stellaMensaje = `✓ Jefe, ${referencia} verificado: Todos los campos críticos coinciden entre BL, Manifiesto y Factura. Aprobado para transmisión.`;
    }

    if (riesgoInfraccion) {
      devWarn(`[Inexacto] ⚠️ RIESGO INFRACCIÓN: ${referencia} — ${criticas} discrepancias críticas`);
    }

    return {
      referencia,
      documentosComparados: documentos.map(d => FUENTE_LABELS[d.fuente] || d.fuente),
      totalDiscrepancias: discrepancias.length,
      discrepanciasCriticas: criticas,
      discrepancias,
      riesgoInfraccion,
      zodBloqueo,
      zodHash,
      stellaMensaje,
      fundamentoLegal: FUNDAMENTO_LEGAL.general,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Private ──

  private static compararNumerico(
    valorA: number,
    valorB: number,
    campoLabel: string,
    fuenteA: string,
    fuenteB: string,
    fundamentoLegal: string,
    campo: string
  ): DiscrepanciaDetectada | null {
    const mayor = Math.max(valorA, valorB);
    const diferencia = Math.abs(valorA - valorB);
    const porcentaje = mayor > 0 ? (diferencia / mayor) * 100 : 0;

    // Ignorar diferencias insignificantes (por debajo del umbral mínimo absoluto)
    if (campo.includes('peso') && diferencia < UMBRAL_PESO_KG) return null;
    if (campo === 'cantidadBultos' && diferencia < 1) return null;

    if (porcentaje < 0.01) return null; // No registrar diferencias microscópicas

    const superaUmbral = porcentaje > UMBRAL_PORCENTAJE;

    return {
      campo,
      campoLabel,
      fuenteA,
      fuenteB,
      valorA,
      valorB,
      diferencia: Math.round(porcentaje * 100) / 100,
      diferenciaSuperaUmbral: superaUmbral,
      umbral: UMBRAL_PORCENTAJE,
      severidad: superaUmbral ? 'critica' : porcentaje > 0.5 ? 'advertencia' : 'informativa',
      fundamentoLegal,
      zodMensaje: superaUmbral
        ? `⛔ ZOD: ${campoLabel} difiere ${porcentaje.toFixed(2)}% entre ${fuenteA} (${valorA}) y ${fuenteB} (${valorB}). Supera umbral del ${UMBRAL_PORCENTAJE}%. Riesgo de infracción RECAUCA.`
        : `ℹ️ ${campoLabel}: Diferencia de ${porcentaje.toFixed(2)}% dentro del umbral aceptable.`,
    };
  }

  private static resultadoVacio(mensaje: string): ResultadoValidacionInexacta {
    return {
      referencia: 'N/A',
      documentosComparados: [],
      totalDiscrepancias: 0,
      discrepanciasCriticas: 0,
      discrepancias: [],
      riesgoInfraccion: false,
      zodBloqueo: false,
      zodHash: CryptoJS.SHA256(`empty:${Date.now()}`).toString(CryptoJS.enc.Hex),
      stellaMensaje: mensaje,
      fundamentoLegal: FUNDAMENTO_LEGAL.general,
      timestamp: new Date().toISOString(),
    };
  }
}
