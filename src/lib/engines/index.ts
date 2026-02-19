/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  THE TRINITY — ZENITH Core Engines                            ║
 * ║  LEXIS · ZOD · STELLA                                        ║
 * ║  © IPL / Orion Freight System                                 ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * This barrel export provides unified access to the three core
 * engines that form the intellectual backbone of ZENITH.
 *
 * LEXIS (The Intelligent Scribe) — Document ingestion & extraction
 * ZOD   (The Integrity Engine)   — Forensic validation & compliance
 * STELLA (The Compliance Copilot) — Proactive intelligence & learning
 *
 * Architecture: LEXIS extracts → ZOD validates → STELLA learns
 */

export { LexisEngine, lexisEngine } from './lexis-engine';
export type { LexisDocumentType, LexisExtractionResult, LexisLineItem, LexisExtractionField, LexisMemoryEntry } from './lexis-engine';

export { ZodEngine, zodEngine } from './zod-engine';
export type { ZodFinding, ZodValidationResult, ZodSeverity, ZodCIFInput, ZodDeclarationInput } from './zod-engine';

export { StellaEngine, stellaEngine } from './stella-engine';
export type { StellaInsight, StellaInsightType, StellaContext, StellaMemoryLayer } from './stella-engine';

export { LEXIS_PATTERNS } from './lexis-patterns';
