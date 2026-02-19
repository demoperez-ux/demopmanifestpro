/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  STELLA — The Compliance Copilot (Regional)                   ║
 * ║  Asistente Proactivo de Inteligencia Aduanera                 ║
 * ║  © IPL / Orion Freight System — ZENITH Platform               ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * Stella adapts her compliance advice based on the active jurisdiction:
 *   PA → ANA, Decreto Ley 1/2008, CAUCA IV
 *   CR → DGA, Ley 7557, TICA, Ministerio de Hacienda
 *   GT → SAT, Ley Aduanera Nacional, FEL
 */

import type { ZodFinding, ZodValidationResult, ZodRegion } from './zod-engine';
import type { LexisExtractionResult, LexisMemoryEntry } from './lexis-engine';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type StellaInsightType = 'recommendation' | 'warning' | 'learning' | 'compliance' | 'training';

export interface StellaInsight {
  id: string;
  type: StellaInsightType;
  title: string;
  message: string;
  source: 'zod_correction' | 'pattern_analysis' | 'regulatory_update' | 'user_query' | 'proactive';
  context?: string;
  legalReference?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  acknowledged: boolean;
  region?: ZodRegion;
}

export interface StellaMemoryLayer {
  zodCorrections: ZodCorrectionMemory[];
  lexisPatterns: LexisPatternMemory[];
  operatorPreferences: OperatorPreference[];
  regulatoryAlerts: RegulatoryAlert[];
}

interface ZodCorrectionMemory {
  rule: string;
  field: string;
  originalValue: string | number;
  correctedValue: string | number;
  occurrences: number;
  lastSeen: string;
  suggestion: string;
}

interface LexisPatternMemory {
  documentType: string;
  supplierPattern: string;
  commonErrors: string[];
  successRate: number;
}

interface OperatorPreference {
  operatorId: string;
  preferredView: string;
  notificationLevel: StellaInsightType[];
  lastActive: string;
}

interface RegulatoryAlert {
  id: string;
  jurisdiction: ZodRegion;
  title: string;
  effectiveDate: string;
  description: string;
  impactLevel: 'low' | 'medium' | 'high';
}

export interface StellaContext {
  currentRoute: string;
  activeDocument?: string;
  userRole?: string;
  recentActions: string[];
  jurisdiction?: ZodRegion;
}

// ═══════════════════════════════════════════════════════════════
// JURISDICTION-SPECIFIC SYSTEM PROMPTS
// ═══════════════════════════════════════════════════════════════

export const STELLA_JURISDICTION_PROMPTS: Record<ZodRegion, string> = {
  PA: `Jurisdicción activa: PANAMÁ.
Autoridad: Autoridad Nacional de Aduanas (ANA).
Legislación principal: Decreto Ley 1 de 2008 (Ley General de Aduanas), CAUCA IV / RECAUCA.
Sistema electrónico: SIGA (Sistema Integrado de Gestión Aduanera — CrimsonLogic).
Impuesto al consumo: ITBMS 7% (Art. 1057-V Código Fiscal).
Identificación fiscal: RUC / Cédula panameña.
Particularidades: Zona Libre de Colón (ZLC), Régimen de Áreas Económicas Especiales, AFC.`,

  CR: `Jurisdicción activa: COSTA RICA.
Autoridad: Dirección General de Aduanas (DGA) — Ministerio de Hacienda.
Legislación principal: Ley General de Aduanas 7557, CAUCA IV / RECAUCA, Ley 9635 (IVA).
Sistema electrónico: TICA (Tecnología de Información para el Control Aduanero).
Impuesto al consumo: IVA 13% (Ley 9635).
Identificación fiscal: Cédula Jurídica (3-XXX-XXXXXX), Cédula Física (X-XXXX-XXXX), DIMEX.
Particularidades: Zona Franca Regímenes Especiales, PROCOMER, requisitos fitosanitarios SENASA.
Documentos regionales: DUCA-F (Declaración Única Centroamericana — Factura), DUCA-T (Tránsito).`,

  GT: `Jurisdicción activa: GUATEMALA.
Autoridad: Superintendencia de Administración Tributaria (SAT).
Legislación principal: Ley Aduanera Nacional, CAUCA IV / RECAUCA, Decreto 27-92 (Ley del IVA).
Sistema electrónico: SAQB'E (portal SAT), sistema DUCA electrónica.
Impuesto al consumo: IVA 12% (Decreto 27-92 Art. 10).
Identificación fiscal: NIT (Número de Identificación Tributaria), CUI/DPI.
Particularidades: Factura Electrónica en Línea (FEL) obligatoria, ZDEEP (Zonas de Desarrollo Económico Especial Público).
Documentos regionales: DUCA-F, DUCA-T, FEL (DTE).`,
};

