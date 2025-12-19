// ============================================
// CALCULADOR DE TARIFAS COMERCIALES
// Define estructura de costos y márgenes
// ============================================

/**
 * Configuración de tarifas comerciales
 */
export interface ConfiguracionTarifas {
  comisionTributos: number;      // % sobre tributos
  handlingFee: number;           // $ por paquete
  profitMargin: number;          // % sobre total
  minimoCobro: number;           // Mínimo por paquete
  descuentosVolumen: {
    cantidadMinima: number;
    porcentajeDescuento: number;
  }[];
}

/**
 * Tarifas por defecto para Panamá
 */
export const TARIFAS_PANAMA: ConfiguracionTarifas = {
  comisionTributos: 15.0,        // 15% sobre tributos
  handlingFee: 5.00,             // $5 por paquete
  profitMargin: 5.0,             // 5% profit
  minimoCobro: 10.00,            // Mínimo $10
  
  descuentosVolumen: [
    { cantidadMinima: 10, porcentajeDescuento: 5 },
    { cantidadMinima: 50, porcentajeDescuento: 10 },
    { cantidadMinima: 100, porcentajeDescuento: 15 }
  ]
};

/**
 * Resultado del cálculo de tarifa
 */
export interface ResultadoTarifa {
  valorCIF: number;
  tributos: number;
  comisionTributos: number;
  handlingFee: number;
  subtotal: number;
  profitMargin: number;
  descuentoVolumen: number;
  totalFinal: number;
  aplicoMinimoCobro: boolean;
  porcentajeDescuento: number;
}

/**
 * Calculador de tarifas al cliente
 */
export class CalculadorTarifas {
  
  /**
   * Calcula el total a cobrar al cliente
   */
  static calcularTotalCliente(
    valorCIF: number,
    totalTributos: number,
    cantidadPaquetesCliente: number = 1,
    config: ConfiguracionTarifas = TARIFAS_PANAMA
  ): ResultadoTarifa {
    
    // PASO 1: Costos base
    const tributos = totalTributos;
    
    // PASO 2: Cargos por servicio
    const comisionTributos = tributos * (config.comisionTributos / 100);
    const handlingFee = config.handlingFee;
    
    // PASO 3: Subtotal
    const subtotal = valorCIF + tributos + comisionTributos + handlingFee;
    
    // PASO 4: Profit margin
    const profitMargin = subtotal * (config.profitMargin / 100);
    
    // PASO 5: Descuento por volumen
    let porcentajeDescuento = 0;
    const descuentosOrdenados = [...config.descuentosVolumen]
      .sort((a, b) => b.cantidadMinima - a.cantidadMinima);
    
    for (const descuento of descuentosOrdenados) {
      if (cantidadPaquetesCliente >= descuento.cantidadMinima) {
        porcentajeDescuento = descuento.porcentajeDescuento;
        break;
      }
    }
    
    const descuentoVolumen = (subtotal + profitMargin) * (porcentajeDescuento / 100);
    
    // PASO 6: Total final
    let totalFinal = subtotal + profitMargin - descuentoVolumen;
    
    // Aplicar mínimo de cobro
    let aplicoMinimoCobro = false;
    if (totalFinal < config.minimoCobro) {
      totalFinal = config.minimoCobro;
      aplicoMinimoCobro = true;
    }
    
    // Redondear a 2 decimales
    const redondear = (n: number) => Math.round(n * 100) / 100;
    
    return {
      valorCIF: redondear(valorCIF),
      tributos: redondear(tributos),
      comisionTributos: redondear(comisionTributos),
      handlingFee: redondear(handlingFee),
      subtotal: redondear(subtotal),
      profitMargin: redondear(profitMargin),
      descuentoVolumen: redondear(descuentoVolumen),
      totalFinal: redondear(totalFinal),
      aplicoMinimoCobro,
      porcentajeDescuento
    };
  }
  
  /**
   * Calcula descuento por volumen aplicable
   */
  static calcularDescuentoVolumen(
    cantidadPaquetes: number,
    config: ConfiguracionTarifas = TARIFAS_PANAMA
  ): {
    aplicaDescuento: boolean;
    porcentaje: number;
    mensaje: string;
  } {
    const descuentosOrdenados = [...config.descuentosVolumen]
      .sort((a, b) => b.cantidadMinima - a.cantidadMinima);
    
    for (const descuento of descuentosOrdenados) {
      if (cantidadPaquetes >= descuento.cantidadMinima) {
        return {
          aplicaDescuento: true,
          porcentaje: descuento.porcentajeDescuento,
          mensaje: `✓ Descuento del ${descuento.porcentajeDescuento}% por ${cantidadPaquetes} paquetes`
        };
      }
    }
    
    const siguienteDescuento = config.descuentosVolumen[0];
    return {
      aplicaDescuento: false,
      porcentaje: 0,
      mensaje: `Próximo descuento: ${siguienteDescuento.porcentajeDescuento}% desde ${siguienteDescuento.cantidadMinima} paquetes`
    };
  }
}
