// ============================================
// FORMATO OFICIAL DECLARACIÓN ADUANERA PANAMÁ
// Compatible con Sistema SIGA - ANA
// Resolución 049-2025
// ============================================

// ============================================
// CABECERA DE DECLARACIÓN
// ============================================
export interface CabeceraDeclaracion {
  declaracion_numero: string;          // Formato: DE{año}{mes}{día}{secuencial}-{digito_control}
  fecha_registro: string;              // Formato: YYYY-MM-DD
  tipo_operacion: TipoOperacion;
  tipo_despacho: TipoDespacho;
  aduana_entrada: AduanaEntrada;
  via_transporte: ViaTransporte;
}

export type TipoOperacion = 
  | 'Importación Directa del Exterior'
  | 'Importación por Courier'
  | 'Importación Temporal'
  | 'Reimportación';

export type TipoDespacho = 
  | 'Normal'
  | 'Anticipado'
  | 'Urgente'
  | 'Diferido';

export type AduanaEntrada = 
  | 'AEROPUERTO CARGA TOCUMEN'
  | 'ZONA LIBRE DE COLON'
  | 'MUELLE FISCAL BALBOA'
  | 'MUELLE FISCAL CRISTOBAL'
  | 'PASO CANOAS'
  | 'GUABITO';

export type ViaTransporte = 
  | 'Aereo'
  | 'Maritimo'
  | 'Terrestre'
  | 'Multimodal';

// ============================================
// SUJETOS INTERVINIENTES
// ============================================
export interface SujetosIntervinientes {
  importador: Importador;
  corredor_aduana?: CorredorAduana;
  agente_carga?: AgenteCarga;
}

export interface Importador {
  nombre: string;
  identificacion: string;           // Formato: X-XXX-XXXX o RUC
  tipo_persona: TipoPersona;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export type TipoPersona = 
  | 'Persona Natural'
  | 'Persona Jurídica';

export interface CorredorAduana {
  codigo: string;                   // Código del corredor ante ANA
  nombre: string;
  licencia?: string;
  firma_digital?: string;           // Hash SHA-256 de firma
  fecha_firma?: string;
}

export interface AgenteCarga {
  codigo: string;
  nombre: string;
  mawb: string;
}

// ============================================
// DETALLE DE MERCANCÍA
// ============================================
export interface DetalleMercancia {
  item: number;
  fraccion_arancelaria: string;     // 12 dígitos: XXXXXXXXXXXX
  descripcion_comercial: string;
  descripcion_arancelaria?: string;
  pais_origen?: string;
  marca?: string;
  modelo?: string;
  
  // Valores
  valor_fob: number;
  flete: number;
  seguro: number;
  valor_cif: number;
  otros_gastos?: number;
  
  // Peso y Unidades
  peso_bruto_kgs: number;
  peso_neto_kgs?: number;
  cantidad_unidades?: number;
  unidad_medida?: string;
  
  // Impuestos
  impuestos: ImpuestosMercancia;
  
  // Restricciones detectadas
  restricciones?: RestriccionMercancia[];
  
  // Categoría según Res. 049-2025
  categoria_aduanera?: 'A' | 'B' | 'C' | 'D';
}

export interface ImpuestosMercancia {
  dai_tasa: number;                 // % Derecho Arancelario de Importación
  dai_monto: number;
  isc_tasa?: number;                // % Impuesto Selectivo al Consumo
  isc_monto?: number;
  itbms_tasa: number;               // 7% standard
  itbms_monto: number;
  otros_impuestos?: number;
  total_impuestos?: number;
}

export interface RestriccionMercancia {
  autoridad: 'MINSA' | 'APA' | 'MIDA' | 'ACODECO' | 'ANA-DPFA' | 'ANAM';
  tipo: string;
  descripcion: string;
  requiere_permiso: boolean;
  capitulo_sa?: string;
}

// ============================================
// BOLETA DE PAGO Y RESUMEN
// ============================================
export interface BoletaPagoResumen {
  total_liquidado: number;
  total_impuestos: number;
  tasa_siga: number;                // $3.00 standard
  tasa_formulario: number;          // $5.00 standard
  otros_cargos?: number;
  
