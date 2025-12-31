// ============================================
// MOTOR DE EXONERACIONES Y REGÍMENES ESPECIALES
// República de Panamá - ACP, ZLC, TLCs, Ley 37
// ============================================

import { devLog, devWarn } from '@/lib/logger';
import { TratadoComercial, CertificadoOrigen } from '@/lib/multimodal/ProcesadorDocumentalMultiModal';

// ============================================
// TIPOS DE BENEFICIO FISCAL
// ============================================

export type TipoBeneficioFiscal = 
  | 'ACP'                    // Autoridad del Canal de Panamá
  | 'ZLC'                    // Zona Libre de Colón
  | 'ZL_PANAMA_PACIFICO'     // Panamá Pacífico
  | 'ZL_BARUC'               // Zona Libre de Barú
  | 'CIUDAD_SABER'           // Ciudad del Saber
  | 'CONTRATO_LEY'           // Contrato-Ley con la Nación
  | 'TLC'                    // Tratado de Libre Comercio
  | 'LEY_37_ENERGIA_VERDE'   // Ley 37 - Energía Renovable
  | 'LEY_41_ZONAS_FRANCAS'   // Ley 41 - Zonas Francas
  | 'SEM'                    // Sede de Empresas Multinacionales
  | 'CALL_CENTER'            // Ley de Call Centers
  | 'TURISMO'                // Incentivos Turísticos
  | 'AGROPECUARIO';          // Incentivos Agropecuarios

export interface BeneficioFiscal {
  tipo: TipoBeneficioFiscal;
  nombre: string;
  leyBase: string;
  exencionDAI: boolean;
  exencionITBMS: boolean;
  exencionISC: boolean;
  porcentajeReduccion?: number;  // Si no es exención total
  requisitos: string[];
  documentosRequeridos: string[];
  vigenciaAnos?: number;
  hsCodesAplicables?: string[];  // Si aplica a HTS específicos
}

export interface ResultadoExoneracion {
  aplicaExoneracion: boolean;
  beneficios: BeneficioAplicado[];
  daiOriginal: number;
  daiExonerado: number;
  itbmsOriginal: number;
  itbmsExonerado: number;
  iscOriginal: number;
  iscExonerado: number;
  ahorro: number;
  documentosFaltantes: string[];
  advertencias: string[];
  fundamentoLegal: string;
}

export interface BeneficioAplicado {
  tipo: TipoBeneficioFiscal;
  nombre: string;
  montoExonerado: number;
  porcentajeExoneracion: number;
  fundamentoLegal: string;
}

// ============================================
// BASE DE DATOS DE BENEFICIOS FISCALES
// ============================================

