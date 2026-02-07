// ============================================
// ÓRGANOS ANUENTES UNCAP — Red de Cumplimiento Ampliada
// Mi Ambiente, Bomberos (DINASEPI), MICI, Tribunal Aduanero
// + Base Legal: Res. 222, Decreto 425, Ley 2/2016
// ============================================

import { devLog, devWarn } from '@/lib/logger';

// ============================================
// TIPOS
// ============================================
export type OrganoAnuente =
  | 'CONAPRED' | 'MINSA' | 'APA' | 'MIDA' | 'AUPSA'
  | 'MI_AMBIENTE' | 'BOMBEROS_DINASEPI' | 'MICI' | 'TRIBUNAL_ADUANERO'
  | 'ACODECO' | 'MINGOB';

export interface PerfilAnuente {
  id: OrganoAnuente;
  nombre: string;
  nombreCompleto: string;
  competencia: string;
  fundamentoLegal: string;
  tiposControl: ('previo' | 'concurrente' | 'posterior')[];
  tiempoRespuestaDias: number;
  documentosRequeridos: string[];
  contacto?: string;
  keywords: string[];
  hsCodePrefixes: string[];
}

export interface VeredictoAnuente {
  organo: OrganoAnuente;
  tipo: 'bloqueo' | 'advertencia' | 'aprobacion';
  veredicto: string;
  fundamentoLegal: string;
  articuloCitado: string;
  documentoRequerido?: string;
  accionRequerida: string;
  puedeProcesoLiquidacion: boolean;
}

// ============================================
// SUSTANCIAS AGOTADORAS DE OZONO (Protocolo Montreal)
// ============================================
const SUSTANCIAS_OZONO = [
  { nombre: 'CFC-11', sinonimos: ['triclorofluorometano', 'freon-11', 'r-11', 'cfc11'], casNumber: '75-69-4' },
  { nombre: 'CFC-12', sinonimos: ['diclorodifluorometano', 'freon-12', 'r-12', 'cfc12'], casNumber: '75-71-8' },
  { nombre: 'CFC-113', sinonimos: ['triclorotrifluoroetano', 'freon-113', 'r-113'], casNumber: '76-13-1' },
  { nombre: 'CFC-114', sinonimos: ['diclorotetrafluoroetano', 'freon-114', 'r-114'], casNumber: '76-14-2' },
  { nombre: 'CFC-115', sinonimos: ['cloropentafluoroetano', 'freon-115', 'r-115'], casNumber: '76-15-3' },
  { nombre: 'Halon 1211', sinonimos: ['bromoclorodifluorometano', 'halon-1211'], casNumber: '353-59-3' },
  { nombre: 'Halon 1301', sinonimos: ['bromotrifluorometano', 'halon-1301'], casNumber: '75-63-8' },
  { nombre: 'Halon 2402', sinonimos: ['dibromotetrafluoroetano', 'halon-2402'], casNumber: '124-73-2' },
  { nombre: 'CCl4', sinonimos: ['tetracloruro de carbono', 'carbon tetrachloride', 'ccl4'], casNumber: '56-23-5' },
  { nombre: 'Bromuro de Metilo', sinonimos: ['methyl bromide', 'bromometano', 'ch3br'], casNumber: '74-83-9' },
  { nombre: 'HCFC-22', sinonimos: ['clorodifluorometano', 'freon-22', 'r-22', 'hcfc22'], casNumber: '75-45-6' },
  { nombre: 'HCFC-141b', sinonimos: ['diclorofluoroetano', 'r-141b', 'hcfc141b'], casNumber: '1717-00-6' },
  { nombre: 'HCFC-142b', sinonimos: ['clorodifluoroetano', 'r-142b', 'hcfc142b'], casNumber: '75-68-3' },
];

// ============================================
// BASE LEGAL UNCAP
// ============================================
export interface NormaLegal {
  id: string;
  tipo: 'resolucion' | 'decreto' | 'ley' | 'convenio';
  numero: string;
  titulo: string;
  fechaEmision: string;
  organoEmisor: string;
  articulosRelevantes: ArticuloLegal[];
  vigente: boolean;
}

export interface ArticuloLegal {
  numero: string;
  titulo: string;
  contenidoResumen: string;
  aplicaA: OrganoAnuente[];
  tipoAccion: 'bloqueo' | 'requisito' | 'plazo' | 'sancion' | 'procedimiento';
}

