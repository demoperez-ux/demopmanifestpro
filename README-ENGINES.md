# ZENITH — Core Engines Technical Reference

## Classification: Internal Engineering Documentation

These three engines form the **core intelligence layer** of the ZENITH platform.
They must be preserved intact during any infrastructure migration.

---

## Architecture: `LEXIS extracts → ZOD validates → STELLA learns`

### 1. LEXIS — The Intelligent Scribe
**File:** `src/lib/engines/lexis-engine.ts`

- Autonomous ingestion of Commercial Invoices, Bills of Lading (BL/CP), and Manifests
- Regex-based field extraction with confidence scoring
- Supports: Supplier, Client, Items, Quantities, Unit Values, Freight, Insurance
- Regional documents: DUCA-F, DUCA-T, DUA, FEL (Guatemala)
- Memory layer: learns from ZOD corrections to improve extraction accuracy
- SQL column mapping for direct database persistence

### 2. ZOD — The Integrity Engine
**File:** `src/lib/engines/zod-engine.ts`

- **Immutable** validation rules based on regional customs law
- Multi-jurisdiction support: PA (7% ITBMS), CR (13% IVA), GT (12% IVA)
- Core Rule: `CIF = FOB + Freight + Insurance` (Decreto Ley 1/2008 Art. 60)
- Tax cascade validation: `DAI → ISC → VAT` + System Fee per jurisdiction
- SHA-256 integrity hashing with chain verification
- Subvaluation detection and auto-correction
- Legal basis citations: CAUCA IV, RECAUCA, Código Fiscal

### 3. STELLA — The Compliance Copilot
**File:** `src/lib/engines/stella-engine.ts`

- Proactive intelligence advisor (Senior Compliance Advisor persona)
- **Memory Layer**: Learns from ZOD corrections on LEXIS-processed documents
- Context-aware advice based on active route and jurisdiction
- Training Mode ("Guíame"): Step-by-step tutorials for each screen
- Emergency Protocol: Blocks critical actions when compliance risks are detected
- Regulatory alerts for PA, CR, GT jurisdictions

---

## Infrastructure Migration Notes

1. These files are **infrastructure-agnostic** — they use no platform-specific APIs
2. They depend only on `crypto-js` (for ZOD hashing) and `localStorage` (for memory)
3. For cloud migration: replace `localStorage` with managed persistence (e.g., DynamoDB/S3)
4. The engines are singletons — maintain this pattern in any deployment

## Defense Protocols

The platform includes 4 active defense protocols:
- **Circuit Breaker** (`src/lib/resilience/CircuitBreaker.ts`) — External service latency management
- **Health Monitor** (`src/lib/resilience/HealthMonitor.ts`) — System health metrics
- **Anomaly Detector** (`src/lib/resilience/AnomalyDetector.ts`) — Anti-exfiltration MFA gate
- **SyncManager** (`src/lib/resilience/SyncManager.ts`) — Local persistence with exponential backoff
- **Integrity Auditor** (`src/lib/resilience/IntegrityAuditor.ts`) — SHA-256 hash verification
- **Virtual Scrolling** (`@tanstack/react-virtual`) — 7,000+ row rendering

---

*ZENITH Customs Intelligence Platform v2.0.26*
