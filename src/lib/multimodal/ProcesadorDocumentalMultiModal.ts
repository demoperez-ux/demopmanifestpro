// ============================================
// PROCESADOR DOCUMENTAL MULTI-MODAL
// IPL Group - Carga Pesada: Marítimo, Terrestre, Aéreo
// ============================================

import { ModoTransporte, ZonaAduanera, TipoContenedor } from '@/types/transporte';
import { devLog, devWarn } from '@/lib/logger';

// ============================================
// INTERFACES DOCUMENTALES
// ============================================

export interface ContenedorExtraido {
  numero: string;               // MSCU1234567
  tipo: TipoContenedor;
  sello: string;
  pesoNeto: number;
  pesoBruto: number;
  teus: number;
  items: number;
}

export interface VehiculoTerrestre {
  placa: string;
  placaRemolque?: string;
  tipoCarga: 'furgon' | 'plataforma' | 'cisterna' | 'refrigerado';
  conductor: string;
  licencia: string;
  sellosAduaneros: string[];
}

export interface DocumentoTransporte {
  tipo: 'BL' | 'CPIC' | 'AWB';
  numero: string;
  modo: ModoTransporte;
  fechaEmision: Date;
  origen: string;
  destino: string;
  transportista: string;
  contenedores?: ContenedorExtraido[];
  vehiculo?: VehiculoTerrestre;
  totalBultos: number;
  pesoTotal: number;
  valorDeclarado: number;
}

export interface FacturaComercial {
  numero: string;
  proveedor: string;
  moneda: 'USD' | 'EUR' | 'PAB';
  valorTotal: number;
  items: FacturaItem[];
  paisOrigen: string;
  incoterm: 'EXW' | 'FOB' | 'CIF' | 'DDP' | 'DAP';
  certificadoOrigen?: CertificadoOrigen;
}

export interface FacturaItem {
  descripcion: string;
  cantidad: number;
  unidad: string;
  valorUnitario: number;
  valorTotal: number;
  hsCode?: string;
  paisOrigen?: string;
  pesoNeto?: number;
  pesoBruto?: number;
}

export interface CertificadoOrigen {
  numero: string;
  tratado: TratadoComercial;
  paisExportador: string;
  fechaEmision: Date;
  fechaVencimiento?: Date;
  productoCalifica: boolean;
}

export type TratadoComercial = 
  | 'TLC_EEUU'           // TLC Panamá - Estados Unidos
  | 'TLC_CA'             // TLC Centroamérica
  | 'TLC_UE'             // Acuerdo de Asociación UE
  | 'TLC_TAIWAN'         // TLC Taiwán
  | 'TLC_CHILE'          // TLC Chile
  | 'TLC_PERU'           // TLC Perú
  | 'TLC_CANADA'         // TLC Canadá
  | 'TLC_MEXICO'         // TLC México
  | 'SGP'                // Sistema Generalizado de Preferencias
  | 'NINGUNO';

export interface ListaEmpaque {
  numero: string;
  facturaReferencia: string;
  bultos: BultoEmpaque[];
  pesoNetoTotal: number;
  pesoBrutoTotal: number;
  volumenTotal?: number;
}

export interface BultoEmpaque {
  numero: number;
  tipo: 'caja' | 'pallet' | 'bolsa' | 'tambor' | 'granel';
  contenido: string;
  pesoNeto: number;
  pesoBruto: number;
  dimensiones?: { largo: number; ancho: number; alto: number };
}

// ============================================
// RESULTADO DE TRIANGULACIÓN
// ============================================

export interface ResultadoTriangulacion {
  esConsistente: boolean;
  confianza: number;
  discrepancias: DiscrepanciaDocumental[];
  documentosAnalizados: {
    transporte: boolean;
    factura: boolean;
    listaEmpaque: boolean;
  };
  resumenConsolidado: {
    totalBultos: number;
    pesoNetoTotal: number;
    pesoBrutoTotal: number;
    valorTotal: number;
    contenedores: number;
    items: number;
  };
}