export const BASE_LEGAL_UNCAP: NormaLegal[] = [
  {
    id: 'RES-222',
    tipo: 'resolucion',
    numero: '222',
    titulo: 'Resolución N.° 222 — Regulación de Honorarios de Corredores de Aduanas',
    fechaEmision: '2024-03-15',
    organoEmisor: 'Autoridad Nacional de Aduanas (ANA)',
    vigente: true,
    articulosRelevantes: [
      {
        numero: 'Art. 3',
        titulo: 'Tarifas Mínimas de Honorarios',
        contenidoResumen: 'Establece las tarifas mínimas que un corredor de aduanas puede cobrar por servicio de despacho, prohibiendo tarifas por debajo del umbral mínimo como práctica de competencia desleal.',
        aplicaA: ['MICI', 'TRIBUNAL_ADUANERO'],
        tipoAccion: 'requisito',
      },
      {
        numero: 'Art. 5',
        titulo: 'Obligación de Desglose',
        contenidoResumen: 'Todo honorario de corredor debe presentarse desglosado en la liquidación aduanera, separando gastos operativos de honorarios profesionales.',
        aplicaA: ['TRIBUNAL_ADUANERO'],
        tipoAccion: 'requisito',
      },
      {
        numero: 'Art. 8',
        titulo: 'Sanciones por Incumplimiento',
        contenidoResumen: 'Multa de B/.500 a B/.5,000 por facturación sin desglose o por cobros por debajo de la tarifa mínima. Reincidencia puede resultar en suspensión temporal de licencia.',
        aplicaA: ['TRIBUNAL_ADUANERO'],
        tipoAccion: 'sancion',
      },
    ],
  },
  {
    id: 'DEC-425',
    tipo: 'decreto',
    numero: '425',
    titulo: 'Decreto 425 — Control de Sustancias Agotadoras de la Capa de Ozono',
    fechaEmision: '2023-08-22',
    organoEmisor: 'Ministerio de Ambiente',
    vigente: true,
    articulosRelevantes: [
      {
        numero: 'Art. 4',
        titulo: 'Prohibición de Importación de SAO',
        contenidoResumen: 'Queda prohibida la importación de sustancias del Anexo A y B del Protocolo de Montreal sin autorización expresa de Mi Ambiente. Los equipos que contengan estas sustancias también quedan sujetos a control.',
        aplicaA: ['MI_AMBIENTE'],
        tipoAccion: 'bloqueo',
      },
      {
        numero: 'Art. 7',
        titulo: 'Permiso Previo de Mi Ambiente',
        contenidoResumen: 'Toda importación de HCFC o sustancias listadas requiere Permiso de Importación emitido por la Dirección de Calidad Ambiental del Ministerio de Ambiente, previo a la llegada de la mercancía.',
        aplicaA: ['MI_AMBIENTE'],
        tipoAccion: 'requisito',
      },
      {
        numero: 'Art. 12',
        titulo: 'Decomiso y Sanción',
        contenidoResumen: 'La importación sin permiso resultará en decomiso inmediato del cargamento y multa de B/.10,000 a B/.100,000 según la cantidad.',
        aplicaA: ['MI_AMBIENTE', 'TRIBUNAL_ADUANERO'],
        tipoAccion: 'sancion',
      },
    ],
  },
  {
    id: 'LEY-2-2016',
    tipo: 'ley',
    numero: 'Ley 2 de 2016',
    titulo: 'Ley 2 de 2016 — Reformas al Régimen Aduanero',
    fechaEmision: '2016-02-15',
    organoEmisor: 'Asamblea Nacional de Panamá',
    vigente: true,
    articulosRelevantes: [
      {
        numero: 'Art. 15',
        titulo: 'Control de Mercancías Restringidas',
        contenidoResumen: 'Las mercancías sujetas a control sanitario, fitosanitario, ambiental o de seguridad requieren la aprobación del órgano anuente correspondiente antes del levante. La aduana no puede autorizar el despacho sin dicho aval.',
        aplicaA: ['MI_AMBIENTE', 'MINSA', 'MIDA', 'BOMBEROS_DINASEPI'],
        tipoAccion: 'bloqueo',
      },
      {
        numero: 'Art. 22',
        titulo: 'Recurso de Reconsideración',
        contenidoResumen: 'El importador puede interponer recurso de reconsideración dentro de los 5 días hábiles siguientes a la notificación de la resolución adversa ante la misma autoridad.',
        aplicaA: ['TRIBUNAL_ADUANERO'],
        tipoAccion: 'procedimiento',
      },
      {
        numero: 'Art. 23',
        titulo: 'Recurso de Apelación',
        contenidoResumen: 'Agotada la vía de reconsideración, el importador puede apelar ante el Tribunal Administrativo Tributario dentro de los 15 días hábiles.',
        aplicaA: ['TRIBUNAL_ADUANERO'],
        tipoAccion: 'procedimiento',
      },
      {
        numero: 'Art. 38',
        titulo: 'Certificado de Origen',
        contenidoResumen: 'Para acceder a preferencias arancelarias bajo TLC vigentes, el importador debe presentar Certificado de Origen emitido por la autoridad competente del país exportador o validado por MICI.',
        aplicaA: ['MICI'],
        tipoAccion: 'requisito',
      },
      {
        numero: 'Art. 45',
        titulo: 'Inspección de Seguridad',
        contenidoResumen: 'Las mercancías clasificadas como peligrosas (inflamables, explosivas, corrosivas) requieren inspección del Cuerpo de Bomberos (DINASEPI) y certificado de manipulación segura.',
        aplicaA: ['BOMBEROS_DINASEPI'],
        tipoAccion: 'bloqueo',
      },
    ],
  },
];

