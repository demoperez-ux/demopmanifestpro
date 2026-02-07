// ============================================
// MOTOR DE LIQUIDACIÓN ESPEJO SIGA — ZENITH
// Cerebro Arancelario del ecosistema Orion
// Réplica exacta de la aritmética ANA Panamá
// Verificado por Zod Integrity Engine
// Incoterms® 2020 (ICC) integrado
// ============================================

import { CONSTANTES_DECLARACION } from '@/types/declaracionOficial';
import { Arancel, Liquidacion, CategoriaAduanera, RestriccionDetectada, ConfiguracionLiquidacion, DEFAULT_CONFIG_LIQUIDACION } from '@/types/aduanas';
import { ManifestRow } from '@/types/manifest';
import { devLog, devWarn } from '@/lib/logger';
import { calcularCIFPorIncoterm, Incoterm2020, CostosTransporte, ResultadoCIF } from '@/lib/gs1/MotorIncoterms2020';

// ============================================
// CONSTANTES SIGA
// ============================================
const SIGA = {
  TASA_SISTEMA: 3.00,          // B/. 3.00 fijo
  TASA_FORMULARIO: 5.00,       // B/. 5.00 fijo
  ITBMS_STANDARD: 7,           // 7%
  SEGURO_TEORICO: 1,           // 1% del FOB si no existe
  UMBRAL_DE_MINIMIS: 100.00,   // USD $100.00 CIF exacto (Feb 2026)
  UMBRAL_CORREDOR: 2000.00,    // USD $2,000.00 (Feb 2026: > $2,000.00)
  RECARGO_1_DIAS: 5,           // Días para primer recargo
  RECARGO_1_PORCENTAJE: 10,    // 10%
  RECARGO_2_DIAS: 8,           // Días para segundo recargo
  RECARGO_2_PORCENTAJE: 20     // 20%
};

export interface ComponentesLiquidacionSIGA {
  // Valores base
  valorFOB: number;
  valorFlete: number;
  valorSeguro: number;
  valorCIF: number;
  
  // Impuestos calculados
  baseDAI: number;
  tasaDAI: number;
  montoDAI: number;
  
  baseISC: number;
  tasaISC: number;
  montoISC: number;
  
  baseITBMS: number;
  tasaITBMS: number;
  montoITBMS: number;
  
  // Tasas fijas
  tasaSistema: number;
  tasaFormulario: number;
  
  // Totales
  subtotalTributos: number;
  subtotalTasas: number;
  totalAPagar: number;
  
  // Metadatos
  seguroTeorico: boolean;
  fundamentoLegal?: string;
  
  // Incoterms® 2020 (ICC)
  incoterm?: Incoterm2020;
  incotermInfo?: ResultadoCIF;
}

export interface ResultadoLiquidacionSIGA extends Liquidacion {
  componentes: ComponentesLiquidacionSIGA;
  boletaPago: {
    montoNormal: number;
    fechaVencimiento: Date;
    montoRecargo1: number;
    fechaRecargo1: Date;
    montoRecargo2: number;
    fechaRecargo2: Date;
    montoActual: number;
    estadoMora: 'vigente' | 'recargo_1' | 'recargo_2';
  };
}

/**
 * Motor de Liquidación Espejo SIGA
 * Replica exactamente la aritmética del sistema SIGA de la ANA
 */
export class MotorLiquidacionSIGA {
  