export interface DiscrepanciaDocumental {
  tipo: 'peso' | 'cantidad' | 'valor' | 'descripcion' | 'hs_code';
  severidad: 'critica' | 'alta' | 'media' | 'baja';
  campo: string;
  valorDocumento1: string | number;
  valorDocumento2: string | number;
  documento1: string;
  documento2: string;
  mensaje: string;
  accionRequerida: string;
}

// ============================================
// PATRONES DE EXTRACCIÓN
// ============================================

const PATRON_CONTENEDOR = /([A-Z]{4})\s*(\d{6,7})/gi;
const PATRON_SELLO = /SEAL[:\s]*([A-Z0-9-]+)/gi;
const PATRON_BL = /([A-Z]{4}[\w]*\d{8,})/gi;
const PATRON_PLACA_PA = /([A-Z0-9]{2,3})-?(\d{4,6})/gi;
const PATRON_GTIN = /(\d{8,14})/g;

// ============================================
// PROCESADOR PRINCIPAL
// ============================================

export class ProcesadorDocumentalMultiModal {

  /**
   * Extrae contenedores de texto de B/L
   */
  static extraerContenedores(texto: string): ContenedorExtraido[] {
    const contenedores: ContenedorExtraido[] = [];
    const matches = texto.matchAll(PATRON_CONTENEDOR);
    
    for (const match of matches) {
      const numero = `${match[1]}${match[2]}`;
      
      // Detectar tipo de contenedor del contexto
      const tipo = this.detectarTipoContenedor(texto, numero);
      
      // Buscar sello asociado
      const selloMatch = texto.match(new RegExp(`${numero}[\\s\\S]{0,50}SEAL[:\\s]*([A-Z0-9-]+)`, 'i'));
      const sello = selloMatch ? selloMatch[1] : 'N/A';
      
      contenedores.push({
        numero,
        tipo,
        sello,
        pesoNeto: 0,
        pesoBruto: 0,
        teus: tipo.startsWith('40') ? 2 : 1,
        items: 0
      });
      
      devLog(`[MultiModal] Contenedor extraído: ${numero} (${tipo})`);
    }
    
    return contenedores;
  }

  /**
   * Detecta tipo de contenedor del contexto
   */
  private static detectarTipoContenedor(texto: string, numero: string): TipoContenedor {
    const contexto = texto.toLowerCase();
    
    if (contexto.includes('40hc') || contexto.includes('40\'hc') || contexto.includes('high cube')) return '40HC';
    if (contexto.includes('40rf') || contexto.includes('reefer 40')) return '40RF';
    if (contexto.includes('40st') || contexto.includes('40\' standard')) return '40ST';
    if (contexto.includes('20rf') || contexto.includes('reefer 20')) return '20RF';
    if (contexto.includes('flat rack') || contexto.includes('fr')) return '40FR';
    if (contexto.includes('open top') || contexto.includes('ot')) return '40OT';
    if (contexto.includes('40')) return '40ST';
    if (contexto.includes('20')) return '20ST';
    
    return '40HC'; // Default para carga general
  }

  /**
   * Extrae datos de vehículo terrestre (Carta de Porte)
   */
  static extraerVehiculo(texto: string): VehiculoTerrestre | null {
    const placaMatch = texto.match(/PLACA[:\s]*([A-Z0-9-]+)/i);
    if (!placaMatch) return null;
    
    const remolqueMatch = texto.match(/REMOLQUE[:\s]*([A-Z0-9-]+)/i);
    const conductorMatch = texto.match(/CONDUCTOR[:\s]*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)/i);
    const licenciaMatch = texto.match(/LICENCIA[:\s]*([A-Z0-9-]+)/i);
    
    // Extraer sellos aduaneros
    const sellos: string[] = [];
    const sellosMatches = texto.matchAll(/SELLO[:\s]*([A-Z0-9-]+)/gi);
    for (const m of sellosMatches) {
      sellos.push(m[1]);
    }
    
    // Detectar tipo de carga
    let tipoCarga: VehiculoTerrestre['tipoCarga'] = 'furgon';
    const textoLower = texto.toLowerCase();
    if (textoLower.includes('cisterna') || textoLower.includes('tanque')) tipoCarga = 'cisterna';
    if (textoLower.includes('refrigerado') || textoLower.includes('reefer')) tipoCarga = 'refrigerado';
    if (textoLower.includes('plataforma') || textoLower.includes('flatbed')) tipoCarga = 'plataforma';
    
