# ZENITH — System Status Report

## Customs Intelligence Platform · Technical Status Document

| Field | Value |
|---|---|
| **Document Classification** | Internal Engineering — Transfer of Knowledge |
| **Platform Version** | 2.0.26 |
| **Jurisdictions** | PA (Panamá) · CR (Costa Rica) · GT (Guatemala) |
| **Architecture** | AI-First · Offline-Ready · Multi-Tenant |
| **Date of Issue** | 2026-02-25 |
| **Prepared by** | Core Development Team — System Architecture Division |

---

## Table of Contents

1. [Core Architecture — The Trinity of Engines](#1-core-architecture--the-trinity-of-engines)
2. [Advanced Modules & Legal Precedents](#2-advanced-modules--legal-precedents)
3. [Resilience & Security Protocols](#3-resilience--security-protocols)
4. [User Interface & Experience](#4-user-interface--experience)
5. [Data Infrastructure](#5-data-infrastructure)
6. [Certification Status — Sovereignty Stress Test](#6-certification-status--sovereignty-stress-test)
7. [Technical Debt & Roadmap](#7-technical-debt--roadmap)
8. [Environment Configuration](#8-environment-configuration)

---

## 1. Core Architecture — The Trinity of Engines

The platform is articulated around three **Institutional Logic Entities (ILEs)** encapsulated in `src/lib/engines/`. The data flow follows the invariant pipeline:

```
LEXIS extracts → ZOD validates → STELLA learns
```

### 1.1 LEXIS — The Intelligent Scribe

| Attribute | Status |
|---|---|
| **Module** | `src/lib/engines/lexis-engine.ts` |
| **Status** | ✅ Operational |
| **Pattern** | Singleton · Regex-based extraction with confidence scoring |

**Capabilities:**

- **Document Ingestion:** Autonomous processing of Commercial Invoices, Bills of Lading (BL/CP), Packing Lists, and Manifests.
- **Regional Documents:** Full support for DUCA-F (Formulario), DUCA-T (Tránsito), DUCA-D (Declaración), DUA (Documento Único Aduanero), and FEL (Factura Electrónica — Guatemala).
- **Field Extraction:** Supplier, Client, Line Items, Quantities, Unit Values, Freight, Insurance, Incoterms, Country of Origin.
- **Memory Layer:** Learns from ZOD corrections to improve future extraction accuracy. Stores correction history in `localStorage` (migration target: managed persistence).
- **SQL Column Mapping:** Direct mapping of extracted fields to database schema for automated persistence.
- **Supporting Modules:**
  - `lexis-patterns.ts` — Centralized regex pattern library for multi-format detection.
  - `DocumentSniffer` (`src/lib/sniffer/`) — Auto-classification of uploaded file types.
  - `ManifestSnifferCourier` — Specialized sniffer for courier manifest formats.
  - `OrphanMatcher` — Reconciliation engine for unmatched guide/manifest entries.

### 1.2 ZOD — The Integrity Engine

| Attribute | Status |
|---|---|
| **Module** | `src/lib/engines/zod-engine.ts` |
| **Status** | ✅ Operational |
| **Pattern** | Singleton · Immutable validation rules · SHA-256 chain hashing |

**Capabilities:**

- **Core Rule (Immutable):** `CIF = FOB + Freight + Insurance` — Legal basis: Decreto Ley 1/2008 Art. 60 (PA), Ley General de Aduanas Art. 252 (CR), Código Aduanero Uniforme Centroamericano (GT).
- **Regional Fiscal Cascade:**

  | Jurisdiction | VAT Rate | System Fee | Identity Format |
  |---|---|---|---|
  | PA (Panamá) | 7% ITBMS | 0.5% Tasa de Servicios | RUC |
  | CR (Costa Rica) | 13% IVA | 1% Servicio Aduanero | Cédula Jurídica |
  | GT (Guatemala) | 12% IVA | — | NIT |

- **Tax Cascade Validation:** `DAI → ISC → VAT + System Fee` with auto-detection of applicable rates per HS code.
- **Subvaluation Detection:** Automatic detection of declared values below statistical thresholds with `ZOD-SUBVAL` alert emission.
- **SHA-256 Integrity Hashing:** Every validated record receives a cryptographic hash chained to the previous record (`hash_content`, `hash_previous`), creating an immutable audit trail.
- **Precedent Validation:** Before issuing a blocking alert on HS code discrepancies, ZOD queries the `PrecedentEngine` to check for existing advance rulings that may endorse the declared classification.

**MarginGuardian Module** (Revenue Leakage Protection):

| Alert Code | Trigger | Action |
|---|---|---|
| `ZOD-MARGIN-LOW` | Profit margin < 15% | Warning with deficit calculation |
| `ZOD-MARGIN-NEG` | Operational loss detected | Critical block — requires supervisor override |

The MarginGuardian compares agency fees (income) against operational costs per procedure, ensuring fiscal sustainability before declaration finalization.

### 1.3 STELLA — The Compliance Copilot

| Attribute | Status |
|---|---|
| **Module** | `src/lib/engines/stella-engine.ts` |
| **Status** | ✅ Operational |
| **Persona** | Senior Compliance Advisor (Jurisdiction-adaptive) |

**Capabilities:**

- **Proactive Intelligence:** Context-aware advice based on the active route, jurisdiction, and document type being processed.
- **Jurisdiction-Adaptive Personality:**
  - **PA:** References Código Fiscal, Decreto de Gabinete No. 41/2002, Resoluciones ANA.
  - **CR:** References Ley General de Aduanas, Boletines MH-DGA-RES, Sistema TICA protocols.
  - **GT:** References Código Aduanero, Resoluciones SAT-IAD, Portal SAT consultation framework.
- **Memory Layer:** Learns from ZOD corrections applied to LEXIS-processed documents. Builds a knowledge graph of common errors and their resolutions.
- **Training Mode ("Guíame"):** Step-by-step tutorials contextual to each screen, enabling operator onboarding without external documentation.
- **Emergency Protocol:** Blocks critical user actions when compliance risks are detected (e.g., attempting to submit a declaration with unresolved `ZOD-CRITICAL` findings).
- **Precedent Citations:** When explaining a finding, STELLA cites: *"Basado en la Resolución Anticipada [ID] de la [Autoridad], este producto se clasifica bajo la partida XXXX debido a [Razón Técnica]."*

---

## 2. Advanced Modules & Legal Precedents

### 2.1 Precedent Engine — Legal Reasoning Brain

| Attribute | Status |
|---|---|
| **Module** | `src/lib/engines/precedent-engine.ts` |
| **Status** | ✅ Operational |
| **Database** | `customs_precedents` (Lovable Cloud) |

**General Rules of Interpretation (GRI) — SAC/HS System:**

The engine codifies the 6 GRI rules for automated tariff classification reasoning:

| Rule | Name | Application |
|---|---|---|
| GRI 1 | Titles of Sections & Chapters | Default rule — classification by section/chapter heading text |
| GRI 2(a) | Incomplete or Unfinished Articles | Extends classification to unassembled or disassembled goods |
| GRI 2(b) | Mixtures & Combinations | Classification of mixed materials by essential character |
| GRI 3(a) | Most Specific Description | When two headings apply, the most specific prevails |
| GRI 3(b) | Essential Character | For composite goods, classification by the component that gives essential character |
| GRI 3(c) | Last in Numerical Order | Tie-breaker when GRI 3(a) and 3(b) are inconclusive |
| GRI 4 | Most Closely Akin | For goods not classifiable under GRI 1–3, classification by analogy |
| GRI 5 | Cases & Containers | Special rules for packaging materials |
| GRI 6 | Subheading Classification | Application of GRI 1–5 at the subheading level |

**Regional Precedent Database:**

| Jurisdiction | Authority | Example Rulings | Ruling Types |
|---|---|---|---|
| PA | Autoridad Nacional de Aduanas (ANA) | RES-ANA-466-2014, DICT-TA-2023-xxx | Clasificación, Valoración, Origen |
| CR | Dirección General de Aduanas (DGA) | MH-DGA-RES-xxx, TICA-CIRC-xxx | Clasificación, Valoración |
| GT | Intendencia de Aduanas — SAT | SAT-IAD-RES-xxx | Clasificación, Origen |

**Integration Points:**
- **ZOD:** Emits `ZOD-PREC-001` (Endorsed by precedent), `ZOD-PREC-002` (Conflict with precedent), `ZOD-PREC-003` (No precedent found).
- **STELLA:** Uses precedent data to generate legally-grounded advisory messages.

### 2.2 Compliance Vault — Digital Signature Infrastructure

| Attribute | Status |
|---|---|
| **Module** | `src/lib/security/ComplianceVault.ts` |
| **Status** | ✅ Operational |

**Regional Certificate Standards:**

| Jurisdiction | Authority | Standard | Key Length |
|---|---|---|---|
| PA | Dirección Nacional de Firma Electrónica (DNFE) | Ley 51/2008 | RSA-2048+ |
| CR | MICITT | Ley 8454 | RSA-2048+ |
| GT | Registro de Prestadores de Servicios de Certificación (RPSC) | Decreto 47-2008 | RSA-2048+ |

**Cascade Signature Workflows:**

The vault supports sequential multi-signer authorization:

```
Corredor (Broker) → Revisor (Reviewer) → Agente (Agent)
```

Each signature step generates an SHA-256 audit hash. The workflow halts if any signer's certificate is expired, revoked, or outside its jurisdictional scope.

**Audit Trail:** Every signing event is logged with: `signerId`, `action`, `timestamp`, `certificateSerial`, `resultHash`. The log is append-only and immutable.

---

## 3. Resilience & Security Protocols

### 3.1 Resilience Module

| Component | File | Status |
|---|---|---|
| Circuit Breaker | `src/lib/resilience/CircuitBreaker.ts` | ✅ Active |
| SyncManager | `src/lib/resilience/SyncManager.ts` | ✅ Active |
| Integrity Auditor | `src/lib/resilience/IntegrityAuditor.ts` | ✅ Active |
| Anomaly Detector | `src/lib/resilience/AnomalyDetector.ts` | ✅ Active |
| Health Monitor | `src/lib/resilience/HealthMonitor.ts` | ✅ Active |

**Circuit Breaker:**
- Monitors external service latency (ANA/SIGA/CrimsonLogic endpoints).
- Transitions to `OPEN` state when latency exceeds `5,000ms` or failure rate surpasses threshold.
- Retry interval: `120,000ms` (configurable via `APP_CONFIG.CIRCUIT_BREAKER_RETRY_MS`).
- Activates asynchronous retry queue during `OPEN` state.

**SyncManager (Offline-First):**
- Persists pending operations in `localStorage` when network connectivity is lost.
- Implements **exponential backoff** strategy for retry scheduling.
- Queue capacity: 100+ operations with FIFO processing order.
- Automatic reconciliation upon connectivity restoration.

**Integrity Auditor:**
- Performs periodic SHA-256 hash verification on critical records.
- Calculates the **Resilience Index** ($R_i$) in real-time:

$$R_i = \left(1 - \frac{T_{\text{failures}}}{T_{\text{total}}}\right) \times 100$$

- Triggers alerts when $R_i$ drops below operational thresholds.

**Anomaly Detector:**
- Monitors download velocity to prevent data exfiltration.
- Threshold: `50 downloads/minute` (configurable via `APP_CONFIG.ANOMALY_DOWNLOAD_THRESHOLD`).
- Triggers MFA gate upon anomaly detection.

### 3.2 Nexus Bridge — Encrypted Communication Tunnel

| Attribute | Status |
|---|---|
| **Module** | `src/lib/security/nexus-bridge.ts` |
| **Edge Function** | `supabase/functions/nexus-bridge/index.ts` |
| **Status** | ✅ Operational |
| **Authentication** | HMAC-SHA256 per payload |

**Security Mechanisms:**
- **HMAC Signature Verification:** Every payload is signed with `NEXUS_SECRET_KEY`. Any mismatch triggers `SIGNATURE_MISMATCH` alert and IP blocking.
- **Replay Attack Prevention:** Nonce-based deduplication prevents reprocessing of intercepted payloads.
- **Immutable Logging:** All traffic is recorded in `nexus_traffic_logs` with `payload_hash`, `verification_status`, and `zod_score`.
- **Bidirectional Flow:** ORIÓN → ZENITH (ingestion documents) · ZENITH → ORIÓN (legal status, payment slips).

### 3.3 Data Integrity Shield

| Module | File | Purpose |
|---|---|---|
| DataIntegrityEngine | `src/lib/security/DataIntegrityEngine.ts` | Runtime integrity verification |
| CustomsShieldEngine | `src/lib/compliance/CustomsShieldEngine.ts` | Compliance enforcement layer |
| DLP Protected View | `src/components/security/DLPProtectedView.tsx` | Data Loss Prevention UI wrapper |

---

## 4. User Interface & Experience

### 4.1 Primary Views

| View | File | Purpose |
|---|---|---|
| Executive Command Center | `src/pages/Index.tsx` | System-wide operational dashboard |
| Jurisdiction Selector | `src/components/layout/JurisdictionSelector.tsx` | PA/CR/GT context switching |
| ROI Dashboard | `src/pages/ROIDashboardPage.tsx` | Return on investment metrics |
| Stella Client Portal | `src/pages/ClientePortalPage.tsx` | End-client self-service portal |
| Zenith Pulse Dashboard | `src/pages/ZenithPulsePage.tsx` | Real-time operational pulse |
| Courier Hub | `src/pages/CourierHubPage.tsx` | Courier operations management |
| Stress Test Console | `src/pages/StressTestPage.tsx` | Sovereignty certification tool |
| Security Admin | `src/pages/SecurityAdminPage.tsx` | Security event management |
| System Health | `src/pages/SystemHealthPage.tsx` | Infrastructure health monitoring |
| Enterprise Billing | `src/pages/EnterpriseBillingPage.tsx` | Multi-tier billing management |
| Feature Catalog | `src/pages/FeatureCatalogPage.tsx` | Platform capability index |

### 4.2 Custom Hooks

| Hook | Purpose |
|---|---|
| `useAgenteAduanal` | Customs agent workflow state management |
| `useSecurityEvents` | Security event stream subscription |
| `useStellaHelp` | STELLA advisory integration |
| `useSystemAudit` | System audit log management |
| `useTradeAdvisor` | Trade advisory panel state |
| `use-mobile` | Responsive breakpoint detection |
| `use-toast` | Notification system |

### 4.3 High-Density UI Components

- **Virtual Scrolling:** `@tanstack/react-virtual` for rendering 7,000+ row datasets without UI degradation (threshold: `APP_CONFIG.VIRTUAL_SCROLL_THRESHOLD = 500`).
- **Resizable Panels:** `react-resizable-panels` for adaptive workspace layouts.
- **Chart Engine:** `recharts` for real-time data visualization (fiscal cascades, compliance scores, throughput metrics).

---

## 5. Data Infrastructure

### 5.1 Critical Tables

| Table | Records Model | RLS | Immutability |
|---|---|---|---|
| `embarques_orion` | Shipment records with AFC/GS1 metadata | ✅ Role-based | No deletes |
| `pre_facturas` | Pre-invoice documents with ZOD integrity hash | ✅ Role-based | No deletes |
| `customs_precedents` | Legal precedents with GRI annotations | ✅ Privileged insert | No deletes |
| `nexus_traffic_logs` | Encrypted bridge traffic with payload hashes | ✅ Role-based | No deletes, no updates |
| `audit_logs` | Immutable audit chain with SHA-256 hashes | ✅ Owner + privileged | No deletes, no updates |
| `sys_audit_logs` | System-level audit events | ✅ Admin + IT Security | No deletes, no updates |
| `security_events` | Security incident records | ✅ Admin + IT Security | No deletes |
| `clasificaciones_validadas` | Validated HS code classifications | ✅ Privileged | No deletes |
| `consignatarios_fiscales` | Fiscal consignee registry | ✅ Role-based | No deletes |
| `validaciones_kyc` | KYC verification records | ✅ Privileged | No deletes |
| `corredores_acreditados` | Accredited broker profiles | ✅ Role-based | — |
| `onboarding_procesos` | Broker onboarding workflows | ✅ Privileged | No deletes |
| `mapeo_gs1_hts` | GS1/GTIN to HS code mappings | ✅ Privileged | No deletes |
| `regimenes_temporales` | Temporary regime tracking | ✅ Owner + privileged | No deletes |
| `service_contracts` | Service contract tariffs | ✅ Privileged | No deletes |
| `tarifarios_corredor` | Broker fee schedules | ✅ Owner + privileged | No deletes |
| `inspecciones_17pts` | 17-point inspection records | ✅ Owner-based | No deletes |
| `acuerdos_comerciales` | Trade agreement preferential rates | ✅ — | — |
| `consultas_clasificatorias` | Classification consultation records | ✅ Privileged | — |
| `proveedores_internacionales` | International vendor registry | ✅ Owner + privileged | No deletes |
| `alertas_peso` | Weight discrepancy alerts | ✅ Role-based | No deletes |
| `aprobaciones_cliente` | Client approval tokens | ✅ Authenticated | No deletes |
| `profiles` | User profile data | ✅ — | — |
| `user_roles` | Role-based access control | ✅ Admin only | — |

### 5.2 Database Functions

| Function | Type | Purpose |
|---|---|---|
| `handle_new_user()` | Trigger (SECURITY DEFINER) | Auto-creates `profiles` and `user_roles` entries on user registration |
| `get_user_role(_user_id)` | Query (SECURITY DEFINER) | Returns the highest-priority role for a given user |
| `has_role(_user_id, _role)` | Query (SECURITY DEFINER) | Boolean check for role membership — used extensively in RLS policies |
| `update_updated_at_column()` | Trigger | Auto-updates `updated_at` timestamp on row modification |

### 5.3 Role Hierarchy

```
master_admin > senior_broker > it_security > admin > auditor > revisor > operador > asistente > agente_campo
```

### 5.4 Edge Functions (Backend Functions)

| Function | JWT | Purpose |
|---|---|---|
| `extract-invoice-data` | ✅ Required | AI-powered invoice data extraction |
| `extract-ana-document` | ✅ Required | ANA document parsing and field extraction |
| `clasificar-hts-ai` | ✅ Required | AI-assisted HS code classification |
| `motor-aprendizaje-hts` | ✅ Required | Machine learning feedback loop for classification accuracy |
| `stella-help` | ❌ Public | STELLA advisory endpoint (Lovable AI integration) |
| `nexus-bridge` | ❌ Public | Encrypted inter-system communication tunnel (HMAC-secured) |
| `orion-listener` | ❌ Public | Webhook receiver for external system events |

### 5.5 Storage Buckets

| Bucket | Public | Purpose |
|---|---|---|
| `inspecciones-17pts` | ❌ | Inspection photo evidence storage |
| `onboarding-docs` | ❌ | Broker onboarding document uploads |

---

## 6. Certification Status — Sovereignty Stress Test

The platform underwent a 4-phase **Sovereignty Stress Test** to certify operational robustness. Implementation: `src/lib/demo/SovereigntyStressTestEngine.ts`.

### Phase Results Summary

| Phase | Name | Objective | Result |
|---|---|---|---|
| **1** | Chaos Ingestion | 500 mixed records with 85 sabotages (corrupt encoding, future dates, weight anomalies) | ✅ LEXIS identified regions; ZOD blocked all 85 errors without UI degradation |
| **2** | GRI Conflict (Consultant's Dilemma) | Solar Energy Kit — GRI 3(b) Essential Character application | ✅ PrecedentEngine applied GRI 3(b); ZOD emitted `ZOD-PREC-002`; fiscal cascade recalculated for PA/CR/GT |
| **3** | Infrastructure Failure | 100% API blackout (15,000ms latency) | ✅ Circuit Breaker → OPEN; SyncManager enqueued 100 operations; $R_i$ calculated in real-time |
| **4** | Security Breach (MITM) | Nexus Bridge payload tampering ($5,000 → $50) | ✅ `SIGNATURE_MISMATCH` alert fired; transaction blocked; immutable audit log generated |

**Certified Resilience Index:**

$$R_i = \left(1 - \frac{T_{\text{failures}}}{T_{\text{total}}}\right) \times 100$$

The stress test generates a **SHA-256 certification hash** upon completion, suitable for external audit submission.

---

## 7. Technical Debt & Roadmap

### 7.1 Pending External API Integrations

| System | Jurisdiction | Status | Notes |
|---|---|---|---|
| SIGA (CrimsonLogic) | PA | 🟡 Simulated | Gateway URL configured; awaiting production credentials |
| VUCE | PA | 🟡 Simulated | Endpoint defined; requires inter-agency authorization |
| ANA Consultas | PA | 🟡 Simulated | Public consultation API; requires formal access agreement |
| TICA | CR | 🔴 Pending | Costa Rica customs system; no integration started |
| SAT Portal | GT | 🔴 Pending | Guatemala tax authority; no integration started |

### 7.2 Refactoring Targets

| Area | Current State | Target State | Priority |
|---|---|---|---|
| LEXIS Memory Layer | `localStorage` | Managed cloud persistence | High |
| STELLA Memory Layer | `localStorage` | Managed cloud persistence | High |
| PrecedentEngine data | In-memory seed + DB | Full cloud-backed vector search | Medium |
| Worker threads | `src/lib/workers/procesador.worker.ts` | Web Worker pool for parallel processing | Medium |
| PDF processing | `pdfjs-dist` client-side | Server-side extraction via backend functions | Low |

### 7.3 Modules in Beta

| Module | Status | Notes |
|---|---|---|
| AFC (Advance Facilitation Certificate) | 🟡 Beta | `src/lib/afc/MotorAFC.ts` — Perishable goods priority logic |
| GS1 Synchronizer | 🟡 Beta | `src/lib/gs1/SincronizadorGS1Orion.ts` — GTIN/GLN validation |
| Multimodal Document Processor | 🟡 Beta | `src/lib/multimodal/ProcesadorDocumentalMultiModal.ts` |
| Enterprise Billing Engine | 🟡 Beta | `src/lib/financiero/MotorFacturacionEnterprise.ts` |
| Licensing Engine (ACA) | 🟡 Beta | `src/lib/licenciamiento/MotorLicenciamientoACA.ts` |

---

## 8. Environment Configuration

### Required Variables (`.env.example`)

```env
# ═══════════════════════════════════════════════════
# BACKEND CONFIGURATION (Required — Auto-provisioned)
# ═══════════════════════════════════════════════════
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon_key>
VITE_SUPABASE_PROJECT_ID=<project_id>

# ═══════════════════════════════════════════════════
# EXTERNAL CUSTOMS APIs (Optional — Defaults provided)
# ═══════════════════════════════════════════════════
# VITE_SIGA_GATEWAY_URL=https://siga.ana.gob.pa/api/v1
# VITE_VUCE_URL=https://vuce.gob.pa/api/v1
# VITE_ANA_CONSULTAS_URL=https://consultas.ana.gob.pa/api

# ═══════════════════════════════════════════════════
# BACKEND SECRETS (Server-side only — Cloud Dashboard)
# ═══════════════════════════════════════════════════
# LOVABLE_API_KEY=sk-...         → AI engine (STELLA, classification)
# SUPABASE_SERVICE_ROLE_KEY=...  → Auto-configured
# NEXUS_SECRET_KEY=...           → Inter-system HMAC signing
# RESEND_API_KEY=re_...          → Email notifications (optional)
```

### Configured Secrets (Cloud Dashboard)

| Secret | Status | Purpose |
|---|---|---|
| `LOVABLE_API_KEY` | ✅ Configured | AI model access for STELLA and classification engines |
| `SUPABASE_URL` | ✅ Auto | Backend endpoint |
| `SUPABASE_ANON_KEY` | ✅ Auto | Anonymous client key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Auto | Service role for backend functions |
| `SUPABASE_DB_URL` | ✅ Auto | Direct database connection |
| `SUPABASE_PUBLISHABLE_KEY` | ✅ Auto | Client-side publishable key |
| `NEXUS_SECRET_KEY` | ⚠️ Not configured | Required for Nexus Bridge HMAC verification |
| `RESEND_API_KEY` | ⚠️ Not configured | Optional — email notification service |

---

## Appendix A — File Structure Overview

```
src/
├── lib/
│   ├── engines/          ← Trinity: LEXIS · ZOD · STELLA · Precedent
│   ├── security/         ← ComplianceVault · DataIntegrity · NexusBridge
│   ├── resilience/       ← CircuitBreaker · SyncManager · IntegrityAuditor
│   ├── compliance/       ← CustomsShield · KYC · OEA · SanctionScore · VUCE
│   ├── core/             ← Classification · Liquidation · Digital Signature
│   ├── aduanas/          ← Tariff data · Exchange rates · Restrictions
│   ├── financiero/       ← Billing · Pre-Invoice · Tariff Calculator
│   ├── gs1/              ← GTIN Validator · GS1 Synchronizer · Incoterms
│   ├── siga/             ← SIGA Message Generator · Transmission Simulator
│   ├── courier/          ← Courier Hub Engine · Partner Config
│   └── demo/             ← Stress Test Engines
├── components/
│   ├── layout/           ← AppLayout · Sidebar · JurisdictionSelector
│   ├── zenith/           ← Advanced panels (OEA, VUCE, GRI, Client Portal)
│   ├── manifest/         ← Shipment processing components
│   ├── security/         ← DLP · MFA · Security Dashboard
│   ├── resilience/       ← Resilience Dashboard · Virtual Table
│   └── stella/           ← Chat · Training Mode · Message Bubble
└── pages/                ← Route-level page components

supabase/
├── functions/            ← Edge Functions (7 deployed)
├── migrations/           ← Database schema migrations
└── config.toml           ← Function configuration
```

---

## Appendix B — Dependency Matrix

| Package | Version | Purpose |
|---|---|---|
| `react` | ^18.3.1 | UI framework |
| `react-router-dom` | ^6.30.1 | Client-side routing |
| `@supabase/supabase-js` | ^2.89.0 | Backend SDK |
| `@tanstack/react-query` | ^5.83.0 | Server state management |
| `@tanstack/react-virtual` | ^3.13.18 | Virtual scrolling for large datasets |
| `crypto-js` | ^4.2.0 | SHA-256 hashing (ZOD integrity) |
| `recharts` | ^2.15.4 | Data visualization |
| `xlsx` | ^0.18.5 | Excel file processing (LEXIS ingestion) |
| `jspdf` | ^3.0.4 | PDF generation (audit packets) |
| `jszip` | ^3.10.1 | Archive generation (audit vault) |
| `pdfjs-dist` | 4.4.168 | PDF parsing (client-side) |
| `file-saver` | ^2.0.5 | File download management |
| `zod` | ^3.25.76 | Schema validation (forms) |
| `lucide-react` | ^0.462.0 | Icon system |
| `sonner` | ^1.7.4 | Toast notification system |
| `date-fns` | ^3.6.0 | Date manipulation |

---

*ZENITH Customs Intelligence Platform v2.0.26 — System Status Report*
*Classification: Internal Engineering — Transfer of Knowledge*
*Prepared by: Core Development Team — System Architecture Division*