const BENEFICIOS_FISCALES: Record<TipoBeneficioFiscal, BeneficioFiscal> = {
  ACP: {
    tipo: 'ACP',
    nombre: 'Autoridad del Canal de Panamá',
    leyBase: 'Ley Orgánica de la ACP (Ley 19 de 1997)',
    exencionDAI: true,
    exencionITBMS: true,
    exencionISC: true,
    requisitos: [
      'Importación directa a nombre de la ACP',
      'Uso exclusivo en operaciones del Canal',
      'Certificación de destino final'
    ],
    documentosRequeridos: [
      'Nota de la ACP autorizando importación',
      'Factura a nombre de la ACP',
      'Certificación de uso final'
    ]
  },
  ZLC: {
    tipo: 'ZLC',
    nombre: 'Zona Libre de Colón',
    leyBase: 'Decreto Ley 18 de 1948 y modificaciones',
    exencionDAI: true,
    exencionITBMS: true,
    exencionISC: true,
    requisitos: [
      'Empresa registrada en la ZLC',
      'Mercancía ingresa a depósito de ZLC',
      'No nacionalización inmediata'
    ],
    documentosRequeridos: [
      'Licencia de operación ZLC vigente',
      'Permiso de ingreso a zona franca'
    ]
  },
  ZL_PANAMA_PACIFICO: {
    tipo: 'ZL_PANAMA_PACIFICO',
    nombre: 'Área Económica Especial Panamá Pacífico',
    leyBase: 'Ley 41 de 2004',
    exencionDAI: true,
    exencionITBMS: true,
    exencionISC: true,
    requisitos: [
      'Empresa registrada en Panamá Pacífico',
      'Uso dentro del área especial'
    ],
    documentosRequeridos: [
      'Licencia de operación APP',
      'Contrato de arrendamiento en APP'
    ],
    vigenciaAnos: 25
  },
  CONTRATO_LEY: {
    tipo: 'CONTRATO_LEY',
    nombre: 'Contrato-Ley con la Nación',
    leyBase: 'Contratos específicos aprobados por ley',
    exencionDAI: true,
    exencionITBMS: true,
    exencionISC: true,
    requisitos: [
      'Contrato-Ley vigente',
      'Mercancía incluida en el contrato',
      'Período de exoneración no vencido'
    ],
    documentosRequeridos: [
      'Copia del Contrato-Ley',
      'Certificación de vigencia',
      'Lista de bienes autorizados'
    ]
  },
  TLC: {
    tipo: 'TLC',
    nombre: 'Tratado de Libre Comercio',
    leyBase: 'Tratados ratificados por Panamá',
    exencionDAI: true,
    exencionITBMS: false,
    exencionISC: false,
    requisitos: [
      'Certificado de Origen válido',
      'Producto originario según reglas del tratado',
      'Importación directa'
    ],
    documentosRequeridos: [
      'Certificado de Origen',
      'Factura Comercial',
      'B/L o AWB directo'
    ]
  },
  LEY_37_ENERGIA_VERDE: {
    tipo: 'LEY_37_ENERGIA_VERDE',
    nombre: 'Incentivos Energía Renovable',
    leyBase: 'Ley 37 de 2013',
    exencionDAI: true,
    exencionITBMS: true,
    exencionISC: true,
    requisitos: [
      'Equipos para generación de energía renovable',
      'Proyecto registrado ante la SNE',
      'Uso exclusivo en proyecto autorizado'
    ],
    documentosRequeridos: [
      'Registro del proyecto ante SNE',
      'Autorización de exoneración MEF',
      'Especificaciones técnicas'
    ],
    hsCodesAplicables: [
      '8541.40', // Células fotovoltaicas
      '8501.31', // Generadores fotovoltaicos
      '8501.32',
      '8501.33',
      '8501.34',
      '8504.40', // Inversores
      '8507.60', // Baterías de litio
      '8502.31', // Aerogeneradores
      '9032.89'  // Controladores de carga
    ]
  },
  LEY_41_ZONAS_FRANCAS: {
    tipo: 'LEY_41_ZONAS_FRANCAS',
    nombre: 'Zonas Francas',
    leyBase: 'Ley 32 de 2011',
    exencionDAI: true,
    exencionITBMS: true,
    exencionISC: true,
    requisitos: [
      'Operador de zona franca autorizado',
      'Mercancía para operaciones de zona'
    ],
    documentosRequeridos: [
      'Licencia de operador',
      'Autorización de ingreso'
    ],
    vigenciaAnos: 20
  },
  ZL_BARUC: {
    tipo: 'ZL_BARUC',
    nombre: 'Zona Libre de Barú',
    leyBase: 'Ley específica',
    exencionDAI: true,
    exencionITBMS: true,
    exencionISC: true,
    requisitos: ['Operación dentro de la zona'],
    documentosRequeridos: ['Licencia de operación']
  },
  CIUDAD_SABER: {
    tipo: 'CIUDAD_SABER',
    nombre: 'Ciudad del Saber',
    leyBase: 'Decreto Ejecutivo 59 de 1999',
    exencionDAI: true,
    exencionITBMS: true,
    exencionISC: false,
    requisitos: ['Afiliado a Ciudad del Saber'],
    documentosRequeridos: ['Certificado de afiliación vigente']
  },
  SEM: {
    tipo: 'SEM',
    nombre: 'Sede de Empresas Multinacionales',
    leyBase: 'Ley 41 de 2007',
    exencionDAI: true,
    exencionITBMS: true,
    exencionISC: false,
    requisitos: ['Licencia SEM vigente'],
    documentosRequeridos: ['Licencia SEM', 'Resolución de autorización']
  },
  CALL_CENTER: {
    tipo: 'CALL_CENTER',
    nombre: 'Incentivos Call Centers',
    leyBase: 'Ley 54 de 2001',
    exencionDAI: true,
    exencionITBMS: true,
    exencionISC: false,
    requisitos: ['Licencia de call center'],
    documentosRequeridos: ['Licencia', 'Lista de equipos autorizados']
  },
  TURISMO: {
    tipo: 'TURISMO',
    nombre: 'Incentivos Turísticos',
    leyBase: 'Ley 80 de 2012',
    exencionDAI: true,
    exencionITBMS: true,
    exencionISC: false,
    requisitos: ['Proyecto turístico registrado'],
    documentosRequeridos: ['Registro Nacional de Turismo', 'Resolución ATP']
  },
  AGROPECUARIO: {
    tipo: 'AGROPECUARIO',
    nombre: 'Incentivos Agropecuarios',
    leyBase: 'Ley 25 de 1996',
    exencionDAI: true,
    exencionITBMS: false,
    exencionISC: false,
    requisitos: ['Productor agropecuario registrado'],
    documentosRequeridos: ['Registro MIDA', 'Certificación de uso']
  }
};