    return {
      placa: placaMatch[1].toUpperCase(),
      placaRemolque: remolqueMatch ? remolqueMatch[1].toUpperCase() : undefined,
      tipoCarga,
      conductor: conductorMatch ? conductorMatch[1].trim() : 'N/A',
      licencia: licenciaMatch ? licenciaMatch[1] : 'N/A',
      sellosAduaneros: sellos
    };
  }

  /**
   * Detecta modo de transporte del documento
   */
  static detectarModoTransporte(texto: string): ModoTransporte {
    const textoLower = texto.toLowerCase();
    
    // Marítimo
    if (textoLower.includes('bill of lading') || 
        textoLower.includes('b/l') ||
        textoLower.includes('conocimiento de embarque') ||
        textoLower.includes('naviera') ||
        textoLower.includes('buque') ||
        textoLower.includes('puerto')) {
      return 'maritimo';
    }
    
    // Terrestre
    if (textoLower.includes('carta de porte') ||
        textoLower.includes('cpic') ||
        textoLower.includes('paso canoas') ||
        textoLower.includes('guabito') ||
        textoLower.includes('frontera') ||
        textoLower.includes('furgon') ||
        textoLower.includes('trailer')) {
      return 'terrestre';
    }
    
    // Aéreo (default si hay AWB)
    if (textoLower.includes('air waybill') ||
        textoLower.includes('awb') ||
        textoLower.includes('mawb') ||
        textoLower.includes('hawb')) {
      return 'aereo';
    }
    
    return 'aereo'; // Default
  }

  /**
   * Triangulación de datos entre documentos
   */
  static triangularDocumentos(
    transporte: DocumentoTransporte | null,
    factura: FacturaComercial | null,
    listaEmpaque: ListaEmpaque | null
  ): ResultadoTriangulacion {
    const discrepancias: DiscrepanciaDocumental[] = [];
    
    const documentosPresentes = {
      transporte: !!transporte,
      factura: !!factura,
      listaEmpaque: !!listaEmpaque
    };
    
    // Valores consolidados
    let pesoNetoTotal = 0;
    let pesoBrutoTotal = 0;
    let valorTotal = 0;
    let totalBultos = 0;
    let totalItems = 0;
    let contenedores = 0;
    
    // Extraer valores de cada documento
    if (transporte) {
      pesoBrutoTotal = transporte.pesoTotal;
      totalBultos = transporte.totalBultos;
      valorTotal = transporte.valorDeclarado;
      contenedores = transporte.contenedores?.length || 0;
    }
    
    if (factura) {
      totalItems = factura.items.length;
      const valorFactura = factura.valorTotal;
      
      // Comparar valor con transporte
      if (transporte && Math.abs(valorFactura - transporte.valorDeclarado) > 1) {
        const diferenciaPorcentaje = Math.abs(valorFactura - transporte.valorDeclarado) / valorFactura * 100;
        
        discrepancias.push({
          tipo: 'valor',
          severidad: diferenciaPorcentaje > 10 ? 'critica' : 'media',
          campo: 'valorDeclarado',
          valorDocumento1: transporte.valorDeclarado,
          valorDocumento2: valorFactura,
          documento1: 'Documento de Transporte',
          documento2: 'Factura Comercial',
          mensaje: `Diferencia de ${diferenciaPorcentaje.toFixed(1)}% en valor declarado`,
          accionRequerida: 'Verificar factura comercial y documento de transporte'
        });
      }
      
      // Calcular peso de factura
      const pesoFactura = factura.items.reduce((sum, item) => sum + (item.pesoBruto || 0), 0);
      if (pesoFactura > 0) {
        pesoNetoTotal = factura.items.reduce((sum, item) => sum + (item.pesoNeto || 0), 0);
      }
    }
    
    if (listaEmpaque) {
      // Comparar peso con transporte
      if (transporte && Math.abs(listaEmpaque.pesoBrutoTotal - transporte.pesoTotal) > 1) {
        const diferenciaPeso = Math.abs(listaEmpaque.pesoBrutoTotal - transporte.pesoTotal);
        
        discrepancias.push({
          tipo: 'peso',
          severidad: diferenciaPeso > transporte.pesoTotal * 0.05 ? 'alta' : 'media',
          campo: 'pesoBruto',
          valorDocumento1: transporte.pesoTotal,
          valorDocumento2: listaEmpaque.pesoBrutoTotal,
          documento1: 'Documento de Transporte',
          documento2: 'Lista de Empaque',
          mensaje: `Diferencia de ${diferenciaPeso.toFixed(2)} kg en peso bruto`,
          accionRequerida: 'Verificar pesos en lista de empaque'
        });
      }
      
      // Comparar bultos
      if (transporte && listaEmpaque.bultos.length !== transporte.totalBultos) {
        discrepancias.push({
          tipo: 'cantidad',
          severidad: 'alta',
          campo: 'bultos',
          valorDocumento1: transporte.totalBultos,
          valorDocumento2: listaEmpaque.bultos.length,
          documento1: 'Documento de Transporte',
          documento2: 'Lista de Empaque',
          mensaje: `Diferencia en cantidad de bultos`,
          accionRequerida: 'Recontar bultos físicamente'
        });
      }
      
      pesoNetoTotal = listaEmpaque.pesoNetoTotal;
      pesoBrutoTotal = listaEmpaque.pesoBrutoTotal;
      totalBultos = listaEmpaque.bultos.length;
    }
    
    // Calcular confianza
    const totalDiscrepancias = discrepancias.length;
    const discrepanciasCriticas = discrepancias.filter(d => d.severidad === 'critica').length;
    
    let confianza = 100;
    confianza -= discrepanciasCriticas * 25;
    confianza -= (totalDiscrepancias - discrepanciasCriticas) * 10;
    confianza = Math.max(0, confianza);
    
    devLog(`[Triangulación] Confianza: ${confianza}%, Discrepancias: ${totalDiscrepancias}`);
    
    return {
      esConsistente: discrepanciasCriticas === 0 && totalDiscrepancias < 3,
      confianza,
      discrepancias,
      documentosAnalizados: documentosPresentes,
      resumenConsolidado: {
        totalBultos,
        pesoNetoTotal,
        pesoBrutoTotal,
        valorTotal,
        contenedores,
        items: totalItems
      }
    };
  }

  /**
   * Extrae códigos GTIN del texto
   */
  static extraerGTINs(texto: string): string[] {
    const matches = texto.match(PATRON_GTIN) || [];
    return matches.filter(m => m.length >= 8 && m.length <= 14);
  }

  /**
   * Valida número de contenedor (ISO 6346)
   */
  static validarNumeroContenedor(numero: string): boolean {
    if (numero.length !== 11) return false;
    
    const letras = numero.substring(0, 4);
    const digitos = numero.substring(4, 10);
    const verificador = numero.charAt(10);
    
    // Validar formato
    if (!/^[A-Z]{4}$/.test(letras)) return false;
    if (!/^\d{6}$/.test(digitos)) return false;
    if (!/^\d$/.test(verificador)) return false;
    
    // TODO: Validar dígito verificador según ISO 6346
    return true;
  }

  /**
   * Procesa documento completo
   */
  static async procesarDocumento(
    contenido: string,
    tipo: 'transporte' | 'factura' | 'lista_empaque'
  ): Promise<{
    modo: ModoTransporte;
    contenedores: ContenedorExtraido[];
    vehiculo: VehiculoTerrestre | null;
    gtins: string[];
  }> {
    const modo = this.detectarModoTransporte(contenido);
    const contenedores = modo === 'maritimo' ? this.extraerContenedores(contenido) : [];
    const vehiculo = modo === 'terrestre' ? this.extraerVehiculo(contenido) : null;
    const gtins = this.extraerGTINs(contenido);
    
    devLog(`[MultiModal] Documento procesado: modo=${modo}, contenedores=${contenedores.length}, GTINs=${gtins.length}`);
    
    return { modo, contenedores, vehiculo, gtins };
  }
}

export default ProcesadorDocumentalMultiModal;