  /**
   * Calcula liquidación exacta según modelo SIGA
   * CIF = FOB + Flete + Seguro (1% si no existe)
   * DAI = CIF × %DAI
   * ISC = (CIF + DAI) × %ISC
   * ITBMS = (CIF + DAI + ISC) × 7%
   * Total = DAI + ISC + ITBMS + Tasa Sistema (B/.3.00)
   */
  static calcularLiquidacion(
    paquete: ManifestRow,
    arancel: Arancel,
    manifiestoId: string,
    opciones: {
      valorFlete?: number;
      valorSeguro?: number;
      fechaRegistro?: Date;
      restricciones?: RestriccionDetectada[];
      incoterm?: Incoterm2020;
      costosTransporte?: Partial<CostosTransporte>;
    } = {}
  ): ResultadoLiquidacionSIGA {
    const redondear = (v: number) => Math.round(v * 100) / 100;
    
    // ═══════════════════════════════════════════════════════
    // PASO 1: CALCULAR COMPONENTES CIF (con soporte Incoterms® 2020)
    // ═══════════════════════════════════════════════════════
    
    let valorFOB: number;
    let valorFlete: number;
    let valorSeguro: number;
    let seguroTeorico = false;
    let fundamentoLegal: string | undefined;
    let incotermInfo: ResultadoCIF | undefined;
    
    if (opciones.incoterm) {
      // === MODO INCOTERMS 2020 (ICC) ===
      const costosTransp: Partial<CostosTransporte> = {
        fleteInternacional: opciones.valorFlete ?? opciones.costosTransporte?.fleteInternacional,
        seguroInternacional: opciones.valorSeguro ?? opciones.costosTransporte?.seguroInternacional,
        ...opciones.costosTransporte,
      };
      
      incotermInfo = calcularCIFPorIncoterm(paquete.valueUSD, opciones.incoterm, costosTransp);
      valorFOB = incotermInfo.valorFOB;
      valorFlete = incotermInfo.valorFlete;
      valorSeguro = incotermInfo.valorSeguro;
      seguroTeorico = incotermInfo.seguroTeorico;
      fundamentoLegal = incotermInfo.fundamentoLegal;
      
      devLog(`[SIGA-ICC] Incoterm ${opciones.incoterm}: CIF=$${incotermInfo.valorCIF}`);
    } else {
      // === MODO CLÁSICO (sin Incoterm) ===
      valorFOB = paquete.valueUSD;
      valorFlete = opciones.valorFlete ?? redondear(valorFOB * 0.07);
      
      if (opciones.valorSeguro !== undefined && opciones.valorSeguro !== null) {
        valorSeguro = opciones.valorSeguro;
      } else {
        valorSeguro = redondear(valorFOB * (SIGA.SEGURO_TEORICO / 100));
        seguroTeorico = true;
        fundamentoLegal = 'Art. 8.2 Acuerdo Valoración Aduanera OMC - Seguro teórico 1%';
      }
    }
    
    // CIF = FOB + Flete + Seguro
    const valorCIF = redondear(valorFOB + valorFlete + valorSeguro);
    
    // ═══════════════════════════════════════════════════════
    // PASO 2: CLASIFICAR CATEGORÍA ADUANERA
    // ═══════════════════════════════════════════════════════
    
    const { categoria, descripcion: categoriaDesc } = this.clasificarCategoria(
      valorCIF,
      paquete.description
    );
    
    // ═══════════════════════════════════════════════════════
    // PASO 3: CALCULAR CASCADA FISCAL (Solo Categoría C)
    // ═══════════════════════════════════════════════════════
    
    let componentes: ComponentesLiquidacionSIGA;
    
    if (categoria === 'C') {
      componentes = this.calcularCascadaFiscal(
        valorFOB, valorFlete, valorSeguro, valorCIF,
        arancel, seguroTeorico, fundamentoLegal
      );
    } else {
      componentes = this.crearComponentesExentos(
        valorFOB, valorFlete, valorSeguro, valorCIF,
        categoria, seguroTeorico
      );
    }
    
    // ═══════════════════════════════════════════════════════
    // PASO 4: CALCULAR BOLETA DE PAGO CON RECARGOS
    // ═══════════════════════════════════════════════════════
    
    const fechaRegistro = opciones.fechaRegistro || new Date();
    const boletaPago = this.calcularBoletaPago(
      componentes.totalAPagar,
      fechaRegistro
    );
    
    // ═══════════════════════════════════════════════════════
    // PASO 5: CONSTRUIR OBJETO LIQUIDACIÓN
    // ═══════════════════════════════════════════════════════
    
    const restricciones = opciones.restricciones || [];
    const tieneRestricciones = restricciones.length > 0;
    const requiereRevision = tieneRestricciones || 
                             arancel.hsCode === '9999.99.99' ||
                             categoria === 'D';
    
    const liquidacion: ResultadoLiquidacionSIGA = {
      id: this.generarId(),
      numeroGuia: paquete.trackingNumber,
      manifiestoId,
      
      categoriaAduanera: categoria,
      categoriaDescripcion: categoriaDesc,
      
      valorFOB: componentes.valorFOB,
      valorFlete: componentes.valorFlete,
      valorSeguro: componentes.valorSeguro,
      valorCIF: componentes.valorCIF,
      monedaOriginal: 'USD',
      tipoCambio: 1.0,
      
      hsCode: arancel.hsCode,
      descripcionArancelaria: arancel.descripcion,
      
      percentDAI: componentes.tasaDAI,
      percentISC: componentes.tasaISC,
      percentITBMS: componentes.tasaITBMS,
      
      montoDAI: componentes.montoDAI,
      baseISC: componentes.baseISC,
      montoISC: componentes.montoISC,
      baseITBMS: componentes.baseITBMS,
      montoITBMS: componentes.montoITBMS,
      
      tasaAduanera: componentes.tasaSistema,
      tasasAdicionales: 0,
      
      totalTributos: componentes.subtotalTributos,
      totalAPagar: boletaPago.montoActual,
      
      estado: requiereRevision ? 'pendiente_revision' : 'calculada',
      tieneRestricciones,
      restricciones,
      
      observaciones: this.generarObservaciones(componentes, boletaPago, arancel),
      requiereRevisionManual: requiereRevision,
      motivoRevisionManual: requiereRevision 
        ? this.obtenerMotivoRevision(tieneRestricciones, arancel, categoria)
        : undefined,
      
      calculadaPor: 'MotorLiquidacionSIGA',
      fechaCalculo: new Date().toISOString(),
      
      seguroTeorico,
      fundamentoLegal,
      
      version: 2,
      
      // Extensiones SIGA
      componentes: {
        ...componentes,
        incoterm: opciones.incoterm,
        incotermInfo,
      },
      boletaPago
    };
    
    devLog(`[SIGA] ${paquete.trackingNumber}: CIF=${valorCIF}, Total=${boletaPago.montoActual} (${boletaPago.estadoMora})`);
    
    return liquidacion;
  }
  