// ============================================
// PERFILES DE ÓRGANOS ANUENTES
// ============================================
export const PERFILES_ANUENTES: PerfilAnuente[] = [
  {
    id: 'MI_AMBIENTE',
    nombre: 'Mi Ambiente',
    nombreCompleto: 'Ministerio de Ambiente de Panamá',
    competencia: 'Control de sustancias agotadoras de la capa de ozono, residuos peligrosos, CITES, y materiales con impacto ambiental.',
    fundamentoLegal: 'Decreto 425, Protocolo de Montreal, Convenio de Basilea',
    tiposControl: ['previo'],
    tiempoRespuestaDias: 10,
    documentosRequeridos: [
      'Permiso de Importación de SAO (Mi Ambiente)',
      'Certificado de No Contenido de SAO',
      'Licencia CITES (si aplica)',
      'Estudio de Impacto Ambiental (si aplica)',
    ],
    keywords: ['ozono', 'refrigerante', 'cfc', 'hcfc', 'freon', 'halon', 'bromuro', 'cites', 'flora', 'fauna', 'especie protegida', 'residuo peligroso', 'desecho', 'basilea'],
    hsCodePrefixes: ['29', '38', '84.15', '84.18'],
  },
  {
    id: 'BOMBEROS_DINASEPI',
    nombre: 'Bomberos (DINASEPI)',
    nombreCompleto: 'Dirección Nacional de Seguridad, Prevención e Investigación de Incendios',
    competencia: 'Inspección de mercancías peligrosas: inflamables, explosivos, gases comprimidos, materiales corrosivos y radiactivos.',
    fundamentoLegal: 'Ley 2 de 2016 Art. 45, Ley 37 de 1995',
    tiposControl: ['previo', 'concurrente'],
    tiempoRespuestaDias: 5,
    documentosRequeridos: [
      'Hoja de Seguridad (MSDS/SDS)',
      'Certificado de Manipulación de Mercancías Peligrosas',
      'Permiso de Transporte de Sustancias Peligrosas',
      'Plan de Emergencia',
    ],
    keywords: ['explosivo', 'inflamable', 'combustible', 'gas comprimido', 'corrosivo', 'radioactivo', 'pirotecnia', 'fuegos artificiales', 'pólvora', 'detonador', 'aerosol', 'propano', 'butano', 'gasolina', 'thinner'],
    hsCodePrefixes: ['27', '36', '28.04', '28.11'],
  },
  {
    id: 'MICI',
    nombre: 'MICI',
    nombreCompleto: 'Ministerio de Comercio e Industrias',
    competencia: 'Certificados de Origen, Ventanilla Única de Comercio Exterior (VUCE), preferencias arancelarias bajo TLC, y regulación de competencia.',
    fundamentoLegal: 'Ley 2 de 2016 Art. 38, Decreto Ley 7 de 2006',
    tiposControl: ['previo', 'posterior'],
    tiempoRespuestaDias: 15,
    documentosRequeridos: [
      'Certificado de Origen (formato VUCE)',
      'Declaración de Valor en Aduana',
      'Solicitud VUCE N.° de trámite',
      'Factura Comercial Consularizada (si aplica)',
    ],
    keywords: ['certificado de origen', 'origen', 'tlc', 'preferencia arancelaria', 'zona libre', 'cuota', 'antidumping', 'salvaguarda'],
    hsCodePrefixes: [],
  },
  {
    id: 'TRIBUNAL_ADUANERO',
    nombre: 'Tribunal Aduanero',
    nombreCompleto: 'Tribunal Administrativo Tributario / Tribunal Aduanero de Panamá',
    competencia: 'Resolución de controversias aduaneras, apelaciones de clasificación arancelaria, recursos contra resoluciones de la ANA y disputas de valoración.',
    fundamentoLegal: 'Ley 2 de 2016 Arts. 22-23, Código Fiscal',
    tiposControl: ['posterior'],
    tiempoRespuestaDias: 30,
    documentosRequeridos: [
      'Recurso de Reconsideración (5 días hábiles)',
      'Recurso de Apelación (15 días hábiles)',
      'Expediente de Defensa con Evidencias',
      'Dictamen Técnico de Clasificación',
    ],
    keywords: ['apelacion', 'recurso', 'reconsideracion', 'impugnacion', 'controversia', 'disputa'],
    hsCodePrefixes: [],
  },
];

