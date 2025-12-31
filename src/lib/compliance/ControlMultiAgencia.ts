// ============================================
// CONTROL MULTI-AGENCIA 360°
// CONAPRED, MINSA, APA, MIDA - Bloqueos Obligatorios
// ============================================

import { devLog, devWarn } from '@/lib/logger';
import { DetectorCONAPRED } from '@/lib/regulatorio/DetectorCONAPRED';

export type AgenciaReguladora = 'CONAPRED' | 'MINSA' | 'APA' | 'MIDA' | 'AUPSA' | 'ACODECO' | 'MINGOB';

export interface BloqueoRegulatorio {
  agencia: AgenciaReguladora;
  tipoBloqueo: 'obligatorio' | 'condicional';
  razon: string;
  documentoRequerido: string;
  fundamentoLegal: string;
  puedeProcesoLiquidacion: boolean;
}

export interface ResultadoControlMultiAgencia {
  aprobado: boolean;
  bloqueos: BloqueoRegulatorio[];
  advertencias: string[];
  documentosFaltantes: string[];
  agenciasInvolucradas: AgenciaReguladora[];
}

// Keywords por agencia
const KEYWORDS_MINSA = ['medicamento', 'farmaceutico', 'pharmaceutical', 'medicine', 'drug', 'capsule', 'tablet', 'injection', 'vaccine', 'antibiotico', 'analgesico'];
const KEYWORDS_MIDA = ['fruta', 'vegetal', 'semilla', 'planta', 'fertilizante', 'pesticida', 'agroquimico', 'fruit', 'vegetable', 'seed'];
const KEYWORDS_AUPSA = ['carne', 'lacteo', 'huevo', 'animal', 'meat', 'dairy', 'poultry', 'fish', 'seafood', 'mariscos'];
const KEYWORDS_APA = ['alimento', 'food', 'comestible', 'bebida', 'drink', 'snack', 'cereal', 'condimento'];

export class ControlMultiAgencia {

  static evaluarCumplimiento(params: {
    descripcion: string;
    hsCode: string;
    valorUSD: number;
    pesoKg?: number;
    tieneRegistroSanitario?: boolean;
    tieneLicenciaCONAPRED?: boolean;
  }): ResultadoControlMultiAgencia {
    const bloqueos: BloqueoRegulatorio[] = [];
    const advertencias: string[] = [];
    const documentosFaltantes: string[] = [];
    const agencias: Set<AgenciaReguladora> = new Set();
    
    const descLower = params.descripcion.toLowerCase();
    const hsCode = params.hsCode || '';

    // 1. CONAPRED - Precursores químicos
    const analisisCONAPRED = DetectorCONAPRED.analizarDescripcion(params.descripcion, { pesoKg: params.pesoKg });
    if (analisisCONAPRED.tieneAlerta) {
      agencias.add('CONAPRED');
      
      if (!params.tieneLicenciaCONAPRED) {
        bloqueos.push({
          agencia: 'CONAPRED',
          tipoBloqueo: 'obligatorio',
          razon: `Sustancia controlada detectada: ${analisisCONAPRED.alertas[0]?.sustanciaNombre}`,
          documentoRequerido: 'Licencia de Operación - Unidad de Control de Químicos',
          fundamentoLegal: 'Ley 48 de 2003 - Art. 8',
          puedeProcesoLiquidacion: false
        });
        documentosFaltantes.push('Licencia CONAPRED');
      }
    }

    // 2. MINSA - Farmacéuticos
    const esFarmaceutico = KEYWORDS_MINSA.some(kw => descLower.includes(kw)) || hsCode.startsWith('30');
    if (esFarmaceutico) {
      agencias.add('MINSA');
      
      if (!params.tieneRegistroSanitario) {
        bloqueos.push({
          agencia: 'MINSA',
          tipoBloqueo: 'obligatorio',
          razon: 'Producto farmacéutico requiere registro sanitario',
          documentoRequerido: 'Registro Sanitario MINSA vigente',
          fundamentoLegal: 'Ley 1 de 2001 - Art. 106',
          puedeProcesoLiquidacion: false
        });
        documentosFaltantes.push('Registro Sanitario MINSA');
      }
    }

    // 3. MIDA - Fitosanitario
    const esFitosanitario = KEYWORDS_MIDA.some(kw => descLower.includes(kw));
    if (esFitosanitario) {
      agencias.add('MIDA');
      documentosFaltantes.push('Certificado Fitosanitario');
      advertencias.push('Producto requiere inspección fitosanitaria MIDA');
    }

    // 4. AUPSA - Zoosanitario
    const esZoosanitario = KEYWORDS_AUPSA.some(kw => descLower.includes(kw));
    if (esZoosanitario) {
      agencias.add('AUPSA');
      documentosFaltantes.push('Certificado Zoosanitario AUPSA');
      advertencias.push('Producto requiere certificado zoosanitario');
    }

    // 5. APA - Alimentos procesados
    const esAlimento = KEYWORDS_APA.some(kw => descLower.includes(kw));
    if (esAlimento && !esFitosanitario && !esZoosanitario) {
      agencias.add('APA');
      advertencias.push('Alimento procesado - Verificar registro APA');
    }

    const tieneBloqueos = bloqueos.some(b => b.tipoBloqueo === 'obligatorio');
    
    devLog(`[MultiAgencia] ${agencias.size} agencias, ${bloqueos.length} bloqueos, aprobado: ${!tieneBloqueos}`);

    return {
      aprobado: !tieneBloqueos,
      bloqueos,
      advertencias,
      documentosFaltantes: [...new Set(documentosFaltantes)],
      agenciasInvolucradas: Array.from(agencias)
    };
  }
}

export default ControlMultiAgencia;