  /**
   * Calcula cascada fiscal completa para Categoría C
   */
  private static calcularCascadaFiscal(
    valorFOB: number,
    valorFlete: number,
    valorSeguro: number,
    valorCIF: number,
    arancel: Arancel,
    seguroTeorico: boolean,
    fundamentoLegal?: string
  ): ComponentesLiquidacionSIGA {
    const redondear = (v: number) => Math.round(v * 100) / 100;
    
    // DAI (Derecho Arancelario de Importación)
    const baseDAI = valorCIF;
    const tasaDAI = arancel.daiPercent;
    const montoDAI = redondear(baseDAI * (tasaDAI / 100));
    
    // ISC (Impuesto Selectivo al Consumo)
    const baseISC = valorCIF + montoDAI;
    const tasaISC = arancel.iscPercent;
    const montoISC = redondear(baseISC * (tasaISC / 100));
    
    // ITBMS (7% estándar)
    const baseITBMS = valorCIF + montoDAI + montoISC;
    const tasaITBMS = SIGA.ITBMS_STANDARD;
    const montoITBMS = redondear(baseITBMS * (tasaITBMS / 100));
    
    // Tasas fijas
    const tasaSistema = SIGA.TASA_SISTEMA;
    const tasaFormulario = 0; // Solo aplica en despacho formal
    
    // Totales
    const subtotalTributos = redondear(montoDAI + montoISC + montoITBMS);
    const subtotalTasas = redondear(tasaSistema + tasaFormulario);
    const totalAPagar = redondear(subtotalTributos + subtotalTasas);
    
    return {
      valorFOB,
      valorFlete,
      valorSeguro,
      valorCIF,
      baseDAI,
      tasaDAI,
      montoDAI,
      baseISC,
      tasaISC,
      montoISC,
      baseITBMS,
      tasaITBMS,
      montoITBMS,
      tasaSistema,
      tasaFormulario,
      subtotalTributos,
      subtotalTasas,
      totalAPagar,
      seguroTeorico,
      fundamentoLegal
    };
  }
  
