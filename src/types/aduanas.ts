// ============================================
// TIPOS PARA SISTEMA DE LIQUIDACIÓN ADUANERA
// Normativa: Autoridad Nacional de Aduanas (ANA) Panamá
// ============================================

// Categoría Aduanera según valor CIF
export type CategoriaAduanera = 'A' | 'B' | 'C' | 'D';

// Estados de liquidación
export type EstadoLiquidacion = 
  | 'pendiente_revision'
  | 'pendiente_hs_code'
  | 'calculada'
  | 'aprobada'
  | 'pagada'
  | 'liberada'
  | 'en_revision_manual';

// Tipo de restricción
export type TipoRestriccion = 
  | 'farmaceutico'
  | 'fitosanitario'
  | 'zoosanitario'
  | 'seguridad'
  | 'ambiental'
  | 'prohibido';

// ============================================
// ARANCEL (HS CODE)
// ============================================
export interface Arancel {
  hsCode: string; // Formato: XXXX.XX.XX
  descripcion: string;
  daiPercent: number; // Derecho Arancelario de Importación
  iscPercent: number; // Impuesto Selectivo al Consumo
  itbmsPercent: number; // ITBMS (7% standard)
  requiresPermiso: boolean;
  autoridad?: string; // AUPSA, MINSA, MIDA
  categoria: string;
  unidad?: string; // kg, unidad, litro
  notasAdicionales?: string;
}

// ============================================
// LIQUIDACIÓN ADUANERA
// ============================================
export interface Liquidacion {
  id: string;
  numeroGuia: string;
  manifiestoId: string;
  
  // Categoría Aduanera
  categoriaAduanera: CategoriaAduanera;
  categoriaDescripcion: string;
  
  // Valores Base
  valorFOB: number;
  valorFlete: number;
  valorSeguro: number;
  valorCIF: number;
  monedaOriginal: string;
  tipoCambio: number;
  
  // Clasificación Arancelaria
  hsCode?: string;
  descripcionArancelaria?: string;
  
  // Porcentajes Aplicables
  percentDAI: number;
  percentISC: number;
  percentITBMS: number;
  
  // Cálculos (Cascada Fiscal)
  montoDAI: number;
  baseISC: number;
  montoISC: number;
  baseITBMS: number;
  montoITBMS: number;
  
  // Tasas Adicionales
  tasaAduanera: number;
  tasasAdicionales: number;
  
  // Totales
  totalTributos: number;
  totalAPagar: number;
  
  // Estado
  estado: EstadoLiquidacion;
  
  // Restricciones
  tieneRestricciones: boolean;
  restricciones: RestriccionDetectada[];
  
  // Observaciones
  observaciones: string[];
  requiereRevisionManual: boolean;
  motivoRevisionManual?: string;
  
  // Auditoría
  calculadaPor: string;
  fechaCalculo: string;
  aprobadaPor?: string;
  fechaAprobacion?: string;
  
  // Transparencia (Corrección #6)
  seguroTeorico?: boolean;
  fundamentoLegal?: string;
  observacionesValoracion?: string[];
  
  // Tarifas comerciales (Corrección #9)
  comisionTributos?: number;
  handlingFee?: number;
  profitMargin?: number;
  descuentoVolumen?: number;
  porcentajeDescuento?: number;
  aplicoMinimoCobro?: boolean;
  
  // Metadata
  version: number;
}

// ============================================
// RESTRICCIÓN
// ============================================
export interface Restriccion {
  id: string;
  keyword: string;
  tipoRestriccion: TipoRestriccion;
  autoridad: string;
  requierePermiso: boolean;
  descripcion: string;
  activo: boolean;
}

export interface RestriccionDetectada {
  tipo: string;
  mensaje: string;
  autoridad: string;
}

// ============================================
// TIPO DE CAMBIO
// ============================================
export interface TipoCambio {
  fecha: string;
  moneda: string;
  tasa: number;
  fuente: string;
  oficial: boolean;
}

// ============================================
// FACTURA COMERCIAL
// ============================================
export interface FacturaComercial {
  id: string;
  numeroGuia: string;
  numeroFactura: string;
  valorFOB: number;
  valorFlete?: number;
  valorSeguro?: number;
  moneda: string;
  seguroTeorico: boolean;
  percentSeguroTeorico: number;
  paisOrigen: string;
  vendedor: string;
  fechaFactura: string;
  fechaCarga: string;
}

// ============================================
// RESUMEN DE LIQUIDACIÓN
// ============================================
export interface ResumenLiquidacion {
  totalPaquetes: number;
  totalValorCIF: number;
  totalTributos: number;
  totalAPagar: number;
  
  porCategoria: {
    A: { cantidad: number; valor: number };
    B: { cantidad: number; valor: number };
    C: { cantidad: number; valor: number };
    D: { cantidad: number; valor: number };
  };
  
  pendientesHSCode: number;
  conRestricciones: number;
  requierenRevision: number;
}

// ============================================
// CONFIGURACIÓN DE LIQUIDACIÓN
// ============================================
export interface ConfiguracionLiquidacion {
  tasaSeguroTeorico: number; // 1.5% default
  tasaAduaneraCourier: number; // $2.00 default
  umbralDeMinimis: number; // $100 default
  umbralCorredorObligatorio: number; // $2000 default
  itbmsDefault: number; // 7% default
}

export const DEFAULT_CONFIG_LIQUIDACION: ConfiguracionLiquidacion = {
  tasaSeguroTeorico: 1.5,
  tasaAduaneraCourier: 2.00,
  umbralDeMinimis: 100,
  umbralCorredorObligatorio: 2000,
  itbmsDefault: 7.0
};