// ============================================
// REGLAS DE TLC POR PAÍS
// ============================================

interface ReglaTLC {
  tratado: TratadoComercial;
  nombre: string;
  paisesOrigen: string[];
  fechaVigencia: string;
  requisitosOrigen: string[];
  reglaAcumulacion: boolean;
}

const REGLAS_TLC: Record<TratadoComercial, ReglaTLC> = {
  TLC_EEUU: {
    tratado: 'TLC_EEUU',
    nombre: 'TLC Panamá - Estados Unidos',
    paisesOrigen: ['US', 'USA', 'ESTADOS UNIDOS'],
    fechaVigencia: '2012-10-31',
    requisitosOrigen: [
      'Certificado de Origen TLC EEUU',
      'Cumplir regla de origen específica del producto',
      'Transporte directo (sin transbordo en terceros países)'
    ],
    reglaAcumulacion: true
  },
  TLC_CA: {
    tratado: 'TLC_CA',
    nombre: 'TLC Centroamérica',
    paisesOrigen: ['GT', 'SV', 'HN', 'NI', 'CR', 'GUATEMALA', 'EL SALVADOR', 'HONDURAS', 'NICARAGUA', 'COSTA RICA'],
    fechaVigencia: '2002-11-06',
    requisitosOrigen: [
      'Certificado de Origen CA-4',
      'Formulario aduanero único'
    ],
    reglaAcumulacion: true
  },
  TLC_UE: {
    tratado: 'TLC_UE',
    nombre: 'Acuerdo de Asociación UE-Centroamérica',
    paisesOrigen: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'ALEMANIA', 'FRANCIA', 'ITALIA', 'ESPAÑA'],
    fechaVigencia: '2013-08-01',
    requisitosOrigen: ['EUR.1 o Declaración en Factura'],
    reglaAcumulacion: true
  },
  TLC_TAIWAN: {
    tratado: 'TLC_TAIWAN',
    nombre: 'TLC Panamá - Taiwán',
    paisesOrigen: ['TW', 'TAIWAN'],
    fechaVigencia: '2004-01-01',
    requisitosOrigen: ['Certificado de Origen específico'],
    reglaAcumulacion: false
  },
  TLC_CHILE: {
    tratado: 'TLC_CHILE',
    nombre: 'TLC Panamá - Chile',
    paisesOrigen: ['CL', 'CHILE'],
    fechaVigencia: '2008-03-07',
    requisitosOrigen: ['Certificado de Origen'],
    reglaAcumulacion: false
  },
  TLC_PERU: {
    tratado: 'TLC_PERU',
    nombre: 'TLC Panamá - Perú',
    paisesOrigen: ['PE', 'PERU', 'PERÚ'],
    fechaVigencia: '2012-05-01',
    requisitosOrigen: ['Certificado de Origen'],
    reglaAcumulacion: false
  },
  TLC_CANADA: {
    tratado: 'TLC_CANADA',
    nombre: 'TLC Panamá - Canadá',
    paisesOrigen: ['CA', 'CANADA', 'CANADÁ'],
    fechaVigencia: '2013-04-01',
    requisitosOrigen: ['Certificado de Origen'],
    reglaAcumulacion: false
  },
  TLC_MEXICO: {
    tratado: 'TLC_MEXICO',
    nombre: 'TLC Panamá - México',
    paisesOrigen: ['MX', 'MEXICO', 'MÉXICO'],
    fechaVigencia: '2015-07-01',
    requisitosOrigen: ['Certificado de Origen'],
    reglaAcumulacion: false
  },
  SGP: {
    tratado: 'SGP',
    nombre: 'Sistema Generalizado de Preferencias',
    paisesOrigen: [],
    fechaVigencia: 'Permanente',
    requisitosOrigen: ['Certificado de Origen Forma A'],
    reglaAcumulacion: false
  },
  NINGUNO: {
    tratado: 'NINGUNO',
    nombre: 'Sin Tratado',
    paisesOrigen: [],
    fechaVigencia: '',
    requisitosOrigen: [],
    reglaAcumulacion: false
  }
};