  /**
   * Crea componentes para categorías exentas (A, B, D)
   */
  private static crearComponentesExentos(
    valorFOB: number,
    valorFlete: number,
    valorSeguro: number,
    valorCIF: number,
    categoria: CategoriaAduanera,
    seguroTeorico: boolean
  ): ComponentesLiquidacionSIGA {
    const tasaSistema = categoria === 'B' ? SIGA.TASA_SISTEMA : 0;
    
    return {
      valorFOB,
      valorFlete,
      valorSeguro,
      valorCIF,
      baseDAI: 0,
      tasaDAI: 0,
      montoDAI: 0,
      baseISC: 0,
      tasaISC: 0,
      montoISC: 0,
      baseITBMS: 0,
      tasaITBMS: 0,
      montoITBMS: 0,
      tasaSistema,
      tasaFormulario: 0,
      subtotalTributos: 0,
      subtotalTasas: tasaSistema,
      totalAPagar: tasaSistema,
      seguroTeorico,
      fundamentoLegal: categoria === 'A' 
        ? 'Exento - Documentos sin valor comercial'
        : categoria === 'B'
          ? 'De Minimis - Exento tributos (Res. 049-2025)'
          : 'Alto Valor - Requiere corredor aduanero'
    };
  }
  
  /**
   * Calcula boleta de pago con recargos automáticos
   */
  private static calcularBoletaPago(
    montoBase: number,
    fechaRegistro: Date
  ): ResultadoLiquidacionSIGA['boletaPago'] {
    const redondear = (v: number) => Math.round(v * 100) / 100;
    const ahora = new Date();
    
    // Fecha vencimiento: 5 días hábiles después del registro
    const fechaVencimiento = new Date(fechaRegistro);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + SIGA.RECARGO_1_DIAS);
    
    // Fecha recargo 1: Después de vencimiento hasta día 8
    const fechaRecargo1 = new Date(fechaVencimiento);
    fechaRecargo1.setDate(fechaRecargo1.getDate() + 1);
    
    // Fecha recargo 2: Después de día 8
    const fechaRecargo2 = new Date(fechaRegistro);
    fechaRecargo2.setDate(fechaRecargo2.getDate() + SIGA.RECARGO_2_DIAS + 1);
    
    // Montos con recargos
    const montoNormal = montoBase;
    const montoRecargo1 = redondear(montoBase * (1 + SIGA.RECARGO_1_PORCENTAJE / 100));
    const montoRecargo2 = redondear(montoBase * (1 + SIGA.RECARGO_2_PORCENTAJE / 100));
    
    // Determinar estado actual
    let estadoMora: 'vigente' | 'recargo_1' | 'recargo_2';
    let montoActual: number;
    
    if (ahora <= fechaVencimiento) {
      estadoMora = 'vigente';
      montoActual = montoNormal;
    } else if (ahora <= fechaRecargo2) {
      estadoMora = 'recargo_1';
      montoActual = montoRecargo1;
    } else {
      estadoMora = 'recargo_2';
      montoActual = montoRecargo2;
    }
    