// ═══════════════════════════════════════════════════════════════
// STELLA ENGINE
// ═══════════════════════════════════════════════════════════════

export class StellaEngine {
  private static instance: StellaEngine | null = null;
  private insights: StellaInsight[] = [];
  private insightCounter = 0;
  private _currentJurisdiction: ZodRegion = 'PA';

  private memory: StellaMemoryLayer = {
    zodCorrections: [],
    lexisPatterns: [],
    operatorPreferences: [],
    regulatoryAlerts: [],
  };

  private constructor() {
    this.loadMemory();
    this.initializeRegulatoryAlerts();
  }

  static getInstance(): StellaEngine {
    if (!StellaEngine.instance) {
      StellaEngine.instance = new StellaEngine();
    }
    return StellaEngine.instance;
  }

  // ── Jurisdiction Management ─────────────────────────────

  get currentJurisdiction(): ZodRegion {
    return this._currentJurisdiction;
  }

  setJurisdiction(region: ZodRegion): void {
    this._currentJurisdiction = region;
    this.addInsight({
      type: 'compliance',
      title: `Jurisdicción cambiada: ${this.getJurisdictionLabel(region)}`,
      message: `Stella ahora referencia la legislación y autoridad de ${this.getJurisdictionLabel(region)}.`,
      source: 'proactive',
      priority: 'low',
      region,
    });
  }

  getJurisdictionLabel(region: ZodRegion): string {
    const labels: Record<ZodRegion, string> = { PA: 'Panamá', CR: 'Costa Rica', GT: 'Guatemala' };
    return labels[region];
  }

  getSystemPromptForJurisdiction(region?: ZodRegion): string {
    return STELLA_JURISDICTION_PROMPTS[region || this._currentJurisdiction];
  }

  // ── Learning from ZOD Corrections ────────────────────────

  learnFromZodValidation(zodResult: ZodValidationResult, lexisResult?: LexisExtractionResult): void {
    for (const finding of zodResult.findings) {
      if (finding.autoCorrection) {
        const existing = this.memory.zodCorrections.find(
          c => c.rule === finding.rule && c.field === finding.field
        );

        if (existing) {
          existing.occurrences++;
          existing.lastSeen = new Date().toISOString();
        } else {
          this.memory.zodCorrections.push({
            rule: finding.rule,
            field: finding.field || 'unknown',
            originalValue: finding.actual ?? '',
            correctedValue: finding.expected ?? '',
            occurrences: 1,
            lastSeen: new Date().toISOString(),
            suggestion: this.generateSuggestion(finding),
          });
        }

        if (existing && existing.occurrences >= 3) {
          this.addInsight({
            type: 'learning',
            title: `Patrón recurrente detectado: ${finding.rule}`,
            message: `El campo "${finding.field}" ha sido corregido ${existing.occurrences} veces. ${existing.suggestion}`,
            source: 'zod_correction',
            priority: existing.occurrences >= 10 ? 'high' : 'medium',
            region: zodResult.region,
          });
        }
      }
    }

    if (lexisResult) {
      const patternExists = this.memory.lexisPatterns.find(
        p => p.documentType === lexisResult.documentType && p.supplierPattern === lexisResult.supplier.value
      );

      if (patternExists) {
        const correctionRate = zodResult.correctionsMade / Math.max(zodResult.findings.length, 1);
        patternExists.successRate = (patternExists.successRate + (1 - correctionRate)) / 2;
      } else {
        this.memory.lexisPatterns.push({
          documentType: lexisResult.documentType,
          supplierPattern: String(lexisResult.supplier.value || ''),
          commonErrors: zodResult.findings.filter(f => f.severity !== 'info').map(f => f.field || ''),
          successRate: zodResult.score / 100,
        });
      }
    }

    this.saveMemory();
  }

  // ── Proactive Intelligence ───────────────────────────────