// ============================================
// MOTOR PRINCIPAL
// ============================================

export class MotorExoneraciones {

  /**
   * Evalúa si aplica beneficio por Ley 37 (Energía Verde)
   */
  static evaluarLey37EnergiaVerde(hsCode: string, descripcion: string): {
    aplica: boolean;
    fundamentoLegal: string;
  } {
    const beneficio = BENEFICIOS_FISCALES.LEY_37_ENERGIA_VERDE;
    
    // Verificar HTS Code
    const hsCodeNormalizado = hsCode.replace(/\./g, '');
    const hts6 = hsCodeNormalizado.substring(0, 6);
    
    const codigosValidos = beneficio.hsCodesAplicables || [];
    const aplicaPorCodigo = codigosValidos.some(codigo => 
      hsCodeNormalizado.startsWith(codigo.replace(/\./g, ''))
    );
    
    // Verificar descripción
    const keywordsEnergia = [
      'panel solar', 'fotovoltaico', 'photovoltaic', 'solar panel',
      'inversor', 'inverter', 'aerogenerador', 'wind turbine',
      'bateria solar', 'solar battery', 'controlador carga', 'charge controller',
      'energia renovable', 'renewable energy', 'modulo solar'
    ];
    
    const descLower = descripcion.toLowerCase();
    const aplicaPorDescripcion = keywordsEnergia.some(kw => descLower.includes(kw));
    
    if (aplicaPorCodigo || aplicaPorDescripcion) {
      devLog(`[Exoneraciones] ✓ Aplica Ley 37 - Energía Verde para HTS ${hsCode}`);
      return {
        aplica: true,
        fundamentoLegal: 'Ley 37 de 2013 - Art. 7: Exoneración de impuestos de importación para equipos de energía renovable'
      };
    }
    
    return { aplica: false, fundamentoLegal: '' };
  }

  /**
   * Detecta TLC aplicable por país de origen
   */
  static detectarTLCAplicable(paisOrigen: string): TratadoComercial {
    const paisNormalizado = paisOrigen.toUpperCase().trim();
    
    for (const [tratado, regla] of Object.entries(REGLAS_TLC)) {
      if (regla.paisesOrigen.some(p => 
        paisNormalizado === p || paisNormalizado.includes(p)
      )) {
        devLog(`[Exoneraciones] TLC detectado: ${regla.nombre} para país ${paisOrigen}`);
        return tratado as TratadoComercial;
      }
    }
    
    return 'NINGUNO';
  }