    return {
      montoNormal,
      fechaVencimiento,
      montoRecargo1,
      fechaRecargo1,
      montoRecargo2,
      fechaRecargo2,
      montoActual,
      estadoMora
    };
  }
  
  /**
   * Clasifica categoría aduanera
   */
  private static clasificarCategoria(
    valorCIF: number,
    descripcion: string
  ): { categoria: CategoriaAduanera; descripcion: string } {
    // Categoría A: Documentos
    if (this.esDocumento(descripcion)) {
      return { categoria: 'A', descripcion: 'Documentos - Exento' };
    }
    
    // Categoría B: De Minimis (≤ $100.00 CIF)
    if (valorCIF <= SIGA.UMBRAL_DE_MINIMIS) {
      return { categoria: 'B', descripcion: `De Minimis (≤ $${SIGA.UMBRAL_DE_MINIMIS.toFixed(2)}) - Exento tributos` };
    }
    
    // Categoría D: Alto Valor (> $2,000.00) o mercancía restringida
    if (valorCIF > SIGA.UMBRAL_CORREDOR) {
      return { categoria: 'D', descripcion: `Alto Valor (> $${SIGA.UMBRAL_CORREDOR.toFixed(2)}) - Requiere Corredor` };
    }
    
    // Categoría C: Bajo Valor
    return { categoria: 'C', descripcion: 'Bajo Valor - Liquidación Simplificada' };
  }
  
  /**
   * Detecta si es documento
   */
  private static esDocumento(descripcion: string): boolean {
    const palabras = ['document', 'documento', 'paper', 'carta', 'letter', 
                      'contract', 'contrato', 'certificate', 'certificado',
                      'invoice only', 'correspondence'];
    const descLower = descripcion.toLowerCase();
    return palabras.some(p => descLower.includes(p));
  }
  
  /**
   * Genera observaciones automáticas
   */
  private static generarObservaciones(
    componentes: ComponentesLiquidacionSIGA,
    boletaPago: ResultadoLiquidacionSIGA['boletaPago'],
    arancel: Arancel
  ): string[] {
    const obs: string[] = [];
    
    if (componentes.seguroTeorico) {
      obs.push(`Seguro teórico aplicado (1%): $${componentes.valorSeguro.toFixed(2)}`);
    }
    
    if (arancel.hsCode === '9999.99.99') {
      obs.push('⚠️ Clasificación HTS pendiente - Tasas estándar aplicadas');
    }
    
    if (arancel.requiresPermiso) {
      obs.push(`📋 Requiere permiso de ${arancel.autoridad}`);
    }
    
    if (boletaPago.estadoMora !== 'vigente') {
      const recargo = boletaPago.estadoMora === 'recargo_1' 
        ? SIGA.RECARGO_1_PORCENTAJE 
        : SIGA.RECARGO_2_PORCENTAJE;
      obs.push(`🚨 Recargo ${recargo}% aplicado: $${boletaPago.montoNormal.toFixed(2)} → $${boletaPago.montoActual.toFixed(2)}`);
    }
    
    // Incoterms® 2020 observations
    if (componentes.incoterm) {
      obs.push(`📦 Incoterms® 2020: ${componentes.incoterm} (ICC)`);
    }
    if (componentes.incotermInfo?.ajustesAplicados) {
      obs.push(...componentes.incotermInfo.ajustesAplicados);
    }
    if (componentes.incotermInfo?.zodAlertasRequeridas) {
      obs.push(...componentes.incotermInfo.zodAlertasRequeridas.map(a => `⚠️ ${a}`));
    }
    
    return obs;
  }
  
  /**
   * Obtiene motivo de revisión
   */
  private static obtenerMotivoRevision(
    tieneRestricciones: boolean,
    arancel: Arancel,
    categoria: CategoriaAduanera
  ): string {
    if (categoria === 'D') return 'Requiere corredor aduanero (Alto Valor)';
    if (tieneRestricciones) return 'Producto con restricciones regulatorias';
    if (arancel.hsCode === '9999.99.99') return 'Clasificación HTS pendiente';
    return 'Revisión manual requerida';
  }
  
  /**
   * Genera ID único
   */
  private static generarId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
    return `liq_${timestamp}_${random}`;
  }
  
  /**
   * Procesa lote completo
   */
  static procesarLote(
    paquetes: ManifestRow[],
    aranceles: Map<string, Arancel>,
    manifiestoId: string,
    opciones: {
      restricciones?: Map<string, RestriccionDetectada[]>;
      fechaRegistro?: Date;
    } = {}
  ): {
    liquidaciones: ResultadoLiquidacionSIGA[];
    resumen: {
      totalPaquetes: number;
      totalCIF: number;
      totalTributos: number;
      totalAPagar: number;
      porCategoria: Record<CategoriaAduanera, { cantidad: number; valor: number }>;
      conRecargo: number;
    };
  } {
    const liquidaciones: ResultadoLiquidacionSIGA[] = [];
    let totalCIF = 0;
    let totalTributos = 0;
    let totalAPagar = 0;
    let conRecargo = 0;
    
    const porCategoria: Record<CategoriaAduanera, { cantidad: number; valor: number }> = {
      'A': { cantidad: 0, valor: 0 },
      'B': { cantidad: 0, valor: 0 },
      'C': { cantidad: 0, valor: 0 },
      'D': { cantidad: 0, valor: 0 }
    };
    
    for (const paquete of paquetes) {
      const arancel = aranceles.get(paquete.trackingNumber) || {
        hsCode: '9999.99.99',
        descripcion: 'Clasificación pendiente',
        daiPercent: 15,
        iscPercent: 0,
        itbmsPercent: 7,
        requiresPermiso: false,
        categoria: 'General',
        unidad: 'unidad'
      };
      
      const restricciones = opciones.restricciones?.get(paquete.trackingNumber);
      
      const liquidacion = this.calcularLiquidacion(paquete, arancel, manifiestoId, {
        restricciones,
        fechaRegistro: opciones.fechaRegistro
      });
      
      liquidaciones.push(liquidacion);
      
      totalCIF += liquidacion.valorCIF;
      totalTributos += liquidacion.totalTributos;
      totalAPagar += liquidacion.boletaPago.montoActual;
      
      porCategoria[liquidacion.categoriaAduanera].cantidad++;
      porCategoria[liquidacion.categoriaAduanera].valor += liquidacion.valorCIF;
      
      if (liquidacion.boletaPago.estadoMora !== 'vigente') {
        conRecargo++;
      }
    }
    
    return {
      liquidaciones,
      resumen: {
        totalPaquetes: paquetes.length,
        totalCIF: Math.round(totalCIF * 100) / 100,
        totalTributos: Math.round(totalTributos * 100) / 100,
        totalAPagar: Math.round(totalAPagar * 100) / 100,
        porCategoria,
        conRecargo
      }
    };
  }
  
  /**
   * Verifica que el cálculo cuadre con modelo ANA
   * Ejemplo: B/. 56.66
   */
  static verificarContraModelo(
    liquidacion: ResultadoLiquidacionSIGA,
    montoEsperado: number,
    tolerancia: number = 0.01
  ): { coincide: boolean; diferencia: number; mensaje: string } {
    const diferencia = Math.abs(liquidacion.boletaPago.montoNormal - montoEsperado);
    const coincide = diferencia <= tolerancia;
    
    return {
      coincide,
      diferencia,
      mensaje: coincide
        ? `✓ Liquidación cuadra con modelo ANA: B/. ${liquidacion.boletaPago.montoNormal.toFixed(2)}`
        : `✗ Diferencia de B/. ${diferencia.toFixed(4)} (Esperado: ${montoEsperado}, Calculado: ${liquidacion.boletaPago.montoNormal.toFixed(2)})`
    };
  }
}

export default MotorLiquidacionSIGA;