// ============================================
// MOTOR DE EVALUACIÓN UNCAP
// ============================================
export class MotorAnuentesUNCAP {

  /**
   * Evalúa una mercancía contra todos los órganos anuentes
   */
  static evaluarMercancia(params: {
    descripcion: string;
    hsCode: string;
    paisOrigen?: string;
    valorUSD?: number;
    pesoKg?: number;
    solicitaCertificadoOrigen?: boolean;
  }): VeredictoAnuente[] {
    const veredictos: VeredictoAnuente[] = [];
    const descLower = params.descripcion.toLowerCase();

    // 1. MI AMBIENTE — Sustancias Agotadoras de Ozono
    const esOzono = this.detectarSustanciaOzono(descLower);
    const miAmbienteKeywords = PERFILES_ANUENTES.find(p => p.id === 'MI_AMBIENTE')!.keywords;
    const matchMiAmbiente = miAmbienteKeywords.some(kw => descLower.includes(kw));

    if (esOzono) {
      veredictos.push({
        organo: 'MI_AMBIENTE',
        tipo: 'bloqueo',
        veredicto: `Veredicto de Zod: Sustancia Agotadora de la Capa de Ozono detectada (${esOzono.nombre}). Proceso BLOQUEADO hasta recibir aval de Mi Ambiente.`,
        fundamentoLegal: 'Decreto 425 — Art. 4: Prohibición de importación de SAO sin autorización de Mi Ambiente.',
        articuloCitado: 'Decreto 425, Art. 4',
        documentoRequerido: 'Permiso de Importación de SAO emitido por Dirección de Calidad Ambiental',
        accionRequerida: 'Solicitar Permiso de Importación ante Mi Ambiente ANTES del arribo. Sin permiso = decomiso (Art. 12).',
        puedeProcesoLiquidacion: false,
      });
    } else if (matchMiAmbiente) {
      veredictos.push({
        organo: 'MI_AMBIENTE',
        tipo: 'advertencia',
        veredicto: 'Veredicto de Zod: Producto con posible implicación ambiental. Verificar requisitos de Mi Ambiente.',
        fundamentoLegal: 'Ley 2 de 2016 — Art. 15: Control de mercancías restringidas requiere aval del órgano anuente.',
        articuloCitado: 'Ley 2 de 2016, Art. 15',
        accionRequerida: 'Verificar si requiere permiso ambiental. Consultar listado CITES si involucra flora/fauna.',
        puedeProcesoLiquidacion: true,
      });
    }

    // 2. BOMBEROS (DINASEPI) — Mercancías Peligrosas
    const bomberosKeywords = PERFILES_ANUENTES.find(p => p.id === 'BOMBEROS_DINASEPI')!.keywords;
    const matchBomberos = bomberosKeywords.some(kw => descLower.includes(kw));
    const hsIsBomberos = params.hsCode.startsWith('27') || params.hsCode.startsWith('36');

    if (matchBomberos || hsIsBomberos) {
      veredictos.push({
        organo: 'BOMBEROS_DINASEPI',
        tipo: 'bloqueo',
        veredicto: 'Veredicto de Zod: Mercancía clasificada como PELIGROSA. Requiere inspección de Bomberos (DINASEPI) y Hoja de Seguridad.',
        fundamentoLegal: 'Ley 2 de 2016 — Art. 45: Mercancías peligrosas requieren inspección del Cuerpo de Bomberos y certificado de manipulación segura.',
        articuloCitado: 'Ley 2 de 2016, Art. 45',
        documentoRequerido: 'Hoja de Seguridad (MSDS/SDS) + Certificado de Manipulación de Mercancías Peligrosas',
        accionRequerida: 'Presentar MSDS ante DINASEPI. Coordinar inspección física. No se autoriza levante sin certificado.',
        puedeProcesoLiquidacion: false,
      });
    }

    // 3. MICI — Certificado de Origen / VUCE
    if (params.solicitaCertificadoOrigen) {
      veredictos.push({
        organo: 'MICI',
        tipo: 'advertencia',
        veredicto: 'Veredicto de Zod: Se solicita preferencia arancelaria. Verificar Certificado de Origen vía VUCE.',
        fundamentoLegal: 'Ley 2 de 2016 — Art. 38: Preferencias arancelarias bajo TLC requieren Certificado de Origen validado por MICI.',
        articuloCitado: 'Ley 2 de 2016, Art. 38',
        documentoRequerido: 'Certificado de Origen en formato VUCE + Factura Comercial',
        accionRequerida: 'Tramitar Certificado de Origen vía VUCE del MICI. Verificar TLC aplicable para país de origen.',
        puedeProcesoLiquidacion: true,
      });
    }

    // 4. Verificar honorarios Res. 222
    veredictos.push(...this.verificarResolucion222(params.valorUSD));

    devLog(`[UNCAP] ${veredictos.length} veredictos emitidos para: ${params.descripcion.substring(0, 50)}`);
    return veredictos;
  }

