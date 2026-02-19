/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  THE TRINITY — ZENITH Core Engines (Regional)                 ║
 * ║  LEXIS · ZOD · STELLA                                        ║
 * ║  ZENITH Customs Intelligence Platform                         ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * Architecture: LEXIS extracts → ZOD validates → STELLA learns
 * Regions: PA (Panamá) · CR (Costa Rica) · GT (Guatemala)
 */

export { LexisEngine, lexisEngine } from './lexis-engine';
export type { LexisDocumentType, LexisExtractionResult, LexisLineItem, LexisExtractionField, LexisMemoryEntry } from './lexis-engine';

export { ZodEngine, zodEngine, REGIONAL_TAX_CONFIG } from './zod-engine';
export type { ZodFinding, ZodValidationResult, ZodSeverity, ZodCIFInput, ZodDeclarationInput, ZodRegion, RegionalTaxConfig } from './zod-engine';

export { StellaEngine, stellaEngine, STELLA_JURISDICTION_PROMPTS } from './stella-engine';
export type { StellaInsight, StellaInsightType, StellaContext, StellaMemoryLayer } from './stella-engine';

export { PrecedentEngine, precedentEngine, GRI_RULES } from './precedent-engine';
export type { CustomsPrecedent, GRIRule, PrecedentSearchResult, GRIAnalysis, PrecedentValidation } from './precedent-engine';

export { LEXIS_PATTERNS } from './lexis-patterns';