  vencimiento_escenarios: EscenariosPago;
}

export interface EscenariosPago {
  normal: EscenarioPago;
  recargo_1: EscenarioPago;         // +10% después de vencimiento
  recargo_2: EscenarioPago;         // +20% después de 8 días
}

export interface EscenarioPago {
  monto: number;
  hasta?: string;                   // Fecha límite
  desde?: string;                   // Fecha desde
}

// ============================================
// DECLARACIÓN COMPLETA
// ============================================
export interface DeclaracionOficial {
  cabecera_declaracion: CabeceraDeclaracion;
  sujetos_intervinientes: SujetosIntervinientes;
  detalle_mercancia: DetalleMercancia[];
  boleta_pago_resumen: BoletaPagoResumen;
  
  // Metadatos del sistema
  metadata?: DeclaracionMetadata;
}

export interface DeclaracionMetadata {
  version: string;
  generado_por: string;
  fecha_generacion: string;
  hash_integridad?: string;
  firma_corredor?: FirmaDigital;
}

export interface FirmaDigital {
  hash_sha256: string;
  fecha_firma: string;
  corredor_id: string;
  corredor_nombre: string;
  ip_origen?: string;
  dispositivo?: string;
}

// ============================================
// CONSTANTES DEL SISTEMA
// ============================================
export const CONSTANTES_DECLARACION = {
  TASA_SIGA: 3.00,
  TASA_FORMULARIO: 5.00,
  ITBMS_STANDARD: 7.00,
  SEGURO_TEORICO_PERCENT: 1.00,  // 1% del FOB si no se declara
  
  // Umbrales según Res. 049-2025
  UMBRAL_DE_MINIMIS: 100.00,
  UMBRAL_CORREDOR_OBLIGATORIO: 2000.00,
  
  // Recargos por mora
  RECARGO_1_PERCENT: 10,
  RECARGO_1_DIAS: 5,
  RECARGO_2_PERCENT: 20,
  RECARGO_2_DIAS: 8,
  
  // Aduanas de entrada
  ADUANAS: {
    TOCUMEN: 'AEROPUERTO CARGA TOCUMEN',
    ZLC: 'ZONA LIBRE DE COLON',
    BALBOA: 'MUELLE FISCAL BALBOA',
    CRISTOBAL: 'MUELLE FISCAL CRISTOBAL',
    PASO_CANOAS: 'PASO CANOAS',
    GUABITO: 'GUABITO'
  } as const,
  
  // Autoridades reguladoras por capítulo SA
  AUTORIDADES_POR_CAPITULO: {
    // MINSA - Farmacias y Drogas
    '30': { autoridad: 'MINSA', descripcion: 'Productos farmacéuticos' },
    '33': { autoridad: 'MINSA', descripcion: 'Aceites esenciales y cosméticos' },
    '90': { autoridad: 'MINSA', descripcion: 'Instrumentos médicos y ópticos' },
    
    // APA/MIDA - Alimentos y Agro
    '01': { autoridad: 'APA', descripcion: 'Animales vivos' },
    '02': { autoridad: 'APA', descripcion: 'Carne y despojos' },
    '03': { autoridad: 'APA', descripcion: 'Pescados y mariscos' },
    '04': { autoridad: 'APA', descripcion: 'Leche y productos lácteos' },
    '05': { autoridad: 'APA', descripcion: 'Productos de origen animal' },
    '06': { autoridad: 'MIDA', descripcion: 'Plantas vivas' },
    '07': { autoridad: 'MIDA', descripcion: 'Hortalizas' },
    '08': { autoridad: 'MIDA', descripcion: 'Frutas' },
    '09': { autoridad: 'MIDA', descripcion: 'Café, té y especias' },
    '10': { autoridad: 'MIDA', descripcion: 'Cereales' },
    '11': { autoridad: 'MIDA', descripcion: 'Molinería' },
    '12': { autoridad: 'MIDA', descripcion: 'Semillas oleaginosas' },
    '13': { autoridad: 'MIDA', descripcion: 'Gomas y resinas' },
    '14': { autoridad: 'MIDA', descripcion: 'Materias trenzables' },
    '15': { autoridad: 'APA', descripcion: 'Grasas y aceites' },
    '16': { autoridad: 'APA', descripcion: 'Preparaciones de carne' },
    '17': { autoridad: 'APA', descripcion: 'Azúcares' },
    '18': { autoridad: 'APA', descripcion: 'Cacao' },
    '19': { autoridad: 'APA', descripcion: 'Cereales preparados' },
    '20': { autoridad: 'APA', descripcion: 'Preparaciones de legumbres' },
    '21': { autoridad: 'APA', descripcion: 'Preparaciones alimenticias' },
    '22': { autoridad: 'APA', descripcion: 'Bebidas' },
    '23': { autoridad: 'APA', descripcion: 'Residuos industria alimentaria' },
    '24': { autoridad: 'APA', descripcion: 'Tabaco' },
    
    // ANA-DPFA - Químicos y precursores
    '28': { autoridad: 'ANA-DPFA', descripcion: 'Productos químicos inorgánicos' },
    '29': { autoridad: 'ANA-DPFA', descripcion: 'Productos químicos orgánicos' },
    
    // ACODECO - Normas técnicas
    '84': { autoridad: 'ACODECO', descripcion: 'Maquinaria y aparatos mecánicos' },
    '85': { autoridad: 'ACODECO', descripcion: 'Aparatos eléctricos' }
  } as const
};

// ============================================
// FUNCIONES UTILITARIAS
// ============================================

/**
 * Genera número de declaración en formato oficial
 * DE{año}{mes}{día}{secuencial}-{digito_control}
 */
export function generarNumeroDeclaracion(secuencial: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(secuencial).padStart(5, '0');
  
  // Calcular dígito de control (módulo 11)
  const base = `${year}${month}${day}${seq}`;
  let sum = 0;
  const weights = [2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2];
  for (let i = 0; i < base.length; i++) {
    sum += parseInt(base[base.length - 1 - i]) * weights[i % weights.length];
  }
  const control = 11 - (sum % 11);
  const digitoControl = control === 11 ? 0 : control === 10 ? 1 : control;
  
  return `DE${year}${month}${day}${seq}-${digitoControl}0`;
}

/**
 * Calcula fechas de vencimiento según normativa
 */
export function calcularVencimientos(fechaRegistro: Date): EscenariosPago {
  const normal = new Date(fechaRegistro);
  normal.setDate(normal.getDate() + 5);
  
  const recargo1 = new Date(normal);
  recargo1.setDate(recargo1.getDate() + 8);
  
  const recargo2 = new Date(recargo1);
  recargo2.setDate(recargo2.getDate() + 1);
  
  return {
    normal: {
      monto: 0, // Se calcula después
      hasta: normal.toISOString().split('T')[0]
    },
    recargo_1: {
      monto: 0,
      hasta: recargo1.toISOString().split('T')[0]
    },
    recargo_2: {
      monto: 0,
      desde: recargo2.toISOString().split('T')[0]
    }
  };
}

/**
 * Detecta autoridad reguladora por código SA
 */
export function detectarAutoridadPorCapitulo(hsCode: string): RestriccionMercancia | null {
  if (!hsCode || hsCode.length < 2) return null;
  
  const capitulo = hsCode.substring(0, 2);
  const info = CONSTANTES_DECLARACION.AUTORIDADES_POR_CAPITULO[capitulo as keyof typeof CONSTANTES_DECLARACION.AUTORIDADES_POR_CAPITULO];
  
  if (!info) return null;
  
  return {
    autoridad: info.autoridad as RestriccionMercancia['autoridad'],
    tipo: 'Regulación por capítulo SA',
    descripcion: info.descripcion,
    requiere_permiso: true,
    capitulo_sa: capitulo
  };
}

/**
 * Formatea identificación panameña
 */
export function formatearIdentificacion(id: string): string {
  if (!id) return '';
  
  // Limpiar caracteres no numéricos excepto guiones
  const clean = id.replace(/[^0-9-]/g, '');
  
  // Si ya tiene formato correcto
  if (/^\d{1,2}-\d{1,4}-\d{1,6}$/.test(clean)) {
    return clean;
  }
  
  // Intentar formatear
  const digits = clean.replace(/-/g, '');
  if (digits.length >= 7) {
    const provincia = digits.substring(0, 1);
    const tomo = digits.substring(1, 4);
    const asiento = digits.substring(4);
    return `${provincia}-${tomo}-${asiento}`;
  }
  
  return id;
}