  /**
   * Detecta sustancias agotadoras de la capa de ozono
   */
  private static detectarSustanciaOzono(descLower: string): (typeof SUSTANCIAS_OZONO)[0] | null {
    for (const sustancia of SUSTANCIAS_OZONO) {
      const todos = [sustancia.nombre.toLowerCase(), ...sustancia.sinonimos.map(s => s.toLowerCase())];
      for (const nombre of todos) {
        if (descLower.includes(nombre)) return sustancia;
      }
    }
    return null;
  }

  /**
   * Verificar cumplimiento Resolución 222 (Honorarios)
   */
  private static verificarResolucion222(valorUSD?: number): VeredictoAnuente[] {
    if (!valorUSD) return [];
    // Tarifa mínima según Res. 222 (ejemplo simplificado)
    if (valorUSD < 100) {
      return [{
        organo: 'TRIBUNAL_ADUANERO',
        tipo: 'advertencia',
        veredicto: 'Veredicto de Zod: Valor declarado bajo. Verificar que los honorarios del corredor cumplan con la tarifa mínima de la Resolución 222.',
        fundamentoLegal: 'Resolución N.° 222 — Art. 3: Tarifas mínimas de honorarios. Art. 5: Obligación de desglose.',
        articuloCitado: 'Res. 222, Arts. 3 y 5',
        accionRequerida: 'Asegurar que la factura del corredor incluya desglose según Art. 5. Multa Art. 8: B/.500-B/.5,000.',
        puedeProcesoLiquidacion: true,
      }];
    }
    return [];
  }

  /**
   * Busca la norma legal por ID
   */
  static buscarNorma(normaId: string): NormaLegal | undefined {
    return BASE_LEGAL_UNCAP.find(n => n.id === normaId);
  }

  /**
   * Busca artículos relevantes para un órgano anuente
   */
  static articulosPorOrgano(organo: OrganoAnuente): ArticuloLegal[] {
    return BASE_LEGAL_UNCAP
      .flatMap(n => n.articulosRelevantes)
      .filter(a => a.aplicaA.includes(organo));
  }

  /**
   * Obtiene perfil de un órgano anuente
   */
  static obtenerPerfil(organo: OrganoAnuente): PerfilAnuente | undefined {
    return PERFILES_ANUENTES.find(p => p.id === organo);
  }
}

export default MotorAnuentesUNCAP;
