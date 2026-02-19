/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  THE TRINITY — ZENITH Core Engines (Regional)                 ║
 * ║  LEXIS · ZOD · STELLA                                        ║
 * ║  © IPL / Orion Freight System                                 ║
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

export { LEXIS_PATTERNS } from './lexis-patterns';
