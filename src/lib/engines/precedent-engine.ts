/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  PRECEDENT ENGINE — Legal Intelligence Module                  ║
 * ║  Cerebro de Precedentes y Resoluciones Anticipadas             ║
 * ║  ZENITH Customs Intelligence Platform                          ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * @module       precedent-engine
 * @jurisdiction  PA · CR · GT
 * @maintained-by Core Development Team
 *
 * Gestiona Resoluciones Anticipadas, Criterios Técnicos y las
 * 6 Reglas Generales de Interpretación (GRI) del SAC/HS.
 *
 * Arquitectura: LEXIS extrae → PRECEDENT justifica → ZOD valida → STELLA asesora
 */

import { supabase } from '@/integrations/supabase/client';
import type { ZodRegion } from './zod-engine';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CustomsPrecedent {
  id: string;
  countryCode: ZodRegion;
  rulingId: string;
  rulingType: 'clasificacion' | 'valoracion' | 'origen';
  authority: string;
  hsCode: string;
  descriptionKeywords: string[];
  productDescription?: string;
  legalRationale: string;
  griApplied?: string;
  effectiveDate: string;
  expirationDate?: string;
  sourceDocument?: string;
  activo: boolean;
}

export interface GRIRule {
  number: string;
  title: string;
  description: string;
  subRules?: { id: string; text: string }[];
  applicationCriteria: string;
}

export interface PrecedentSearchResult {
  precedent: CustomsPrecedent;
  relevanceScore: number;
  matchedKeywords: string[];
}

export interface GRIAnalysis {
  appliedRule: string;
  ruleTitle: string;
  justification: string;
  confidence: number;
}

export interface PrecedentValidation {
  found: boolean;
  precedent?: CustomsPrecedent;
  griAnalysis?: GRIAnalysis;
  recommendation: string;
  legalCitation: string;
}

// ═══════════════════════════════════════════════════════════════
// GRI — REGLAS GENERALES DE INTERPRETACIÓN DEL SAC
// ═══════════════════════════════════════════════════════════════

export const GRI_RULES: GRIRule[] = [
  {
    number: '1',
    title: 'Textos de Partidas y Notas de Sección/Capítulo',
    description: 'La clasificación se determina por los textos de las partidas y las Notas de Sección o Capítulo. Solo cuando las partidas o notas no exigen otra cosa, se aplican las demás GRI.',
    applicationCriteria: 'Se aplica cuando el producto se describe de manera clara y específica en el texto de una partida arancelaria.',
  },
  {
    number: '2',
    title: 'Artículos Incompletos o sin Montar',
    description: 'Cualquier referencia a un artículo comprende también los artículos incompletos o sin terminar, siempre que presenten las características esenciales del artículo completo.',
    subRules: [
      { id: '2(a)', text: 'Artículos incompletos o sin terminar que presenten características esenciales del artículo completo o terminado.' },
      { id: '2(b)', text: 'Cualquier referencia a una materia comprende la referencia a dicha materia incluso mezclada o asociada con otras materias.' },
    ],
    applicationCriteria: 'Se aplica cuando el producto está incompleto, desmontado, o es una mezcla de materias.',
  },
  {
    number: '3',
    title: 'Clasificación en la Partida más Específica',
    description: 'Cuando un producto pueda clasificarse en dos o más partidas, se aplican las siguientes reglas de prioridad.',
    subRules: [
      { id: '3(a)', text: 'La partida con descripción más específica tendrá prioridad sobre las partidas de alcance más genérico.' },
      { id: '3(b)', text: 'Los productos mezclados, compuestos o en surtidos se clasifican según la materia o artículo que les confiera su CARÁCTER ESENCIAL.' },
      { id: '3(c)', text: 'Cuando las reglas 3(a) y 3(b) no permiten la clasificación, el producto se clasifica en la última partida por orden de numeración entre las susceptibles.' },
    ],
    applicationCriteria: 'Se aplica cuando el producto puede clasificarse en dos o más partidas arancelarias.',
  },
  {
    number: '4',
    title: 'Clasificación por Analogía',
    description: 'Las mercancías que no puedan clasificarse por las reglas anteriores se clasifican en la partida que comprenda artículos con los que tengan mayor analogía.',
    applicationCriteria: 'Se aplica como regla residual cuando las GRI 1-3 no permiten clasificación.',
  },
  {
    number: '5',
    title: 'Estuches y Envases',
    description: 'Los estuches y continentes similares se clasifican con su contenido cuando sean del tipo normalmente utilizado para dicho contenido.',
    subRules: [
      { id: '5(a)', text: 'Estuches especialmente concebidos para contener un artículo determinado se clasifican con dicho artículo.' },
      { id: '5(b)', text: 'Los envases que confieran al conjunto su carácter esencial se clasifican por separado.' },
    ],
    applicationCriteria: 'Se aplica cuando el producto se presenta con un estuche, envase o continente especial.',
  },
  {
    number: '6',
    title: 'Clasificación en Subpartidas',
    description: 'La clasificación en las subpartidas de una misma partida se determina por los textos de las subpartidas y las notas de subpartida, aplicando mutatis mutandis las GRI anteriores.',
    applicationCriteria: 'Se aplica para determinar el nivel más específico de subpartida dentro de una partida ya identificada.',
  },
];