  /**
   * Valida Certificado de Origen para TLC
   */
  static validarCertificadoOrigen(
    certificado: CertificadoOrigen,
    hsCode: string
  ): {
    esValido: boolean;
    aplicaDesgravacion: boolean;
    porcentajeDAI: number;
    advertencias: string[];
  } {
    const advertencias: string[] = [];
    
    // Verificar tratado
    const reglaTLC = REGLAS_TLC[certificado.tratado];
    if (!reglaTLC || certificado.tratado === 'NINGUNO') {
      return {
        esValido: false,
        aplicaDesgravacion: false,
        porcentajeDAI: 0,
        advertencias: ['Tratado no reconocido']
      };
    }
    
    // Verificar vencimiento
    if (certificado.fechaVencimiento && new Date(certificado.fechaVencimiento) < new Date()) {
      advertencias.push('Certificado de origen vencido');
      return {
        esValido: false,
        aplicaDesgravacion: false,
        porcentajeDAI: 0,
        advertencias
      };
    }
    
    // Verificar que producto califica
    if (!certificado.productoCalifica) {
      advertencias.push('Producto no califica según reglas de origen del tratado');
      return {
        esValido: true,
        aplicaDesgravacion: false,
        porcentajeDAI: 0,
        advertencias
      };
    }
    
    devLog(`[Exoneraciones] Certificado de Origen validado: ${reglaTLC.nombre}`);
    
    return {
      esValido: true,
      aplicaDesgravacion: true,
      porcentajeDAI: 0, // DAI = 0% por TLC
      advertencias
    };
  }