  getContextualAdvice(context: StellaContext): StellaInsight[] {
    const advice: StellaInsight[] = [];
    const jurisdiction = context.jurisdiction || this._currentJurisdiction;

    const routeAdvice = this.getRouteAdvice(context.currentRoute);
    if (routeAdvice) advice.push(routeAdvice);

    const highFreqCorrections = this.memory.zodCorrections
      .filter(c => c.occurrences >= 5)
      .slice(0, 3);

    for (const corr of highFreqCorrections) {
      advice.push(this.createInsight({
        type: 'recommendation',
        title: `Optimización sugerida: ${corr.field}`,
        message: corr.suggestion,
        source: 'pattern_analysis',
        priority: 'medium',
        region: jurisdiction,
      }));
    }

    const activeAlerts = this.memory.regulatoryAlerts.filter(a => {
      if (a.jurisdiction !== jurisdiction) return false;
      const effective = new Date(a.effectiveDate);
      const now = new Date();
      const daysBefore = 30;
      return effective.getTime() - now.getTime() < daysBefore * 86400000 && effective >= now;
    });

    for (const alert of activeAlerts) {
      advice.push(this.createInsight({
        type: 'compliance',
        title: `📋 ${alert.title}`,
        message: alert.description,
        source: 'regulatory_update',
        legalReference: `Jurisdicción: ${this.getJurisdictionLabel(alert.jurisdiction)}`,
        priority: alert.impactLevel === 'high' ? 'critical' : 'medium',
        region: alert.jurisdiction,
      }));
    }

    return advice;
  }

  // ── Training Mode (Guíame) ───────────────────────────────

  getTrainingSteps(route: string): { step: number; title: string; instruction: string }[] {
    const trainingMap: Record<string, { step: number; title: string; instruction: string }[]> = {
      '/': [
        { step: 1, title: 'Bienvenido al Centro de Comando', instruction: 'Este es el punto de partida. Desde aquí puedes cargar manifiestos usando el área de carga inteligente.' },
        { step: 2, title: 'Carga tu primer manifiesto', instruction: 'Arrastra un archivo Excel (.xlsx) al área designada. LEXIS detectará automáticamente las columnas.' },
        { step: 3, title: 'Revisión y Transmisión', instruction: 'Una vez procesado, Zod validará la integridad y podrás transmitir al sistema aduanero.' },
      ],
      '/lexis-ingress': [
        { step: 1, title: 'Portal de Ingreso LEXIS', instruction: 'Área A: Manifiesto (CSV/XLSX). Área B: Guía Master (PDF). Área C: Documentos de soporte (hasta 1,000 archivos). Soporta DUCA-F y DUCA-T para operaciones centroamericanas.' },
        { step: 2, title: 'Procesamiento Automático', instruction: 'LEXIS identificará automáticamente cada documento y lo vinculará con las guías del manifiesto.' },
      ],
      '/aranceles': [
        { step: 1, title: 'Buscador Arancelario', instruction: 'Ingresa una descripción de producto o código HS para buscar la partida arancelaria correcta.' },
        { step: 2, title: 'Resultado con tasas', instruction: 'El sistema mostrará DAI%, ISC%, y el impuesto al consumo según la jurisdicción activa.' },
      ],
    };

    return trainingMap[route] || [
      { step: 1, title: 'Stella está aquí para ayudar', instruction: 'Pregúntame cualquier duda sobre esta pantalla o sobre procedimientos aduaneros.' },
    ];
  }

  // ── Emergency Protocol ───────────────────────────────────

  triggerEmergencyProtocol(reason: string): StellaInsight {
    return this.addInsight({
      type: 'warning',
      title: '🚨 PROTOCOLO DE EMERGENCIA',
      message: `Stella ha detectado un riesgo crítico: ${reason}. Acción bloqueada hasta verificación manual.`,
      source: 'proactive',
      priority: 'critical',
      region: this._currentJurisdiction,
    });
  }

  // ── Queries ──────────────────────────────────────────────

  getInsights(limit = 20): StellaInsight[] {
    return this.insights.slice(-limit);
  }

  getUnacknowledged(): StellaInsight[] {
    return this.insights.filter(i => !i.acknowledged);
  }

  acknowledgeInsight(id: string): void {
    const insight = this.insights.find(i => i.id === id);
    if (insight) insight.acknowledged = true;
  }