// ═══════════════════════════════════════════════════════════════
// REGIONAL AUTHORITY CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const REGIONAL_AUTHORITIES: Record<ZodRegion, { name: string; rulingPrefix: string; legalFramework: string }> = {
  PA: {
    name: 'Autoridad Nacional de Aduanas (ANA)',
    rulingPrefix: 'RES-ANA',
    legalFramework: 'Decreto Ley 1 de 2008, CAUCA IV Art. 45',
  },
  CR: {
    name: 'Dirección General de Aduanas (DGA)',
    rulingPrefix: 'MH-DGA-RES',
    legalFramework: 'Ley General de Aduanas 7557, CAUCA IV / RECAUCA',
  },
  GT: {
    name: 'Intendencia de Aduanas — SAT',
    rulingPrefix: 'SAT-IAD',
    legalFramework: 'Ley Aduanera Nacional, CAUCA IV / RECAUCA',
  },
};

// ═══════════════════════════════════════════════════════════════
// SEED DATA — RESOLUCIONES ANTICIPADAS CONOCIDAS
// ═══════════════════════════════════════════════════════════════

const SEED_PRECEDENTS: Omit<CustomsPrecedent, 'id'>[] = [
  // ── PANAMÁ ──
  {
    countryCode: 'PA',
    rulingId: 'RES-ANA-466-2014',
    rulingType: 'clasificacion',
    authority: 'Autoridad Nacional de Aduanas (ANA)',
    hsCode: '8471.30.00',
    descriptionKeywords: ['laptop', 'computadora portátil', 'notebook', 'máquina automática de procesamiento de datos'],
    productDescription: 'Computadoras portátiles de peso inferior a 10kg',
    legalRationale: 'Clasificación bajo partida 8471 por tratarse de máquinas automáticas para tratamiento de información, con características de portabilidad (peso < 10kg). Aplicación de GRI 1 — texto literal de la partida.',
    griApplied: 'GRI 1',
    effectiveDate: '2014-06-15',
    sourceDocument: 'Resolución 466/2014 — Dictamen de Técnica Aduanera',
    activo: true,
  },
  {
    countryCode: 'PA',
    rulingId: 'RES-ANA-312-2019',
    rulingType: 'clasificacion',
    authority: 'Autoridad Nacional de Aduanas (ANA)',
    hsCode: '3004.90.29',
    descriptionKeywords: ['suplemento', 'vitamina', 'cápsula', 'complemento alimenticio', 'tableta'],
    productDescription: 'Suplementos alimenticios en cápsulas con dosificación terapéutica',
    legalRationale: 'Clasificación como medicamento por presentar dosificación terapéutica y forma farmacéutica (cápsulas). Requiere permiso MINSA. Aplicación de GRI 1 y Nota Legal Capítulo 30.',
    griApplied: 'GRI 1',
    effectiveDate: '2019-03-01',
    sourceDocument: 'Resolución 312/2019 — Técnica Aduanera ANA',
    activo: true,
  },
  {
    countryCode: 'PA',
    rulingId: 'RES-ANA-088-2022',
    rulingType: 'valoracion',
    authority: 'Autoridad Nacional de Aduanas (ANA)',
    hsCode: '6204.62.00',
    descriptionKeywords: ['ropa', 'vestimenta', 'textil', 'courier', 'paquetería', 'valor mínimo'],
    productDescription: 'Envíos de paquetería courier con textiles — criterio de valoración',
    legalRationale: 'Los envíos courier de textiles deben declarar valor de transacción real. No aplica valor mínimo arbitrario. CAUCA IV Art. 45, Acuerdo OMC sobre Valoración.',
    effectiveDate: '2022-01-15',
    sourceDocument: 'Dictamen ANA-088-2022',
    activo: true,
  },

  // ── COSTA RICA ──
  {
    countryCode: 'CR',
    rulingId: 'MH-DGA-RES-2023-045',
    rulingType: 'clasificacion',
    authority: 'Dirección General de Aduanas (DGA)',
    hsCode: '8517.62.00',
    descriptionKeywords: ['router', 'access point', 'wifi', 'enrutador', 'red inalámbrica'],
    productDescription: 'Equipos de enrutamiento WiFi para redes domésticas y empresariales',
    legalRationale: 'Clasificación bajo 8517 por ser aparatos de telecomunicación para recepción, conversión y transmisión de datos. GRI 1 por texto de partida. Sistema TICA requiere declaración como equipo de telecomunicaciones.',
    griApplied: 'GRI 1',
    effectiveDate: '2023-07-01',
    sourceDocument: 'Boletín MH-DGA-RES-2023-045',
    activo: true,
  },
  {
    countryCode: 'CR',
    rulingId: 'MH-DGA-RES-2024-012',
    rulingType: 'clasificacion',
    authority: 'Dirección General de Aduanas (DGA)',
    hsCode: '2106.90.90',
    descriptionKeywords: ['proteína', 'whey', 'suplemento deportivo', 'preparación alimenticia'],
    productDescription: 'Proteínas de suero para consumo deportivo',
    legalRationale: 'Clasificación como preparación alimenticia (no medicamento) por no tener dosificación terapéutica. GRI 1 y Nota Legal 4 del Capítulo 21. No requiere registro sanitario MINSA-CR sino notificación sanitaria.',
    griApplied: 'GRI 1',
    effectiveDate: '2024-02-15',
    sourceDocument: 'Circular MH-DGA-2024-012',
    activo: true,
  },

  // ── GUATEMALA ──
  {
    countryCode: 'GT',
    rulingId: 'SAT-IAD-2023-089',
    rulingType: 'clasificacion',
    authority: 'Intendencia de Aduanas — SAT',
    hsCode: '8528.72.00',
    descriptionKeywords: ['televisor', 'pantalla', 'smart tv', 'monitor', 'display lcd'],
    productDescription: 'Televisores LCD/LED con receptor de televisión incorporado',
    legalRationale: 'Clasificación bajo 8528.72 por ser aparatos receptores de televisión a color con pantalla LCD/LED. GRI 1. Requiere FEL para importaciones > Q10,000.',
    griApplied: 'GRI 1',
    effectiveDate: '2023-09-01',
    sourceDocument: 'Resolución SAT-IAD-2023-089',
    activo: true,
  },
  {
    countryCode: 'GT',
    rulingId: 'SAT-IAD-2024-033',
    rulingType: 'clasificacion',
    authority: 'Intendencia de Aduanas — SAT',
    hsCode: '8473.30.00',
    descriptionKeywords: ['cargador', 'fuente de poder', 'adaptador', 'accesorio computadora'],
    productDescription: 'Cargadores y adaptadores de corriente para equipos informáticos',
    legalRationale: 'Clasificación como accesorio de máquinas del 8471 por GRI 2(b) — partes y accesorios destinados exclusiva o principalmente a las máquinas de la partida 8471. No se clasifican como transformadores (8504).',
    griApplied: 'GRI 2(b)',
    effectiveDate: '2024-05-01',
    sourceDocument: 'Resolución SAT-IAD-2024-033',
    activo: true,
  },
];

