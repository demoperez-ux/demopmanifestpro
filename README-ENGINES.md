# ZENITH — Core Engines (The Trinity)

## ⚠️ PROTECTED INTELLECTUAL PROPERTY

These three engines form the **intellectual soul** of ZENITH and must be
protected during any migration (including Antigravity / AWS).

---

## Architecture: `LEXIS extracts → ZOD validates → STELLA learns`

### 1. LEXIS — The Intelligent Scribe
**File:** `src/lib/engines/lexis-engine.ts`

- Autonomous ingestion of Commercial Invoices, Bills of Lading (BL/CP), and Manifests
- Regex-based field extraction with confidence scoring
- Supports: Supplier, Client, Items, Quantities, Unit Values, Freight, Insurance
- Memory layer: learns from ZOD corrections to improve extraction accuracy
- SQL column mapping for direct database persistence

### 2. ZOD — The Integrity Engine
**File:** `src/lib/engines/zod-engine.ts`

- **Immutable** validation rules based on Panamanian customs law
- Core Rule: `CIF = FOB + Freight + Insurance` (Decreto Ley 1/2008 Art. 60)
- Tax cascade validation: `DAI → ISC → ITBMS (7%)` + B/. 3.00 System Fee
- SHA-256 integrity hashing with chain verification
- Subvaluation detection and auto-correction
- Legal basis citations: CAUCA IV, RECAUCA, Código Fiscal de Panamá

### 3. STELLA — The Compliance Copilot
**File:** `src/lib/engines/stella-engine.ts`

- Proactive intelligence advisor (Senior Compliance Advisor persona)
- **Memory Layer**: Learns from ZOD corrections on LEXIS-processed documents
- Context-aware advice based on active route
- Training Mode ("Guíame"): Step-by-step tutorials for each screen
- Emergency Protocol: Blocks critical actions when compliance risks are detected
- Regulatory alerts for PA, CR, GT jurisdictions

---

## Migration Notes (Antigravity)

1. These files are **infrastructure-agnostic** — they use no Supabase/Lovable APIs
2. They depend only on `crypto-js` (for ZOD hashing) and `localStorage` (for memory)
3. For AWS migration: replace `localStorage` with DynamoDB/S3 for persistent memory
4. The engines are singletons — maintain this pattern in any deployment

## Defense Protocols (Resiliencia)

The platform includes 4 active defense protocols:
- **Circuit Breaker** (`src/lib/resilience/CircuitBreaker.ts`) — SIGA/ANA latency management
- **Health Monitor** (`src/lib/resilience/HealthMonitor.ts`) — System health metrics
- **Anomaly Detector** (`src/lib/resilience/AnomalyDetector.ts`) — Anti-exfiltration MFA gate
- **Virtual Scrolling** (`@tanstack/react-virtual`) — 7,000+ row rendering

---

*© IPL / Orion Freight System — ZENITH Platform v2.0.26*