  getMemoryStats(): { zodCorrections: number; lexisPatterns: number; avgSuccessRate: number } {
    const rates = this.memory.lexisPatterns.map(p => p.successRate);
    return {
      zodCorrections: this.memory.zodCorrections.length,
      lexisPatterns: this.memory.lexisPatterns.length,
      avgSuccessRate: rates.length > 0 ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) : 0,
    };
  }

  // ── Internals ────────────────────────────────────────────

  private addInsight(data: Omit<StellaInsight, 'id' | 'timestamp' | 'acknowledged'>): StellaInsight {
    const insight = this.createInsight(data);
    this.insights.push(insight);
    if (this.insights.length > 500) this.insights.shift();
    return insight;
  }

  private createInsight(data: Omit<StellaInsight, 'id' | 'timestamp' | 'acknowledged'>): StellaInsight {
    return {
      id: `STELLA-${++this.insightCounter}`,
      ...data,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };
  }

  private generateSuggestion(finding: ZodFinding): string {
    switch (finding.rule) {
      case 'ZOD-CIF-001':
        return 'Considere incluir el seguro en la factura comercial para evitar la aplicación automática del seguro teórico.';
      case 'ZOD-CIF-002':
        return 'Verifique que la factura incluya un desglose correcto de FOB + Flete + Seguro = CIF.';
      case 'ZOD-CIF-004':
        return 'Se recomienda solicitar facturas con precios de mercado documentados para evitar alertas de subvaluación.';
      case 'ZOD-FISCAL-002':
        return 'Verifique el formato de identificación fiscal del consignatario según la jurisdicción activa.';
      default:
        return 'Revise el documento fuente y corrija el campo indicado.';
    }
  }

  private getRouteAdvice(route: string): StellaInsight | null {
    const adviceMap: Record<string, { title: string; message: string }> = {
      '/siga-gateway': {
        title: 'Transmisión Electrónica',
        message: 'Antes de transmitir, verifique que todos los documentos tengan el sello Zod ✓ y que la firma digital esté vigente.',
      },
      '/horizonte-carga': {
        title: 'Horizonte de Carga',
        message: 'Los embarques se ordenan por ETA. Los que tienen Salud Documental < 70% requieren atención inmediata.',
      },
    };

    const advice = adviceMap[route];
    if (!advice) return null;

    return this.createInsight({
      type: 'recommendation',
      title: advice.title,
      message: advice.message,
      source: 'proactive',
      priority: 'low',
    });
  }

  private initializeRegulatoryAlerts(): void {
    this.memory.regulatoryAlerts = [
      {
        id: 'REG-PA-2026-01',
        jurisdiction: 'PA',
        title: 'Actualización Arancel Nacional 2026',
        effectiveDate: '2026-01-01',
        description: 'Nuevas partidas arancelarias y ajustes de tasas DAI para productos tecnológicos y farmacéuticos.',
        impactLevel: 'high',
      },
      {
        id: 'REG-CR-2026-01',
        jurisdiction: 'CR',
        title: 'TICA v4.0 — Nuevo formato XML',
        effectiveDate: '2026-06-01',
        description: 'Costa Rica actualiza el formato de transmisión electrónica TICA. Requiere adaptación del conector.',
        impactLevel: 'medium',
      },
      {
        id: 'REG-CR-2026-02',
        jurisdiction: 'CR',
        title: 'DUCA electrónica obligatoria',
        effectiveDate: '2026-04-01',
        description: 'Ministerio de Hacienda exige DUCA-F y DUCA-T electrónicas para todo tránsito centroamericano.',
        impactLevel: 'high',
      },
      {
        id: 'REG-GT-2026-01',
        jurisdiction: 'GT',
        title: 'SAT Guatemala — Factura Electrónica FEL',
        effectiveDate: '2026-03-01',
        description: 'Guatemala exige Factura Electrónica en Línea para todas las importaciones de valor > Q10,000.',
        impactLevel: 'medium',
      },
      {
        id: 'REG-GT-2026-02',
        jurisdiction: 'GT',
        title: 'SAT — Validación NIT obligatoria',
        effectiveDate: '2026-02-01',
        description: 'SAT exige validación electrónica de NIT en cada declaración aduanera. Integración con servicio SAT requerida.',
        impactLevel: 'high',
      },
    ];
  }

  private loadMemory(): void {
    try {
      const stored = localStorage.getItem('stella-memory');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.memory = { ...this.memory, ...parsed };
      }
    } catch { /* fresh start */ }
  }

  private saveMemory(): void {
    try {
      localStorage.setItem('stella-memory', JSON.stringify(this.memory));
    } catch { /* non-critical */ }
  }

  destroy(): void {
    StellaEngine.instance = null;
  }
}

// ── Singleton Export ────────────────────────────────────────
export const stellaEngine = StellaEngine.getInstance();
