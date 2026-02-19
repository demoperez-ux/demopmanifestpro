/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  STELLA — The Compliance Copilot                              ║
 * ║  Asistente Proactivo de Inteligencia Aduanera                 ║
 * ║  © IPL / Orion Freight System — ZENITH Platform               ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * Stella es la capa de inteligencia conversacional de ZENITH.
 * Aprende de las correcciones que ZOD hace sobre los documentos
 * que LEXIS procesa, generando una "memoria operativa" que
 * mejora la precisión del sistema con cada iteración.
 *
 * Identidad: Asesora Senior de Cumplimiento
 * Tono: Profesional, preciso, data-driven
 */

import type { ZodFinding, ZodValidationResult } from './zod-engine';
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
  jurisdiction: 'PA' | 'CR' | 'GT';
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
}

// ═══════════════════════════════════════════════════════════════
// STELLA ENGINE
// ═══════════════════════════════════════════════════════════════

export class StellaEngine {
  private static instance: StellaEngine | null = null;
  private insights: StellaInsight[] = [];
  private insightCounter = 0;

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

        // Generate proactive insight if pattern is recurring
        if (existing && existing.occurrences >= 3) {
          this.addInsight({
            type: 'learning',
            title: `Patrón recurrente detectado: ${finding.rule}`,
            message: `El campo "${finding.field}" ha sido corregido ${existing.occurrences} veces. ${existing.suggestion}`,
            source: 'zod_correction',
            priority: existing.occurrences >= 10 ? 'high' : 'medium',
          });
        }
      }
    }

    // Learn from LEXIS extraction quality
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

    // Route-specific advice
    const routeAdvice = this.getRouteAdvice(context.currentRoute);
    if (routeAdvice) advice.push(routeAdvice);

    // Check for recurring corrections
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
      }));
    }

    // Regulatory alerts
    const activeAlerts = this.memory.regulatoryAlerts.filter(a => {
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
        legalReference: `Jurisdicción: ${alert.jurisdiction}`,
        priority: alert.impactLevel === 'high' ? 'critical' : 'medium',
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
        { step: 3, title: 'Revisión y Transmisión', instruction: 'Una vez procesado, Zod validará la integridad y podrás transmitir al SIGA.' },
      ],
      '/lexis-ingress': [
        { step: 1, title: 'Portal de Ingreso LEXIS', instruction: 'Área A: Manifiesto (CSV/XLSX). Área B: Guía Master (PDF). Área C: Documentos de soporte (hasta 1,000 archivos).' },
        { step: 2, title: 'Procesamiento Automático', instruction: 'LEXIS identificará automáticamente cada documento y lo vinculará con las guías del manifiesto.' },
      ],
      '/aranceles': [
        { step: 1, title: 'Buscador Arancelario', instruction: 'Ingresa una descripción de producto o código HS para buscar la partida arancelaria correcta.' },
        { step: 2, title: 'Resultado con tasas', instruction: 'El sistema mostrará DAI%, ISC%, ITBMS% y la autoridad anuente correspondiente.' },
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
        return 'Considere incluir el seguro en la factura comercial para evitar la aplicación automática del seguro teórico (1.5%).';
      case 'ZOD-CIF-002':
        return 'Verifique que la factura incluya un desglose correcto de FOB + Flete + Seguro = CIF.';
      case 'ZOD-CIF-004':
        return 'Se recomienda solicitar facturas con precios de mercado documentados para evitar alertas de subvaluación.';
      default:
        return 'Revise el documento fuente y corrija el campo indicado.';
    }
  }

  private getRouteAdvice(route: string): StellaInsight | null {
    const adviceMap: Record<string, { title: string; message: string }> = {
      '/siga-gateway': {
        title: 'Transmisión SIGA',
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
        id: 'REG-GT-2026-01',
        jurisdiction: 'GT',
        title: 'SAT Guatemala — Factura Electrónica FEL',
        effectiveDate: '2026-03-01',
        description: 'Guatemala exige Factura Electrónica en Línea para todas las importaciones de valor > Q10,000.',
        impactLevel: 'medium',
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