// ═══════════════════════════════════════════════════════════════
// PRECEDENT ENGINE
// ═══════════════════════════════════════════════════════════════

export class PrecedentEngine {
  private static instance: PrecedentEngine | null = null;
  private localCache: CustomsPrecedent[] = [];
  private _currentRegion: ZodRegion = 'PA';

  private constructor() {
    this.initializeLocalCache();
  }

  static getInstance(): PrecedentEngine {
    if (!PrecedentEngine.instance) {
      PrecedentEngine.instance = new PrecedentEngine();
    }
    return PrecedentEngine.instance;
  }

  // ── Region ──────────────────────────────────────────────

  setRegion(region: ZodRegion): void {
    this._currentRegion = region;
  }

  get currentRegion(): ZodRegion {
    return this._currentRegion;
  }

  // ── GRI Analysis ────────────────────────────────────────

  /**
   * Analyzes a product description and suggests the applicable GRI rule
   */
  analyzeGRI(description: string, hsCode: string, context?: {
    isIncomplete?: boolean;
    isMixture?: boolean;
    hasContainer?: boolean;
    multiplePartidas?: boolean;
  }): GRIAnalysis {
    const desc = description.toLowerCase();

    // GRI 5 — Container/case analysis
    if (context?.hasContainer) {
      return {
        appliedRule: 'GRI 5(a)',
        ruleTitle: GRI_RULES[4].title,
        justification: `El producto se presenta con un estuche o envase especial. Conforme a la GRI 5(a), se clasifica junto con su contenido bajo la partida ${hsCode}.`,
        confidence: 0.80,
      };
    }

    // GRI 2 — Incomplete / mixture
    if (context?.isIncomplete) {
      return {
        appliedRule: 'GRI 2(a)',
        ruleTitle: GRI_RULES[1].title,
        justification: `El artículo se presenta incompleto o sin montar, pero presenta las características esenciales del producto terminado. Clasificación bajo ${hsCode} por GRI 2(a).`,
        confidence: 0.75,
      };
    }
    if (context?.isMixture) {
      return {
        appliedRule: 'GRI 2(b)',
        ruleTitle: GRI_RULES[1].title,
        justification: `El producto es una mezcla o combinación de materias. Clasificación bajo ${hsCode} por GRI 2(b) — referencia a materia mezclada o asociada.`,
        confidence: 0.75,
      };
    }

    // GRI 3 — Multiple possible headings
    if (context?.multiplePartidas) {
      const hasEssentialCharacter = desc.includes('esencial') || desc.includes('principal') || desc.includes('predominante');
      if (hasEssentialCharacter) {
        return {
          appliedRule: 'GRI 3(b)',
          ruleTitle: GRI_RULES[2].title,
          justification: `El producto puede clasificarse en múltiples partidas. Se aplica GRI 3(b) por carácter esencial — la materia o componente que confiere el carácter esencial determina la clasificación bajo ${hsCode}.`,
          confidence: 0.70,
        };
      }
      return {
        appliedRule: 'GRI 3(a)',
        ruleTitle: GRI_RULES[2].title,
        justification: `El producto puede clasificarse en múltiples partidas. Se aplica GRI 3(a) — la partida con descripción más específica (${hsCode}) prevalece sobre las de alcance genérico.`,
        confidence: 0.72,
      };
    }

    // GRI 1 — Default: specific text match
    return {
      appliedRule: 'GRI 1',
      ruleTitle: GRI_RULES[0].title,
      justification: `Clasificación bajo partida ${hsCode} determinada por el texto literal de la partida y las Notas de Sección/Capítulo correspondientes, conforme a la GRI 1 del Sistema Arancelario Centroamericano.`,
      confidence: 0.85,
    };
  }