  /**
   * Evalúa exoneraciones aplicables
   */
  static evaluarExoneraciones(params: {
    hsCode: string;
    descripcion: string;
    valorCIF: number;
    paisOrigen: string;
    destinatario: string;
    proyecto?: string;
    zonaDestino?: string;
    certificadoOrigen?: CertificadoOrigen;
    daiPercent: number;
    itbmsPercent: number;
    iscPercent: number;
  }): ResultadoExoneracion {
    const beneficiosAplicados: BeneficioAplicado[] = [];
    const documentosFaltantes: string[] = [];
    const advertencias: string[] = [];
    
    let daiExonerado = 0;
    let itbmsExonerado = 0;
    let iscExonerado = 0;
    let fundamentoLegal = '';
    
    const daiOriginal = params.valorCIF * (params.daiPercent / 100);
    const itbmsOriginal = params.valorCIF * (params.itbmsPercent / 100);
    const iscOriginal = params.valorCIF * (params.iscPercent / 100);
    
    // 1. Verificar Ley 37 - Energía Verde
    const ley37 = this.evaluarLey37EnergiaVerde(params.hsCode, params.descripcion);
    if (ley37.aplica) {
      const beneficio = BENEFICIOS_FISCALES.LEY_37_ENERGIA_VERDE;
      
      daiExonerado = daiOriginal;
      itbmsExonerado = itbmsOriginal;
      fundamentoLegal = ley37.fundamentoLegal;
      
      beneficiosAplicados.push({
        tipo: 'LEY_37_ENERGIA_VERDE',
        nombre: beneficio.nombre,
        montoExonerado: daiExonerado + itbmsExonerado,
        porcentajeExoneracion: 100,
        fundamentoLegal: ley37.fundamentoLegal
      });
      
      // Documentos requeridos
      beneficio.documentosRequeridos.forEach(doc => documentosFaltantes.push(doc));
    }
    
    // 2. Verificar TLC
    if (params.certificadoOrigen && params.certificadoOrigen.tratado !== 'NINGUNO') {
      const validacionTLC = this.validarCertificadoOrigen(params.certificadoOrigen, params.hsCode);
      
      if (validacionTLC.aplicaDesgravacion) {
        daiExonerado = daiOriginal;
        fundamentoLegal = `TLC ${REGLAS_TLC[params.certificadoOrigen.tratado].nombre}`;
        
        beneficiosAplicados.push({
          tipo: 'TLC',
          nombre: REGLAS_TLC[params.certificadoOrigen.tratado].nombre,
          montoExonerado: daiOriginal,
          porcentajeExoneracion: 100,
          fundamentoLegal
        });
      }
      
      advertencias.push(...validacionTLC.advertencias);
    } else if (params.paisOrigen) {
      // Detectar TLC potencial
      const tlcPotencial = this.detectarTLCAplicable(params.paisOrigen);
      if (tlcPotencial !== 'NINGUNO') {
        advertencias.push(`Posible TLC aplicable: ${REGLAS_TLC[tlcPotencial].nombre}. Presente Certificado de Origen para exoneración DAI.`);
        documentosFaltantes.push('Certificado de Origen');
      }
    }
    
    // 3. Verificar zonas especiales
    const zonaDestino = params.zonaDestino?.toUpperCase() || '';
    if (zonaDestino.includes('ACP') || zonaDestino.includes('CANAL')) {
      const beneficio = BENEFICIOS_FISCALES.ACP;
      daiExonerado = daiOriginal;
      itbmsExonerado = itbmsOriginal;
      iscExonerado = iscOriginal;
      
      beneficiosAplicados.push({
        tipo: 'ACP',
        nombre: beneficio.nombre,
        montoExonerado: daiExonerado + itbmsExonerado + iscExonerado,
        porcentajeExoneracion: 100,
        fundamentoLegal: beneficio.leyBase
      });
      
      beneficio.documentosRequeridos.forEach(doc => documentosFaltantes.push(doc));
    }
    
    if (zonaDestino.includes('ZLC') || zonaDestino.includes('ZONA LIBRE COLON')) {
      const beneficio = BENEFICIOS_FISCALES.ZLC;
      daiExonerado = daiOriginal;
      itbmsExonerado = itbmsOriginal;
      
      beneficiosAplicados.push({
        tipo: 'ZLC',
        nombre: beneficio.nombre,
        montoExonerado: daiExonerado + itbmsExonerado,
        porcentajeExoneracion: 100,
        fundamentoLegal: beneficio.leyBase
      });
    }
    
    if (zonaDestino.includes('PANAMA PACIFICO') || zonaDestino.includes('APP')) {
      const beneficio = BENEFICIOS_FISCALES.ZL_PANAMA_PACIFICO;
      daiExonerado = daiOriginal;
      itbmsExonerado = itbmsOriginal;
      
      beneficiosAplicados.push({
        tipo: 'ZL_PANAMA_PACIFICO',
        nombre: beneficio.nombre,
        montoExonerado: daiExonerado + itbmsExonerado,
        porcentajeExoneracion: 100,
        fundamentoLegal: beneficio.leyBase
      });
    }
    
    // 4. Verificar Contrato-Ley (ej. Minera Panamá)
    const destinatarioLower = params.destinatario?.toLowerCase() || '';
    const proyectoLower = params.proyecto?.toLowerCase() || '';
    
    if (destinatarioLower.includes('minera panama') || 
        proyectoLower.includes('cobre panama') ||
        proyectoLower.includes('contrato ley')) {
      const beneficio = BENEFICIOS_FISCALES.CONTRATO_LEY;
      advertencias.push('Posible Contrato-Ley aplicable. Verificar lista de bienes autorizados.');
      beneficio.documentosRequeridos.forEach(doc => documentosFaltantes.push(doc));
    }
    
    const ahorro = daiExonerado + itbmsExonerado + iscExonerado;
    
    devLog(`[Exoneraciones] Evaluación completada: ${beneficiosAplicados.length} beneficios, ahorro $${ahorro.toFixed(2)}`);
    
    return {
      aplicaExoneracion: beneficiosAplicados.length > 0,
      beneficios: beneficiosAplicados,
      daiOriginal,
      daiExonerado,
      itbmsOriginal,
      itbmsExonerado,
      iscOriginal,
      iscExonerado,
      ahorro,
      documentosFaltantes: [...new Set(documentosFaltantes)],
      advertencias,
      fundamentoLegal
    };
  }

  /**
   * Obtiene información de un beneficio fiscal
   */
  static obtenerInfoBeneficio(tipo: TipoBeneficioFiscal): BeneficioFiscal {
    return BENEFICIOS_FISCALES[tipo];
  }

  /**
   * Lista todos los beneficios disponibles
   */
  static listarBeneficiosDisponibles(): BeneficioFiscal[] {
    return Object.values(BENEFICIOS_FISCALES);
  }

  /**
   * Obtiene reglas de un TLC específico
   */
  static obtenerReglasTLC(tratado: TratadoComercial): ReglaTLC {
    return REGLAS_TLC[tratado];
  }
}

export default MotorExoneraciones;
