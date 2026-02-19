# SOVEREIGN STYLE GUIDE

## ZENITH Customs Intelligence Platform — Immutable Code Standards

> **Classification:** Internal Engineering Standard  
> **Effective Date:** 2026-02-19  
> **Scope:** All source code, documentation, configuration, and UI copy across the ZENITH platform.

---

## 1. Prohibition of Personal Identifiers

All contributions **MUST** be free of personal names, aliases, or individually attributable references.

| ❌ Prohibited | ✅ Required Replacement |
|---|---|
| Developer names in headers | `Core Development Team` |
| Author tags (`@author John`) | `@maintained-by ZENITH Engineering` |
| Personal email addresses | Role-based addresses or omit |
| GitHub usernames in comments | Generic references (`see commit history`) |
| Dedications or memos to individuals | Technical objective statements |

**Rule:** If a human name appears anywhere in the codebase, it is a compliance violation.

---

## 2. Platform-Agnostic Technical Terminology

Code, comments, and documentation must use **neutral infrastructure vocabulary** to ensure portability across cloud providers and deployment targets.

| ❌ Prohibited | ✅ Required Replacement |
|---|---|
| Vendor-specific project names | `Production Environment` |
| Internal codenames (e.g., "Antigravity") | `Target Infrastructure` |
| Provider-locked terms (e.g., "our AWS") | `Cloud Instance` / `Compute Layer` |
| Client/company branding in logic | `Tenant Configuration` |

### Approved Vocabulary

| Domain | Terms |
|---|---|
| **Deployment** | Production Environment, Staging Instance, Target Infrastructure |
| **Architecture** | Service Layer, Engine Module, Data Pipeline, Gateway |
| **Security** | Integrity Tunnel, Verification Layer, Audit Trail |
| **Data** | Record Store, Persistence Layer, Sync Queue |
| **Users** | Operator, Administrator, Auditor, System (never personal names) |

---

## 3. Institutional Logic Entities

The three core engines are classified as **Institutional Logic Entities (ILEs)**. They are not tools, plugins, or assistants — they are autonomous expert systems with defined jurisdictions.

### 3.1 LEXIS — The Intelligent Scribe

- **Classification:** Autonomous Document Ingestion Engine
- **Jurisdiction:** Parsing, field extraction, and SQL mapping of commercial documents (Invoices, BL, DUCA-F/T/D, FEL)
- **Behavior:** Deterministic pattern matching with a memory layer for learned corrections
- **UI Persona:** Neutral — reports data, never offers opinions

### 3.2 ZOD — The Integrity Sentinel

- **Classification:** Forensic Audit and Validation Engine
- **Jurisdiction:** Fiscal integrity verification, SHA-256 immutable sealing, multi-jurisdiction tax compliance (PA/CR/GT)
- **Behavior:** Cites legal basis (CAUCA IV, RECAUCA, local fiscal codes) in every finding
- **UI Persona:** Authoritative — presents findings as compliance facts, never suggestions

### 3.3 STELLA — The Regulatory Copilot

- **Classification:** Context-Aware Advisory Engine
- **Jurisdiction:** Regulatory guidance, jurisdiction-sensitive alerts, operator assistance
- **Behavior:** Adapts system prompts based on active `country_code` (PA → ANA, CR → DGA, GT → SAT)
- **UI Persona:** Professional — addresses users by role (`Operador`, `Administrador`), never by name

### ILE Communication Rules

```
LEXIS → ZOD    : Extracted data submitted for integrity validation
ZOD   → STELLA : Audit findings forwarded for contextual advisory
STELLA → LEXIS : Memory corrections fed back for pattern improvement
```

All inter-engine communication passes through the **Nexus Bridge** with HMAC-SHA256 signed payloads.

---

## 4. Mandatory Compliance in Future Expansion

### 4.1 New Files

Every new `.ts`, `.tsx`, or `.md` file **MUST**:

- Use only role-based attribution (`@maintained-by ZENITH Engineering`)
- Reference infrastructure in generic terms
- Follow the approved vocabulary table above

### 4.2 New Engines or Modules

Any new logic entity **MUST**:

- Be registered in `src/lib/engines/index.ts`
- Have a defined classification (Engine, Service, Validator, Gateway)
- Include jurisdiction scope if region-dependent
- Never embed personal or vendor-specific identifiers

### 4.3 New Regions

When adding jurisdictions beyond PA/CR/GT:

- Add tax configuration to `REGIONAL_TAX_CONFIG` in `zod-engine.ts`
- Add document patterns to `lexis-patterns.ts`
- Add jurisdiction context to `stella-engine.ts`
- Add `country_code` value to database constraints

### 4.4 Code Review Checklist

Before merging any contribution, verify:

- [ ] No personal names in code, comments, or strings
- [ ] No vendor-specific infrastructure references
- [ ] ILEs referenced by official classification
- [ ] UI copy uses role-based addressing only
- [ ] Mock data uses generic corporate identifiers
- [ ] File headers follow the institutional template

---

## 5. File Header Template

```typescript
/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  [MODULE NAME] — [Short Description]                         ║
 * ║  ZENITH Customs Intelligence Platform                         ║
 * ║  @maintained-by ZENITH Engineering                            ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
```

---

## 6. Governance

This document is the **immutable style standard** of the ZENITH platform. Deviations require formal review and approval by the System Architecture Board. All automated linting and CI pipelines should enforce these rules programmatically where possible.

---

*ZENITH Customs Intelligence Platform — Sovereign by Design*