  // ── Precedent Search (Keyword-Based, RAG-Ready) ─────────

  /**
   * Searches for precedents matching a product description.
   * Uses keyword overlap scoring (ready for vector embedding upgrade).
   */
  async searchPrecedents(
    description: string,
    region?: ZodRegion,
    hsCode?: string
  ): Promise<PrecedentSearchResult[]> {
    const targetRegion = region || this._currentRegion;
    const normalizedDesc = this.normalize(description);
    const descTokens = normalizedDesc.split(/\s+/).filter(t => t.length > 2);

    // Try database first
    let dbPrecedents: CustomsPrecedent[] = [];
    try {
      const { data, error } = await supabase
        .from('customs_precedents')
        .select('*')
        .eq('country_code', targetRegion)
        .eq('activo', true);

      if (!error && data) {
        dbPrecedents = data.map(row => ({
          id: row.id,
          countryCode: row.country_code as ZodRegion,
          rulingId: row.ruling_id,
          rulingType: row.ruling_type as CustomsPrecedent['rulingType'],
          authority: row.authority,
          hsCode: row.hs_code,
          descriptionKeywords: row.description_keywords || [],
          productDescription: row.product_description || undefined,
          legalRationale: row.legal_rationale,
          griApplied: row.gri_applied || undefined,
          effectiveDate: row.effective_date,
          expirationDate: row.expiration_date || undefined,
          sourceDocument: row.source_document || undefined,
          activo: row.activo,
        }));
      }
    } catch { /* fallback to local cache */ }

    // Merge with local cache (dedup by rulingId)
    const allPrecedents = [...dbPrecedents];
    const dbRulingIds = new Set(dbPrecedents.map(p => p.rulingId));
    for (const cached of this.localCache) {
      if (cached.countryCode === targetRegion && !dbRulingIds.has(cached.rulingId)) {
        allPrecedents.push(cached);
      }
    }

    // Score each precedent
    const results: PrecedentSearchResult[] = [];
    for (const precedent of allPrecedents) {
      let score = 0;
      const matchedKeywords: string[] = [];

      // HS code exact match (highest signal)
      if (hsCode && precedent.hsCode.startsWith(hsCode.substring(0, 4))) {
        score += 50;
        if (precedent.hsCode === hsCode) score += 30;
      }

      // Keyword overlap
      for (const keyword of precedent.descriptionKeywords) {
        const normalizedKw = this.normalize(keyword);
        if (normalizedDesc.includes(normalizedKw)) {
          score += 15;
          matchedKeywords.push(keyword);
        } else {
          // Partial token match
          const kwTokens = normalizedKw.split(/\s+/);
          for (const kwToken of kwTokens) {
            if (descTokens.some(dt => dt.includes(kwToken) || kwToken.includes(dt))) {
              score += 5;
              matchedKeywords.push(keyword);
              break;
            }
          }
        }
      }

      if (score > 0) {
        results.push({
          precedent,
          relevanceScore: Math.min(score, 100),
          matchedKeywords: [...new Set(matchedKeywords)],
        });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
  }

  // ── Precedent Validation for ZOD Pipeline ───────────────

  /**
   * Called by ZOD when a classification discrepancy is detected.
   * Checks if a ruling supports the declared HS code before blocking.
   */
  async validateByPrecedent(
    declaredHsCode: string,
    productDescription: string,
    region?: ZodRegion
  ): Promise<PrecedentValidation> {
    const targetRegion = region || this._currentRegion;
    const authority = REGIONAL_AUTHORITIES[targetRegion];
    const results = await this.searchPrecedents(productDescription, targetRegion, declaredHsCode);

    // Look for a precedent that matches the declared code
    const directMatch = results.find(r =>
      r.precedent.hsCode === declaredHsCode && r.relevanceScore >= 30
    );

    if (directMatch) {
      const p = directMatch.precedent;
      const griAnalysis = p.griApplied
        ? this.analyzeGRI(productDescription, declaredHsCode)
        : undefined;

      return {
        found: true,
        precedent: p,
        griAnalysis,
        recommendation: `Clasificación avalada por precedente. Resolución ${p.rulingId} de ${p.authority} respalda la partida ${declaredHsCode}.`,
        legalCitation: `Basado en la Resolución Anticipada ${p.rulingId} de la ${p.authority}, este producto se clasifica bajo la partida ${p.hsCode} debido a: ${p.legalRationale.substring(0, 200)}`,
      };
    }

    // No direct match — check if there's a related precedent suggesting a different code
    const relatedMatch = results.length > 0 ? results[0] : null;
    if (relatedMatch && relatedMatch.relevanceScore >= 40) {
      const p = relatedMatch.precedent;
      return {
        found: true,
        precedent: p,
        recommendation: `Precedente relacionado encontrado. La Resolución ${p.rulingId} clasifica productos similares bajo ${p.hsCode} (declarado: ${declaredHsCode}). Requiere revisión por Corredor.`,
        legalCitation: `Resolución ${p.rulingId} — ${p.authority}: "${p.legalRationale.substring(0, 150)}..." Marco legal: ${authority.legalFramework}.`,
      };
    }

    // No precedent found
    const griAnalysis = this.analyzeGRI(productDescription, declaredHsCode);
    return {
      found: false,
      griAnalysis,
      recommendation: `Sin precedente registrado para la partida ${declaredHsCode} en ${authority.name}. Clasificación sustentada por ${griAnalysis.appliedRule}: ${griAnalysis.justification.substring(0, 150)}`,
      legalCitation: `Aplicación de ${griAnalysis.appliedRule} del SAC — ${authority.legalFramework}. Sin resolución anticipada disponible.`,
    };
  }

  // ── Stella Citation Generator ───────────────────────────

  /**
   * Generates a formatted citation for Stella's advisory messages
   */
  formatStellaAdvisory(validation: PrecedentValidation): string {
    if (validation.found && validation.precedent) {
      const p = validation.precedent;
      return `📋 Basado en la Resolución Anticipada **${p.rulingId}** de la **${p.authority}**, este producto se clasifica bajo la partida **${p.hsCode}**. ${p.griApplied ? `Regla aplicada: ${p.griApplied}.` : ''} Fundamento: ${p.legalRationale.substring(0, 200)}.`;
    }
    if (validation.griAnalysis) {
      return `📐 Sin resolución anticipada disponible. Clasificación sustentada por **${validation.griAnalysis.appliedRule}** (${validation.griAnalysis.ruleTitle}): ${validation.griAnalysis.justification.substring(0, 200)}.`;
    }
    return '⚠️ Sin precedente ni regla GRI aplicable. Se recomienda solicitar una Resolución Anticipada ante la autoridad aduanera competente.';
  }

  // ── GRI Reference ───────────────────────────────────────

  getGRIRules(): GRIRule[] {
    return [...GRI_RULES];
  }

  getGRIRule(number: string): GRIRule | undefined {
    return GRI_RULES.find(r => r.number === number);
  }

  getRegionalAuthority(region?: ZodRegion) {
    return REGIONAL_AUTHORITIES[region || this._currentRegion];
  }

  // ── Internals ───────────────────────────────────────────

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private initializeLocalCache(): void {
    this.localCache = SEED_PRECEDENTS.map((p, i) => ({
      ...p,
      id: `seed-${i}`,
    }));
  }

  destroy(): void {
    PrecedentEngine.instance = null;
  }
}

// ── Singleton Export ────────────────────────────────────────
export const precedentEngine = PrecedentEngine.getInstance();
