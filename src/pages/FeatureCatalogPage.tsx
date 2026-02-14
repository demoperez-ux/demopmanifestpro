import { useState } from 'react';
import {
  CheckCircle, Shield, Brain, Lock, Receipt, FileText,
  Zap, Radio, Calculator, Eye, Fingerprint, Archive,
  ClipboardList, Download, Globe, Scale, Truck, Anchor,
  Activity, Users, BookOpen, Search, AlertTriangle, Database,
  Cloud, Key, Cpu, BarChart3, FileSignature, Settings,
  ShieldAlert, UserPlus, TrendingUp, Sparkles, Lightbulb,
  FolderInput, Radar, Camera, Server, Code, Layers,
  GitBranch, Terminal, Box, Package, MapPin, Building2,
  Gavel, BadgeCheck, Timer, RefreshCw, Wifi, HardDrive
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from '@/components/ui/collapsible';
import { PLATFORM_INFO, COMPANY_INFO } from '@/lib/companyConfig';

// ─── Types ────────────────────────────────────────────

interface TechSpec {
  label: string;
  value: string;
}

interface Feature {
  id: string;
  name: string;
  description: string;
  status: 'implemented' | 'active' | 'planned';
  legalBasis?: string;
  engine?: string;
  icon: React.ComponentType<{ className?: string }>;
  techSpecs?: TechSpec[];
  sourceFiles?: string[];
  dbTables?: string[];
  edgeFunctions?: string[];
  apiEndpoints?: string[];
}

interface FeatureBlock {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  features: Feature[];
}

// ─── Status config ────────────────────────────────────

const STATUS_CONFIG = {
  implemented: { label: '✓ Implementado', className: 'bg-success/15 text-success border-success/30' },
  active: { label: '● Activo', className: 'bg-primary/15 text-primary border-primary/30' },
  planned: { label: '○ Planificado', className: 'bg-muted text-muted-foreground border-border' },
};

// ═══════════════════════════════════════════════════════
// FEATURE BLOCKS — EXHAUSTIVE
// ═══════════════════════════════════════════════════════

const BLOCKS: FeatureBlock[] = [
  // ────────────────────────────────────────────────────
  // BLOCK 1: INGESTO Y VALIDACIÓN
  // ────────────────────────────────────────────────────
  {
    id: 'ingestion',
    title: '1. Motor de Ingesto y Validación',
    subtitle: 'LEXIS Intelligence Engine · ZOD Integrity Engine',
    icon: Brain,
    color: 'hsl(var(--stella))',
    features: [
      {
        id: 'lexis-ocr',
        name: 'LEXIS AI-OCR — Extracción Documental Inteligente',
        description: 'Motor de extracción de datos desde PDFs de facturas comerciales, Bills of Lading (B/L), Air Waybills (AWB) y Cartas de Porte Internacional por Carretera (CPIC). Mapeo automático a campos SQL mediante Gemini Vision. Soporta formatos Amazon, FedEx, UPS, DHL y documentos multi-página con detección automática de tipo documental.',
        status: 'implemented',
        legalBasis: 'Resolución ANA 049-2025 · Decreto 41/2002 Art. 38 · Convenio de Kyoto Rev. Anexo K',
        engine: 'LEXIS Intelligence Engine + Google Gemini 2.5 Flash (Lovable AI)',
        icon: FileText,
        techSpecs: [
          { label: 'Modelo AI', value: 'google/gemini-2.5-flash vía Lovable AI (sin API key externa)' },
          { label: 'Formatos', value: 'PDF, XLSX, CSV, imágenes (JPG/PNG)' },
          { label: 'Detección', value: 'DocumentSniffer — clasificación automática por tipo documental' },
          { label: 'Confianza', value: 'Score de confianza 0-100% por campo extraído' },
          { label: 'Fallback', value: 'Formulario de Captura Manual (FormularioCapturaManual.tsx)' },
        ],
        sourceFiles: [
          'src/lib/sniffer/DocumentSniffer.ts',
          'src/lib/sniffer/ManifestSnifferCourier.ts',
          'src/lib/multimodal/ProcesadorDocumentalMultiModal.ts',
          'src/components/ingesta/SmartDropZone.tsx',
          'src/components/ingesta/IngestaUniversalDashboard.tsx',
          'supabase/functions/extract-invoice-data/index.ts',
          'supabase/functions/extract-ana-document/index.ts',
        ],
        edgeFunctions: ['extract-invoice-data', 'extract-ana-document'],
      },
      {
        id: 'analizador-manifiesto',
        name: 'Analizador de Manifiesto Inteligente',
        description: 'Clase maestra que lee archivos Excel, detecta automáticamente tipos de columnas (MAWB, HAWB, consignatario, descripción, valor, peso) usando fuzzy matching con 500+ variaciones de nombres de columna y distancia Levenshtein. Identifica MAWB en formato IATA (XXX-XXXXXXXX), reconoce aerolínea desde prefijo IATA (230=Avianca, 172=Copa), calcula score de confianza general y genera advertencias por columnas críticas faltantes.',
        status: 'implemented',
        legalBasis: 'Nomenclatura IATA Cargo · Resolución ANA 2025',
        engine: 'AnalizadorManifiesto · DetectorColumnasMejorado',
        icon: Search,
        techSpecs: [
          { label: 'Variaciones', value: '500+ nombres de columna reconocidos' },
          { label: 'Algoritmo', value: 'Levenshtein Distance + Fuzzy Matching' },
          { label: 'Prefijos IATA', value: 'Base de datos de aerolíneas por código numérico' },
          { label: 'Formato MAWB', value: 'XXX-XXXXXXXX (IATA estándar)' },
          { label: 'Eliminación', value: 'Cero mapeo manual de columnas' },
        ],
        sourceFiles: [
          'src/lib/analizador/analizador-manifiesto-completo.ts',
          'src/lib/deteccion/detectorColumnasMejorado.ts',
        ],
      },
      {
        id: 'zod-forensic',
        name: 'ZOD Forensic Audit — Validador de Integridad',
        description: 'Validador lógico de integridad que asegura la cuadratura matemática de cada declaración: CIF = FOB + Flete + Seguro. Detecta discrepancias en pesos, cantidades y valores declarados con tolerancia configurable. Genera sellos SHA-256 encadenados para garantizar inmutabilidad de registros. Bloquea liquidación cuando detecta inconsistencias fiscales.',
        status: 'implemented',
        legalBasis: 'Convenio de Kyoto Rev. Cap. 9, Normas 9.5-9.7 · Acuerdo de Valor OMC Art. 1-8',
        engine: 'Zod Integrity Engine · CryptoJS SHA-256',
        icon: Shield,
        techSpecs: [
          { label: 'Función', value: 'validarDiscrepanciaPeso() — tolerancia configurable (default 5%)' },
          { label: 'Hashing', value: 'SHA-256 via CryptoJS — cadena hash encadenada' },
          { label: 'Bloqueo', value: 'Hard Stop cuando CIF ≠ FOB + Flete + Seguro' },
          { label: 'Sellos', value: 'generarSelloInexpugnabilidad() — firma criptográfica por documento' },
          { label: 'OEA', value: 'Pilar 2 (Carga) — tolerancia 0% general, 0.5% granel' },
        ],
        sourceFiles: [
          'src/lib/zenith/zodIntegrityEngine.ts',
          'src/components/zenith/ZodIntegrityModal.tsx',
          'src/components/zenith/ReporteAuditoriaZod.tsx',
        ],
      },
      {
        id: 'cross-check',
        name: 'Cross-Check Documental — Triangulación de Datos',
        description: 'Validación cruzada triangular entre 3 documentos: (1) Manifiesto de Carga (MAWB/BL), (2) Facturas Comerciales individuales (HAWB), (3) Documento de Transporte (AWB/BL/CPIC). Identifica paquetes huérfanos, discrepancias de peso/valor/descripción y genera alertas de inconsistencia antes de cualquier borrador de liquidación.',
        status: 'implemented',
        legalBasis: 'Política "Cero Alucinaciones" · ANA Circular 2025-118 · BASC v6-2022 Pilar 5',
        engine: 'ProcesadorDocumentalMultiModal · OrphanMatcher',
        icon: ClipboardList,
        techSpecs: [
          { label: 'Documentos', value: 'Factura Comercial + Packing List + Documento de Transporte' },
          { label: 'Huérfanos', value: 'OrphanMatcher.ts — cruce automático HAWB ↔ PDF invoice' },
          { label: 'Multimodal', value: 'Soporte Marítimo (B/L), Terrestre (CPIC), Aéreo (AWB)' },
          { label: 'Detección', value: 'Peso, cantidades, descripciones, país de origen' },
        ],
        sourceFiles: [
          'src/lib/multimodal/ProcesadorDocumentalMultiModal.ts',
          'src/lib/sniffer/OrphanMatcher.ts',
          'src/lib/transporte/AnalizadorMultiModal.ts',
          'src/lib/transporte/DetectorModoTransporte.ts',
        ],
      },
      {
        id: 'validador-guias',
        name: 'Validador de Guías — Anti-Confusión MAWB/HAWB',
        description: 'Sistema de validación que impide el uso accidental del MAWB como identificador individual de paquete. Cada paquete se identifica por su número de tracking individual (Amazon AWB, FedEx, UPS). Detecta patrones de formato para prevenir errores de procesamiento en la clasificación y cálculo fiscal.',
        status: 'implemented',
        legalBasis: 'Resolución ANA — Procedimiento de Manifiesto Courier',
        engine: 'ValidadorGuias · ValidadorInexacto',
        icon: AlertTriangle,
        sourceFiles: [
          'src/lib/validacion/validadorGuias.ts',
          'src/lib/validacion/ValidadorInexacto.ts',
          'src/components/manifest/ValidacionGuiasAlert.tsx',
        ],
      },
      {
        id: 'clasificacion-dual',
        name: 'Motor de Clasificación Dual',
        description: 'Sistema dual: (1) Clasificación de Producto (medicamentos, electrónica, etc.) con 500+ patrones para identificar jurisdicción regulatoria (MINSA, MIDA, CONAPRED); (2) Categoría Aduanera (A/B/C/D según valor CIF). Incluye política de CONTEXTO_NEGATIVO_FARMA para eliminar falsos positivos farmacéuticos.',
        status: 'implemented',
        legalBasis: 'Arancel Nacional de Panamá 2026 · Nomenclatura NAUCA · SA 2022',
        engine: 'ClasificadorUnificado + ClasificadorInteligente',
        icon: Layers,
        techSpecs: [
          { label: 'Patrones', value: '500+ patterns para categorización por producto' },
          { label: 'Categorías', value: 'A (Documentos), B (≤$100), C ($100-$2000), D (>$2000)' },
          { label: 'Anti-FP', value: 'CONTEXTO_NEGATIVO_FARMA — bloquea pajamas, hard drive, sunglasses' },
          { label: 'Prioridad', value: 'Capítulo 30 HTS para ítems farmacéuticos' },
        ],
        sourceFiles: [
          'src/lib/clasificacion/clasificadorUnificado.ts',
          'src/lib/clasificacion/clasificadorInteligente.ts',
          'src/lib/clasificacion/fuzzyMatcher.ts',
        ],
      },
      {
        id: 'hts-ai',
        name: 'Clasificación HTS con AI (Gemini)',
        description: 'Edge function que utiliza Gemini 2.5 Flash para clasificar códigos HTS, priorizando la base de datos de Clasificaciones Validadas por corredores. Incluye aprendizaje operativo donde las correcciones del corredor retroalimentan el modelo para futuras clasificaciones idénticas.',
        status: 'implemented',
        legalBasis: 'Convención del SA (OMA) · Art. 1-6 Reglas Generales Interpretativas',
        engine: 'motor-aprendizaje-hts + clasificar-hts-ai (Edge Functions)',
        icon: Brain,
        techSpecs: [
          { label: 'AI Model', value: 'google/gemini-2.5-flash via Lovable AI' },
          { label: 'Prioridad', value: 'DB clasificaciones_validadas > AI > Fallback local' },
          { label: 'Aprendizaje', value: 'Feedback loop — corrector humano → DB → futuras consultas' },
          { label: 'Auth', value: 'JWT obligatorio + RLS por corredor_id' },
        ],
        edgeFunctions: ['clasificar-hts-ai', 'motor-aprendizaje-hts'],
        dbTables: ['clasificaciones_validadas'],
        sourceFiles: [
          'supabase/functions/clasificar-hts-ai/index.ts',
          'supabase/functions/motor-aprendizaje-hts/index.ts',
          'src/lib/core/ClasificadorHTSAI.ts',
          'src/lib/core/ServicioAprendizajeHTS.ts',
          'src/lib/core/MotorClasificacionHTS.ts',
        ],
      },
      {
        id: 'lexis-ingress',
        name: 'LEXIS Ingress Portal — Gateway Documental Jerárquico',
        description: 'Portal de ingreso con 3 áreas: Área A (manifiesto CSV/XLSX), Área B (Master Air Waybill PDF), Área C (carga masiva hasta 1,000 archivos). Matching automático de PDFs de facturas a filas del manifiesto por HAWB/Tracking y seguimiento de integridad del batch.',
        status: 'implemented',
        legalBasis: 'Resolución ANA — Procedimiento Courier Simplificado',
        engine: 'LexisIngressEngine · ManifestSnifferCourier',
        icon: FolderInput,
        sourceFiles: [
          'src/lib/courier/LexisIngressEngine.ts',
          'src/components/courier/LexisIngressPortal.tsx',
          'src/components/courier/DropZoneCargaMasiva.tsx',
          'src/components/courier/DropZoneGuiaMaster.tsx',
          'src/components/courier/DropZoneManifiesto.tsx',
        ],
      },
      {
        id: 'flujo-carga',
        name: 'Flujo de Carga Unificado — Stepper Obligatorio',
        description: 'Stepper de 3 pasos obligatorio: (1) Carga de documentos (Excel + PDF simultáneo), (2) Procesamiento AI (OCR + triangulación via Web Worker), (3) Verificación y Reconciliación. Integrado en la página principal ("/") y lleva a "/dashboard/:manifiestoId".',
        status: 'implemented',
        legalBasis: 'SOP-ZENITH-001 Flujo Operativo',
        engine: 'FlujoCargaUnificado + Web Workers',
        icon: GitBranch,
        techSpecs: [
          { label: 'Worker', value: 'procesador.worker.ts — procesamiento paralelo en hilo separado' },
          { label: 'Capacidad', value: '50,000+ paquetes en lote' },
          { label: 'Ruta', value: '/ → procesamiento → /dashboard/:manifiestoId' },
        ],
        sourceFiles: [
          'src/components/manifest/FlujoCargaUnificado.tsx',
          'src/lib/workers/procesador.worker.ts',
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────
  // BLOCK 2: GESTIÓN ADUANERA Y TRANSMISIÓN
  // ────────────────────────────────────────────────────
  {
    id: 'customs',
    title: '2. Gestión Aduanera y Transmisión',
    subtitle: 'SIGA · ANA · CrimsonLogic · VUCE · Liquidación',
    icon: Radio,
    color: 'hsl(var(--zod))',
    features: [
      {
        id: 'siga-connector',
        name: 'Connector Core — SIGA Gateway',
        description: 'Motor central de comunicación con la ANA. Maneja mapeo JSON-a-XML (estándar OMA) para TradeNet/CrimsonLogic. Gestiona firmas digitales OAuth2/XML-DSIG para VUCE usando certificados .p12/.pfx procesados localmente. Cola de transmisión con retry exponencial y Circuit Breaker (10s timeout).',
        status: 'implemented',
        legalBasis: 'Protocolo TradeNet/CrimsonLogic · OMA Data Model v3 · Decreto Ley 1/2008',
        engine: 'ProtocolConverter · TransmissionQueue · ConnectivityMonitor',
        icon: Radio,
        techSpecs: [
          { label: 'Protocolo', value: 'JSON ↔ XML-OMA (TradeNet/CrimsonLogic)' },
          { label: 'Auth', value: 'OAuth2 + XML-DSIG con certificados .p12/.pfx' },
          { label: 'Queue', value: 'Cola FIFO con retry exponencial (2, 4, 8, 16 min)' },
          { label: 'Circuit Breaker', value: 'Timeout 10s · 3 fallos → Modo Cola Asíncrona' },
          { label: 'Monitor', value: 'ConnectivityMonitor — estado SIGA y VUCE en tiempo real' },
        ],
        apiEndpoints: [
          'SIGA_GATEWAY: https://siga.ana.gob.pa/api/v1',
          'VUCE_ENDPOINT: https://vuce.gob.pa/api/v1',
          'ANA_CONSULTAS: https://consultas.ana.gob.pa/api',
        ],
        sourceFiles: [
          'src/lib/gateway/ProtocolConverter.ts',
          'src/lib/gateway/TransmissionQueue.ts',
          'src/lib/gateway/ConnectivityMonitor.ts',
          'src/lib/gateway/AuthManager.ts',
          'src/components/siga/ConnectorCoreDashboard.tsx',
          'src/components/siga/MonitorTransmisionSIGA.tsx',
          'src/components/siga/ConectividadANAPanel.tsx',
        ],
      },
      {
        id: 'liquidacion',
        name: 'Motor de Liquidación SIGA — Cascada Fiscal',
        description: 'Cálculo automático de la cascada fiscal panameña oficial: CIF (FOB + Flete + Seguro 1.5% teórico si null), DAI sobre CIF, ISC sobre (CIF+DAI), ITBM 7% sobre (CIF+DAI+ISC), más Tasa SIGA B/.3.00. Genera 3 escenarios: puntual, recargo 10% (+5 días), recargo 20% (+10 días). Modelo de 4 categorías ANA 2026.',
        status: 'implemented',
        legalBasis: 'Decreto de Gabinete 41/2002 · Resolución ANA 049-2025 · Código Fiscal de Panamá',
        engine: 'MotorLiquidacionSIGA · calculadoraOficial · AgrupadorLiquidaciones',
        icon: Calculator,
        techSpecs: [
          { label: 'Cat. A', value: 'Documentos — Exento' },
          { label: 'Cat. B', value: 'De Minimis ≤ $100.00 CIF — Exento' },
          { label: 'Cat. C', value: '$100.01 - $2,000 — Cascada DAI→ISC→ITBM' },
          { label: 'Cat. D', value: '> $2,000 o restringidos — Requiere corredor' },
          { label: 'Tasa SIGA', value: 'B/. 3.00 obligatorio por declaración' },
          { label: 'Seguro teórico', value: '1.5% del FOB cuando no declarado' },
        ],
        sourceFiles: [
          'src/lib/core/MotorLiquidacionSIGA.ts',
          'src/lib/liquidacion/calculadoraOficial.ts',
          'src/lib/liquidacion/AgrupadorLiquidaciones.ts',
          'src/lib/config/ConfigService.ts',
          'src/components/manifest/LiquidacionDashboard.tsx',
        ],
      },
      {
        id: 'stella-tariff',
        name: 'Stella Tariff Advisor — Motor de Clasificación Arancelaria',
        description: 'Motor de sugerencia basado en el Arancel Nacional de Panamá 2026. Utiliza fuzzy matching con distancia Levenshtein, cache en memoria de ~60 códigos arancelarios con lookup O(1), aprendizaje operativo con Gemini y base de consultas clasificatorias validadas por la ANA.',
        status: 'implemented',
        legalBasis: 'Arancel Nacional 2026 · NAUCA · Convención del SA (OMA)',
        engine: 'CacheAranceles (singleton O(1)) + ClasificadorUnificado + Gemini',
        icon: Brain,
        techSpecs: [
          { label: 'Cache', value: 'CacheAranceles singleton — O(1) lookup por HSCode' },
          { label: 'Índices', value: 'HSCode→Arancel directo + Keywords→Fuzzy matching' },
          { label: 'Aranceles', value: '~60 partidas arancelarias panameñas indexadas' },
          { label: 'Tasas', value: 'DAI%, ISC%, ITBMS% por código' },
        ],
        sourceFiles: [
          'src/lib/aduanas/cacheAranceles.ts',
          'src/lib/aduanas/arancelesCompletos.ts',
          'src/lib/aduanas/arancelesData.ts',
        ],
        dbTables: ['clasificaciones_validadas', 'consultas_clasificatorias'],
      },
      {
        id: 'trade-advisor',
        name: 'Trade Advisor — Optimización Fiscal por TLC',
        description: 'Compara aranceles generales (DAI) contra tasas preferenciales de los TLC vigentes de Panamá: TPC-USA (2012), TLC-MX, AdA-EU, TLC-CA (CAUCA/RECAUCA), TLC-Chile, TLC-Colombia, TLC-Singapur. Genera "Executive Insights" de ahorro y marca automáticamente el Certificado de Origen como documento obligatorio.',
        status: 'implemented',
        legalBasis: 'TPA Panamá-EE.UU. 2012 · CAUCA/RECAUCA · AdA Panamá-UE',
        engine: 'TradeAdvisorPanel + hooks/useTradeAdvisor',
        icon: TrendingUp,
        sourceFiles: [
          'src/components/trade/TradeAdvisorPanel.tsx',
          'src/hooks/useTradeAdvisor.ts',
          'src/components/aranceles/TLCKnowledgeBase.tsx',
        ],
        dbTables: ['acuerdos_comerciales'],
      },
      {
        id: 'declaracion-ana',
        name: 'Generador de Declaración ANA / Pre-Visualizador',
        description: 'Genera el formato oficial de declaración aduanera de la ANA con todos los campos requeridos. Incluye previsualizador para revisión del corredor antes de la transmisión. Exportación a Excel consolidado con todos los campos fiscales.',
        status: 'implemented',
        legalBasis: 'Formulario DUA (Declaración Única Aduanera) — ANA',
        engine: 'generadorDeclaracionOficial + GeneradorExcelConsolidado',
        icon: FileText,
        sourceFiles: [
          'src/lib/exportacion/generadorDeclaracionOficial.ts',
          'src/lib/core/GeneradorExcelConsolidado.ts',
          'src/lib/core/GeneradorExcelInteligente.ts',
          'src/components/manifest/PrevisualizadorDeclaracionANA.tsx',
          'src/components/manifest/ExtractorDocumentosANA.tsx',
        ],
      },
      {
        id: 'siga-messages',
        name: 'Generador de Mensajes SIGA / Simulador',
        description: 'Genera mensajes estructurados en formato XML-OMA para transmisión al SIGA. Incluye simulador de transmisión con estados (pendiente, transmitido, aceptado, rechazado) y panel de firma electrónica para certificados digitales.',
        status: 'implemented',
        legalBasis: 'Protocolo SIGA/ANA — Formato XML Estructurado',
        engine: 'GeneradorMensajesSIGA · SimuladorTransmisionSIGA',
        icon: Terminal,
        sourceFiles: [
          'src/lib/siga/GeneradorMensajesSIGA.ts',
          'src/lib/siga/SimuladorTransmisionSIGA.ts',
          'src/components/siga/FirmaElectronicaPanel.tsx',
          'src/components/siga/BovedaBoletasSIGA.tsx',
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────
  // BLOCK 3: COMPLIANCE REGULATORIO MULTI-AGENCIA
  // ────────────────────────────────────────────────────
  {
    id: 'compliance',
    title: '3. Compliance Regulatorio Multi-Agencia',
    subtitle: 'OEA · BASC · CONAPRED · MINSA · MIDA · AUPSA · AFC-OMC',
    icon: ShieldAlert,
    color: 'hsl(var(--destructive))',
    features: [
      {
        id: 'oea-matrix',
        name: 'Matriz de Riesgo OEA — 4 Pilares',
        description: 'Evalúa cumplimiento OEA (Operador Económico Autorizado) en 4 pilares con pesos: Pilar 1 (Asociados — certificaciones OEA/BASC), Pilar 2 (Carga — discrepancia peso 0% general, 0.5% granel), Pilar 3 (Ruta — origen alto riesgo), Pilar 4 (Mercancía — restricciones sanitarias). Score CRÍTICO bloquea liquidación automáticamente.',
        status: 'implemented',
        legalBasis: 'Resolución ANA — Programa OEA Panamá · SAFE Framework (OMA)',
        engine: 'MatrizRiesgoOEA · MotorCumplimientoOEA',
        icon: Radar,
        techSpecs: [
          { label: 'Pilares', value: '4: Asociados, Carga, Ruta, Mercancía' },
          { label: 'Canal', value: 'verde | amarillo | rojo | bloqueado' },
          { label: 'Bloqueo', value: 'Auto-block cuando score > umbral CRÍTICO' },
          { label: 'Inspección', value: 'Trigger automático de Inspección 17 Puntos' },
          { label: 'Hash', value: 'SHA-256 por cada evaluación de riesgo' },
        ],
        sourceFiles: [
          'src/lib/compliance/MatrizRiesgoOEA.ts',
          'src/lib/compliance/MotorCumplimientoOEA.ts',
          'src/components/zenith/RadarRiesgoOEA.tsx',
        ],
      },
      {
        id: 'multi-agencia',
        name: 'Control Multi-Agencia 360°',
        description: 'Evaluación automática de 7 agencias reguladoras: CONAPRED (precursores químicos — Ley 48/2003), MINSA (farmacéuticos — Ley 1/2001), MIDA (fitosanitario), AUPSA (zoosanitario), APA (alimentos procesados), ACODECO, MINGOB. Genera bloqueos obligatorios y listas de documentos faltantes.',
        status: 'implemented',
        legalBasis: 'Ley 48/2003 (CONAPRED) · Ley 1/2001 (MINSA) · Decreto 122/2015 (MIDA)',
        engine: 'ControlMultiAgencia · DetectorCONAPRED',
        icon: Building2,
        techSpecs: [
          { label: 'Agencias', value: 'CONAPRED, MINSA, APA, MIDA, AUPSA, ACODECO, MINGOB' },
          { label: 'Bloqueos', value: 'Obligatorio (hard stop) vs Condicional (advertencia)' },
          { label: 'CONAPRED', value: 'Detección de sustancias controladas (Ley 48/2003 Art. 8)' },
          { label: 'MINSA', value: 'Registro sanitario para Capítulo 30 HTS' },
        ],
        sourceFiles: [
          'src/lib/compliance/ControlMultiAgencia.ts',
          'src/lib/regulatorio/DetectorCONAPRED.ts',
          'src/lib/filtroSanitario/motorFiltroSanitario.ts',
          'src/components/manifest/FiltroSanitarioPanel.tsx',
          'src/components/zenith/PanelAnuentesUNCAP.tsx',
        ],
      },
      {
        id: 'customs-shield',
        name: 'Customs Shield — Anti-Fraude y Seguridad',
        description: 'Motor especializado anti-fraude: diccionario de keywords de narcóticos y precursores de opioides (bloqueo de liquidación), algoritmo de valoración forense (flagging Value < $10 vs Weight > 5kg), escáneres de armamentos y componentes explosivos. Genera "Security Alert Reports" oficiales para la ANA.',
        status: 'implemented',
        legalBasis: 'Decreto Ley 1/2008 Art. 57 · BASC v6-2022 · Convenio de Palermo',
        engine: 'CustomsShieldEngine · SanctionScoreEngine',
        icon: ShieldAlert,
        techSpecs: [
          { label: 'Scoring', value: '+40 discrepancia peso, +60 docs faltantes, +30 precio sospechoso' },
          { label: 'Hard Stop', value: 'Score > 50 → bloqueo de pago y transmisión SIGA' },
          { label: 'Override', value: 'Solo Corredor Senior con firma digital' },
        ],
        sourceFiles: [
          'src/lib/compliance/CustomsShieldEngine.ts',
          'src/lib/compliance/SanctionScoreEngine.ts',
          'src/components/shield/CustomsShieldDashboard.tsx',
          'src/components/zenith/SanctionRiskPanel.tsx',
        ],
      },
      {
        id: 'subvaluacion',
        name: 'Detector de Subvaluación',
        description: 'Prioriza códigos HTS (REFERENCIAS_POR_PARTIDA) sobre descripciones para prevenir alertas falsas. FUENTES_CONFIABLES (Amazon, Apple Store) bypass de verificación. Algoritmo de detección de precios anómalos por partida arancelaria.',
        status: 'implemented',
        legalBasis: 'Acuerdo de Valor OMC Art. 1-7 · Decreto 41/2002',
        engine: 'detectorSubvaluacion · ValidadorComplianceAI',
        icon: AlertTriangle,
        sourceFiles: [
          'src/lib/validacion/detectorSubvaluacion.ts',
          'src/lib/core/ValidadorComplianceAI.ts',
          'src/components/manifest/SubvaluacionPanel.tsx',
        ],
      },
      {
        id: 'afc-omc',
        name: 'AFC-OMC — Facilitación del Comercio',
        description: 'Protocolo AFC (Acuerdo de Facilitación del Comercio de la OMC): Despacho Anticipado (pre-arrival) para embarques con documentación completa. Prioridad Periferia para perecederos (Art. 7.9). Archivo de Consultas Clasificatorias oficiales de la ANA.',
        status: 'implemented',
        legalBasis: 'AFC-OMC Art. 7.1, 7.8, 7.9 · Resolución ANA 2025',
        engine: 'MotorAFC · ConsultasClasificatorias',
        icon: Zap,
        sourceFiles: [
          'src/lib/afc/MotorAFC.ts',
          'src/components/zenith/ConsultasClasificatorias.tsx',
          'src/components/zenith/SelloAFC.tsx',
        ],
        dbTables: ['consultas_clasificatorias'],
      },
      {
        id: 'inspeccion-17',
        name: 'Inspección 17 Puntos BASC v6-2022',
        description: 'Checklist operativo de 17 puntos para inspección física de contenedores y carga aérea según protocolo BASC v6-2022. Registro fotográfico digital, score de riesgo automático, certificación con hash SHA-256 y almacenamiento inmutable.',
        status: 'implemented',
        legalBasis: 'BASC v6-2022 Estándar 2.2.3 · ISO 28000',
        engine: 'inspeccion17PuntosData · Inspección UI',
        icon: Camera,
        sourceFiles: [
          'src/lib/compliance/inspeccion17PuntosData.ts',
          'src/components/zenith/Inspeccion17Puntos.tsx',
        ],
        dbTables: ['inspecciones_17pts'],
      },
      {
        id: 'red-cumplimiento',
        name: 'Red de Cumplimiento LEXIS (Multi-Agencia)',
        description: 'Gestión de perfiles de validación multi-agencia: Mi Ambiente, Bomberos (DINASEPI), MICI, Tribunal Aduanero. Sniffer LEXIS para identificación documental y Zod para justificaciones legales citando decretos panameños (e.g., Decreto 425 Art. 4).',
        status: 'implemented',
        legalBasis: 'Decreto 425/2017 · Ley 8/2015 (Mi Ambiente) · DINASEPI',
        engine: 'MotorAnuentesUNCAP · ServicioVUCE',
        icon: Users,
        sourceFiles: [
          'src/lib/compliance/MotorAnuentesUNCAP.ts',
          'src/lib/compliance/ServicioVUCE.ts',
          'src/lib/compliance/GestorAsociadosNegocio.ts',
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────
  // BLOCK 4: ESTÁNDARES INTERNACIONALES
  // ────────────────────────────────────────────────────
  {
    id: 'standards',
    title: '4. Estándares Internacionales',
    subtitle: 'GS1 · ICC Incoterms 2020 · CAUCA/RECAUCA · Legislación Regional',
    icon: Globe,
    color: 'hsl(var(--primary))',
    features: [
      {
        id: 'gs1-gtin',
        name: 'GS1 — Validación GTIN/GLN con Checksum',
        description: 'Validación de identificadores GS1 con verificación de dígito de control: GTIN-13, GTIN-14, GLN-13. Checksum validation para prevenir errores de captura. Detección de país de origen por prefijo GS1. Integración con base de datos mapeo_gs1_hts para auto-completar HTS + restricciones sanitarias.',
        status: 'implemented',
        legalBasis: 'GS1 General Specifications v23 · ISO/IEC 15420',
        engine: 'ValidadorGS1 · SincronizadorGS1Orion',
        icon: Package,
        techSpecs: [
          { label: 'Tipos', value: 'GTIN-13, GTIN-14, GLN-13' },
          { label: 'Checksum', value: 'Algoritmo módulo 10 estándar GS1' },
          { label: 'Prefijos', value: 'Detección de país por prefijo numérico' },
          { label: 'Mapeo', value: 'GTIN → HTS automático via mapeo_gs1_hts table' },
          { label: 'Conflictos', value: 'Zod bloquea si GTIN ≠ descripción aduanera' },
        ],
        sourceFiles: [
          'src/lib/gs1/ValidadorGS1.ts',
          'src/lib/gs1/SincronizadorGS1Orion.ts',
          'src/lib/gs1/StellaGS1Trazabilidad.ts',
          'src/components/zenith/SelloGS1ICC.tsx',
          'src/components/manifest/GTINPanel.tsx',
          'src/components/manifest/RevisionGTIN.tsx',
        ],
        dbTables: ['mapeo_gs1_hts'],
      },
      {
        id: 'icc-incoterms',
        name: 'ICC Incoterms® 2020 — Motor de Valoración CIF',
        description: 'Implementación completa de los 11 Incoterms® 2020 (ICC): EXW, FCA, FAS, FOB, CPT, CIP, CFR, CIF, DAP, DPU, DDP. Cada Incoterm ajusta automáticamente el cálculo CIF (añadiendo flete/seguro según término). Integrado con el Motor de Liquidación SIGA.',
        status: 'implemented',
        legalBasis: 'ICC Incoterms® 2020 · Publicación ICC No. 723',
        engine: 'MotorIncoterms2020',
        icon: Scale,
        techSpecs: [
          { label: 'EXW', value: 'CIF = FOB + flete_interno_origen + despacho + flete_intl + seguro' },
          { label: 'FOB', value: 'CIF = FOB + flete_internacional + seguro' },
          { label: 'CIF', value: 'CIF = valor_factura (ya incluye todo)' },
          { label: 'DDP', value: 'CIF = valor_factura - derechos_destino - flete_interno' },
        ],
        sourceFiles: [
          'src/lib/gs1/MotorIncoterms2020.ts',
        ],
      },
      {
        id: 'cauca-recauca',
        name: 'CAUCA/RECAUCA — Código Aduanero Centroamericano',
        description: 'Base normativa del Código Aduanero Uniforme Centroamericano y su Reglamento. Motor de consultoría normativa de Stella con notas técnicas citando artículos específicos. Aplicable a Panamá, Costa Rica, Guatemala, Honduras, El Salvador y Nicaragua.',
        status: 'implemented',
        legalBasis: 'CAUCA IV (Resolución 223-2008) · RECAUCA (Resolución 224-2008)',
        engine: 'BaseNormativaPanama · PanelCaucaRecauca',
        icon: Gavel,
        techSpecs: [
          { label: 'Panamá', value: 'DL 1/2008, DE 266/2006, Ley 30/1984, Resolución 222 ANA' },
          { label: 'Costa Rica', value: 'Ley General de Aduanas (Ley 7557), RECAUCA aplicable' },
          { label: 'Guatemala', value: 'CAUCA IV + Ley Nacional de Aduanas, SAT como autoridad' },
          { label: 'Categorías', value: 'clasificacion, valoracion, origen, restriccion, liquidacion, despacho' },
        ],
        sourceFiles: [
          'src/lib/normativa/BaseNormativaPanama.ts',
          'src/components/zenith/PanelCaucaRecauca.tsx',
        ],
      },
      {
        id: 'normativa-panama',
        name: 'Base Legal Panameña Completa',
        description: 'Repositorio de leyes y decretos panameños aplicables: Decreto Ley 1/2008 (Régimen Aduanero), RECAUCA, DE 266/2006, Ley 30/1984 (Corredores), Resolución 222 ANA (Honorarios), Ley 23/1997 (Medicamentos), Ley 81/2019 (Datos Personales), Ley 51/2008 (Firma Electrónica), Ley 48/2003 (CONAPRED). Actualizables por el administrador.',
        status: 'implemented',
        legalBasis: 'Corpus Legal Aduanero de la República de Panamá',
        engine: 'BaseNormativaPanama · StellaKnowledgeBase',
        icon: BookOpen,
        techSpecs: [
          { label: 'Leyes', value: '10+ leyes y decretos indexados con artículos citables' },
          { label: 'Formato', value: 'NotaTecnica: id, baseLegal, artículo, resumen, aplicación' },
          { label: 'Actualización', value: 'Modificable por master_admin sin despliegue de código' },
        ],
        sourceFiles: [
          'src/lib/normativa/BaseNormativaPanama.ts',
          'src/lib/regulatorio/ReglasZonasAduaneras.ts',
          'src/lib/regulatorio/ValidadorRecintosZod.ts',
        ],
      },
      {
        id: 'orion-wms',
        name: 'Orion WMS — Sincronización Freight System',
        description: 'Integración con Orion WMS para sincronización automática de embarques. Endpoint orion-listener recibe webhooks con datos de embarque y los almacena en embarques_orion. Sincronización GS1↔HTS por GTIN para auto-completar descripciones y restricciones.',
        status: 'implemented',
        legalBasis: 'Protocolo Orion Freight System v3',
        engine: 'orion-listener (Edge Function) + embarques_orion',
        icon: Cloud,
        edgeFunctions: ['orion-listener'],
        dbTables: ['embarques_orion'],
        sourceFiles: [
          'supabase/functions/orion-listener/index.ts',
          'src/lib/erp/erpSyncData.ts',
          'src/components/erp/ERPSyncHistoryDashboard.tsx',
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────
  // BLOCK 5: STELLA HELP & ZOD — AI ENGINES
  // ────────────────────────────────────────────────────
  {
    id: 'ai-engines',
    title: '5. Motores de Inteligencia Artificial',
    subtitle: 'Stella Help · Zod Integrity · Training Mode · Alertas',
    icon: Sparkles,
    color: 'hsl(var(--stella))',
    features: [
      {
        id: 'stella-help',
        name: 'Stella Help — Asesora Normativa Conversacional',
        description: 'Centro de inteligencia conversacional con conciencia de contexto sobre la pantalla activa. Cita normativas (CAUCA/RECAUCA, DL 1/2008). Protocolo de emergencia que bloquea acciones críticas ante riesgos de cumplimiento. Tono profesional de "Senior Compliance Advisor". Edge function stella-help conecta a Gemini 2.5 Flash.',
        status: 'implemented',
        legalBasis: 'RECAUCA · Decreto Ley 1/2008 · Ley 30/1984',
        engine: 'stella-help (Edge Function) + StellaKnowledgeBase',
        icon: Sparkles,
        techSpecs: [
          { label: 'AI Model', value: 'google/gemini-2.5-flash via Lovable AI' },
          { label: 'Knowledge', value: '5 niveles: LEXIS, ZOD, Financial, SIGA, Support' },
          { label: 'Contexto', value: 'Route-aware — adapta respuestas según pantalla activa' },
          { label: 'Emergencia', value: 'Visual warnings para firma digital o fiscal ID inválido' },
          { label: 'JWT', value: 'verify_jwt = false (acceso sin autenticación)' },
        ],
        edgeFunctions: ['stella-help'],
        sourceFiles: [
          'supabase/functions/stella-help/index.ts',
          'src/lib/stella/StellaKnowledgeBase.ts',
          'src/components/stella/StellaHelpChat.tsx',
          'src/components/stella/StellaMessageBubble.tsx',
          'src/hooks/useStellaHelp.ts',
        ],
      },
      {
        id: 'stella-training',
        name: 'Stella Training Mode — "Modo Guíame"',
        description: 'Tutoriales paso a paso para usuarios sin experiencia. Cada artículo de conocimiento incluye pasosGuiados (TrainingStep[]) con instrucciones por paso, elemento UI target y tips. Route-aware: detecta la ruta actual y ofrece el tutorial correspondiente.',
        status: 'implemented',
        legalBasis: 'SOP-ZENITH Training Protocol',
        engine: 'StellaTrainingMode · KnowledgeArticle.pasosGuiados',
        icon: Lightbulb,
        sourceFiles: [
          'src/components/stella/StellaTrainingMode.tsx',
          'src/lib/stella/StellaKnowledgeBase.ts',
        ],
      },
      {
        id: 'stella-inbox',
        name: 'Stella InBox — Centro de Notificaciones Inteligentes',
        description: 'Notificaciones de Stella con tono de "Senior Compliance Advisor" — breves y basadas en datos. Cada notificación incluye categoría, prioridad, contexto de la guía/MAWB y acción sugerida. Soporta notificaciones de Zod y de estado del sistema.',
        status: 'implemented',
        engine: 'StellaInBox · StellaNotificacionesPanel',
        icon: Lightbulb,
        sourceFiles: [
          'src/components/zenith/StellaInBox.tsx',
          'src/components/zenith/StellaHelpPanel.tsx',
          'src/components/licenciamiento/StellaNotificacionesPanel.tsx',
        ],
      },
      {
        id: 'zod-audit-report',
        name: 'Zod Reporte de Auditoría — Veredicto 5 Puntos',
        description: 'Informe que resume un veredicto en 5 pilares: Clasificación, Valoración, Permisos, Trazabilidad, Integridad. Bajo la regla 90/10, solo el Corredor Licenciado ejecuta "Firmar y Transmitir" generando un sello SHA-256. Feedback loop para devolver expedientes al operador con instrucciones.',
        status: 'implemented',
        legalBasis: 'Ley 30/1984 (Responsabilidad del Corredor) · BASC v6-2022',
        engine: 'ReporteAuditoriaZod + zodIntegrityEngine',
        icon: Shield,
        sourceFiles: [
          'src/components/zenith/ReporteAuditoriaZod.tsx',
          'src/lib/zenith/zodIntegrityEngine.ts',
          'src/lib/compliance/AuditoriaResponsabilidadSolidaria.ts',
        ],
      },
      {
        id: 'zod-contextual',
        name: 'Stella/Zod Contextual — Checklist por Etapa',
        description: 'Motor contextual que genera checklists de validación específicos según la etapa del workflow (carga, clasificación, liquidación, transmisión). Cada ítem tiene su base legal y se adapta al tipo de carga (courier, formal, perecedero).',
        status: 'implemented',
        engine: 'StellaZodContextual · StellaChecklist · MotorPreparacionValidacion',
        icon: ClipboardList,
        sourceFiles: [
          'src/lib/workflow/StellaZodContextual.ts',
          'src/lib/workflow/MotorPreparacionValidacion.ts',
          'src/components/ingesta/StellaChecklist.tsx',
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────
  // BLOCK 6: SEGURIDAD Y PROTECCIÓN DE DATOS
  // ────────────────────────────────────────────────────
  {
    id: 'security',
    title: '6. Seguridad y Protección de Datos',
    subtitle: 'DLP · MFA · Vault · Encriptación · RBAC',
    icon: Lock,
    color: 'hsl(var(--destructive))',
    features: [
      {
        id: 'rbac',
        name: 'RBAC — Control de Acceso por Roles (9 Roles)',
        description: 'Sistema granular con 9 roles: master_admin (control total), senior_broker (operaciones + firma digital), it_security (logs sin PII), admin, auditor, revisor, operador, asistente (ingesta LEXIS), agente_campo (PDA). Protegido por RLS en base de datos y validaciones de ruta en frontend.',
        status: 'implemented',
        legalBasis: 'ISO 27001:2022 A.5.15 · NIST AC-3',
        engine: 'AuthContext + ProtectedRoute + RLS Policies',
        icon: Users,
        techSpecs: [
          { label: 'Roles', value: 'master_admin, senior_broker, it_security, admin, auditor, revisor, operador, asistente, agente_campo' },
          { label: 'Frontend', value: 'ProtectedRoute con allowedRoles[]' },
          { label: 'Backend', value: 'has_role() function + RLS policies en cada tabla' },
          { label: 'DB Function', value: 'get_user_role(_user_id) → app_role' },
        ],
        dbTables: ['user_roles', 'profiles'],
        sourceFiles: [
          'src/contexts/AuthContext.tsx',
          'src/components/auth/ProtectedRoute.tsx',
        ],
      },
      {
        id: 'vault-firma',
        name: 'Vault de Firma Electrónica — SHA-256',
        description: 'Almacenamiento seguro de certificados digitales SHA-256. Cláusula de responsabilidad técnica del corredor. Sello de inexpugnabilidad criptográfico en cada documento validado. Procesamiento de .p12/.pfx para firma XML-DSIG.',
        status: 'implemented',
        legalBasis: 'Ley 51/2008 de Firma Electrónica · Decreto 41/2002 Art. 23',
        engine: 'SistemaFirmaDigital · Web Crypto API · CryptoJS',
        icon: Key,
        sourceFiles: [
          'src/lib/core/SistemaFirmaDigital.ts',
          'src/components/siga/FirmaElectronicaPanel.tsx',
        ],
      },
      {
        id: 'dlp',
        name: 'DLP — Data Loss Prevention',
        description: 'Watermarking digital dinámico (muestra identidad del usuario y timestamp). Bloqueo de copy-paste, right-click, print-screen para roles no-admin. Todos los intentos bloqueados se registran en el log forense automáticamente.',
        status: 'implemented',
        legalBasis: 'Ley 81/2019 Art. 14-17 · ISO 27001:2022 A.8.12',
        engine: 'DLPProtectedView',
        icon: Eye,
        sourceFiles: [
          'src/components/security/DLPProtectedView.tsx',
        ],
      },
      {
        id: 'mfa',
        name: 'MFA Gate — Re-Autenticación Biométrica',
        description: 'Re-autenticación obligatoria para acciones de alto riesgo: transmisión final a SIGA, borrado de registros, exportación masiva, modificación de firma digital. Integración con TOTP/Authenticator para segundo factor.',
        status: 'implemented',
        legalBasis: 'NIST SP 800-63B · ISO 27001:2022 A.8.5',
        engine: 'MFASetup component',
        icon: Fingerprint,
        sourceFiles: [
          'src/components/security/MFASetup.tsx',
        ],
      },
      {
        id: 'encryption',
        name: 'Encriptación PII — AES-256 Session-Based',
        description: 'Datos PII sensibles (identificación, teléfono, dirección) protegidos en IndexedDB con AES-256 y claves por sesión. Claves generadas en sessionStorage y expiran al cerrar navegador. Ofuscación visual (8-***-8888).',
        status: 'implemented',
        legalBasis: 'Ley 81/2019 de Protección de Datos Personales · GDPR Art. 32',
        engine: 'ProtectorDatos · CryptoJS AES-256',
        icon: Lock,
        sourceFiles: [
          'src/lib/seguridad/encriptacion.ts',
        ],
      },
      {
        id: 'data-integrity',
        name: 'Data Integrity Shield',
        description: 'Sanitización de inputs contra inyección. Cross-validación matemática de liquidaciones (suma HAWB = total manifiesto). Validación de 10 dígitos HS code contra base arancelaria panameña antes de persistencia.',
        status: 'implemented',
        legalBasis: 'OWASP Top 10 · ISO 27001:2022 A.8.24',
        engine: 'DataIntegrityEngine',
        icon: Shield,
        sourceFiles: [
          'src/lib/security/DataIntegrityEngine.ts',
          'src/components/shield/DataIntegrityShield.tsx',
        ],
      },
      {
        id: 'identity-command',
        name: 'Identity Command Center (master_admin)',
        description: 'Consola exclusiva master_admin: gestión de usuarios, cambio de roles en tiempo real, "Kill Switch" para cerrar sesiones remotamente. Monitor de dispositivos con IP, hardware y ubicación geográfica aproximada.',
        status: 'implemented',
        legalBasis: 'ISO 27001:2022 A.5.18 · NIST IA-2',
        engine: 'IdentityCommandCenter',
        icon: UserPlus,
        sourceFiles: [
          'src/components/admin/IdentityCommandCenter.tsx',
        ],
      },
      {
        id: 'security-admin',
        name: 'Security Admin Dashboard — Monitor de Eventos',
        description: 'Dashboard de eventos de seguridad con filtrado por severidad, tipo y fecha. Solo accesible por master_admin e it_security. Registro inmutable (DELETE bloqueado por RLS). Resolución de incidentes con notas.',
        status: 'implemented',
        engine: 'SecurityAdminDashboard + security_events table',
        icon: ShieldAlert,
        dbTables: ['security_events'],
        sourceFiles: [
          'src/components/security/SecurityAdminDashboard.tsx',
          'src/hooks/useSecurityEvents.ts',
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────
  // BLOCK 7: OPERATIVA, FINANZAS Y ARCHIVO
  // ────────────────────────────────────────────────────
  {
    id: 'operations',
    title: '7. Operativa, Finanzas y Archivo',
    subtitle: 'Pre-Facturación · Boletas · Honorarios · Expediente Digital',
    icon: Receipt,
    color: 'hsl(var(--success))',
    features: [
      {
        id: 'pre-factura',
        name: 'Motor de Pre-Facturación Enterprise',
        description: 'Generación de pre-facturas con líneas detalladas, soportes de terceros, ITBMS 7% y totales. Aprobación del cliente via token seguro con expiración de 7 días. Exportación SAP-ready. Rechazo con motivo registrado. Hash de integridad Zod.',
        status: 'implemented',
        legalBasis: 'Resolución 222 ANA · Código Fiscal de Panamá',
        engine: 'MotorPreFactura · MotorFacturacionEnterprise',
        icon: Receipt,
        dbTables: ['pre_facturas', 'aprobaciones_cliente'],
        sourceFiles: [
          'src/lib/financiero/MotorPreFactura.ts',
          'src/lib/financiero/MotorFacturacionEnterprise.ts',
          'src/components/billing/EnterpriseBillingDashboard.tsx',
          'src/components/zenith/PreInvoiceTemplate.tsx',
        ],
      },
      {
        id: 'honorarios',
        name: 'Calculador de Honorarios del Corredor',
        description: 'Cálculo automático de honorarios según Resolución 222 ANA. Tarifarios personalizables por corredor con fórmulas: porcentaje CIF, tarifa plana, tarifa mínima. Recargos por fumigación, inspección, almacenaje, courier, perecederos y peligrosos.',
        status: 'implemented',
        legalBasis: 'Resolución 222 ANA — Tabla de Honorarios · Ley 30/1984',
        engine: 'honorariosCorredor · calculadorTarifas',
        icon: Calculator,
        dbTables: ['tarifarios_corredor', 'service_contracts'],
        sourceFiles: [
          'src/lib/financiero/honorariosCorredor.ts',
          'src/lib/financiero/calculadorTarifas.ts',
          'src/lib/financiero/MotorFinanciero.ts',
        ],
      },
      {
        id: 'audit-vault',
        name: 'AuditVault — Archivo Digital Inmutable (60 meses)',
        description: 'Paquetes de archivo firmados digitalmente (SHA-256 encadenado). Cumple retención legal de 5 años (60 meses). Formatos JSON + PDF. Captura lifecycle completo desde ingesta LEXIS hasta boleta de pago. Cláusula de responsabilidad digital del corredor.',
        status: 'implemented',
        legalBasis: 'Convenio de Kyoto Rev. Cap. 9, Normas 9.5-9.7 · Ley 81/2019',
        engine: 'AuditVault · BovedaDocumental',
        icon: Archive,
        sourceFiles: [
          'src/lib/auditoria/AuditVault.ts',
          'src/lib/auditoria/BovedaDocumental.ts',
          'src/lib/auditoria/gestorAuditoria.ts',
        ],
        dbTables: ['audit_logs', 'sys_audit_logs'],
      },
      {
        id: 'forensic-logs',
        name: 'Logs de Auditoría Forense — Cadena Hash',
        description: 'Registro de cada operación: quién, qué cambió, cuándo, desde qué IP, con qué justificación. Hashes SHA-256 encadenados (hash_content + hash_previous) para inmutabilidad comprobable. RLS: DELETE y UPDATE bloqueados (false).',
        status: 'implemented',
        legalBasis: 'BASC v6-2022 · ISO 27001:2022 A.8.15 · Ley 81/2019',
        engine: 'GestorAuditoria · audit_logs + sys_audit_logs',
        icon: ClipboardList,
        techSpecs: [
          { label: 'Campos', value: 'user_id, action, entity_type, entity_id, changes (JSONB), hash_content, hash_previous' },
          { label: 'Inmutabilidad', value: 'UPDATE = false, DELETE = false via RLS' },
          { label: 'Cadena', value: 'hash_previous referencia al log anterior para integridad' },
          { label: 'Roles', value: 'Visible para master_admin, it_security, auditor, admin' },
        ],
        dbTables: ['audit_logs', 'sys_audit_logs', 'onboarding_audit_trail'],
      },
      {
        id: 'kyc',
        name: 'KYC — Know Your Customer',
        description: 'Validación de clientes importadores: RUC activo, aviso de operación, poder de representación, coincidencia de firma. Sellado Zod con hash de validación. Estados: pendiente, aprobado, rechazado.',
        status: 'implemented',
        legalBasis: 'Ley 23/2015 Anti-Lavado · FATF/GAFI Rec. 10',
        engine: 'MotorKYC · ValidacionesKYC',
        icon: BadgeCheck,
        dbTables: ['validaciones_kyc', 'clientes_importadores', 'consignatarios_fiscales'],
        sourceFiles: [
          'src/lib/compliance/MotorKYC.ts',
        ],
      },
      {
        id: 'regimenes',
        name: 'Regímenes Especiales y Exoneraciones',
        description: 'Gestión de regímenes temporales (admisión temporal, zona libre, reexportación) con alertas de vencimiento automáticas. Motor de exoneraciones para zonas francas y tratados especiales.',
        status: 'implemented',
        legalBasis: 'DL 1/2008 Cap. VI · Ley de Zonas Francas · CAUCA Art. 89-102',
        engine: 'MotorRegimenesEspeciales · MotorExoneraciones',
        icon: Timer,
        dbTables: ['regimenes_temporales'],
        sourceFiles: [
          'src/lib/regimenes/MotorRegimenesEspeciales.ts',
          'src/lib/exoneraciones/MotorExoneraciones.ts',
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────
  // BLOCK 8: DASHBOARDS, RESILIENCIA Y PRESENTACIÓN
  // ────────────────────────────────────────────────────
  {
    id: 'dashboards',
    title: '8. Dashboards, Resiliencia e Infraestructura',
    subtitle: 'Health Monitor · Circuit Breaker · Virtual Scrolling · Modo Presentación',
    icon: Activity,
    color: 'hsl(var(--primary))',
    features: [
      {
        id: 'zenith-pulse',
        name: 'Zenith Pulse — Dashboard Ejecutivo',
        description: 'Dashboard centralizado con KPIs operativos: embarques activos, liquidaciones pendientes, score de cumplimiento OEA, alertas Zod activas. Gráficos Recharts con tendencias temporales.',
        status: 'implemented',
        engine: 'ZenithPulseDashboard · Recharts',
        icon: BarChart3,
        sourceFiles: [
          'src/components/zenith/ZenithPulseDashboard.tsx',
          'src/components/zenith/DashboardCumplimiento.tsx',
          'src/components/zenith/DashboardCorredorAprobaciones.tsx',
        ],
      },
      {
        id: 'health-monitor',
        name: 'Health Monitor — Telemetría en Tiempo Real',
        description: 'Monitoreo cada 3 segundos: CPU de motores LEXIS, latencia SQL, estado WebSockets, uso de memoria. Sparklines de tendencia y alertas basadas en umbrales. Autodiagnóstico de Stella para verificar vigencia de tasas.',
        status: 'implemented',
        legalBasis: 'NIST SP 800-137 (Continuous Monitoring)',
        engine: 'HealthMonitor · SystemHealthEngine',
        icon: Activity,
        sourceFiles: [
          'src/lib/resilience/HealthMonitor.ts',
          'src/lib/audit/SystemHealthEngine.ts',
          'src/components/audit/SystemHealthDashboard.tsx',
        ],
      },
      {
        id: 'circuit-breaker',
        name: 'Circuit Breaker — Modo Cola Asíncrona',
        description: 'Si respuesta ANA/CrimsonLogic > 10 segundos: modo de cola asíncrona automático. Guarda trámites localmente y reintenta cada 2 minutos sin bloquear UI. 3 fallos consecutivos activan estado "OPEN" del circuito.',
        status: 'implemented',
        legalBasis: 'Patrón de Diseño Circuit Breaker (Martin Fowler)',
        engine: 'CircuitBreaker · TransmissionQueue',
        icon: RefreshCw,
        techSpecs: [
          { label: 'Timeout', value: '10,000ms (configurable en APP_CONFIG)' },
          { label: 'Retry', value: 'Cada 120,000ms (2 minutos)' },
          { label: 'Threshold', value: '3 fallos → Estado OPEN' },
          { label: 'Recovery', value: 'Auto-reset a HALF-OPEN después de cooldown' },
        ],
        sourceFiles: [
          'src/lib/resilience/CircuitBreaker.ts',
        ],
      },
      {
        id: 'anomaly-detect',
        name: 'Anomaly Detection — Anti-Exfiltración',
        description: 'Stella monitoriza velocidad de descarga. > 50 archivos/minuto → alerta crítica + bloqueo de sesión + demanda de re-autenticación MFA. Todos los intentos registrados en security_events.',
        status: 'implemented',
        legalBasis: 'Ley 81/2019 · BASC v6-2022 · ISO 27001:2022 A.8.16',
        engine: 'AnomalyDetector · Stella AI Monitor',
        icon: Eye,
        sourceFiles: [
          'src/lib/resilience/AnomalyDetector.ts',
        ],
      },
      {
        id: 'virtual-scroll',
        name: 'Virtual Scrolling — Listas de 7,000+ Guías',
        description: 'TanStack React Virtual para renderizado fluido de tablas masivas. Solo renderiza filas visibles en viewport. Threshold de activación configurable (default 500 filas).',
        status: 'implemented',
        engine: '@tanstack/react-virtual · VirtualizedTable',
        icon: Cpu,
        sourceFiles: [
          'src/components/resilience/VirtualizedTable.tsx',
        ],
      },
      {
        id: 'stress-test',
        name: 'ROI Demo — Simulador de Carga Crítica',
        description: 'Simulador de estrés con 5,000+ guías sintéticas para demostrar rendimiento del sistema ante inversionistas. Mide tiempo de procesamiento, uso de memoria y throughput de clasificación.',
        status: 'implemented',
        engine: 'StressTestEngine · StressTestControlTower',
        icon: Radar,
        sourceFiles: [
          'src/lib/demo/StressTestEngine.ts',
          'src/components/demo/StressTestControlTower.tsx',
        ],
      },
      {
        id: 'onboarding',
        name: 'Onboarding SOP-ACA-001 — Stepper 9 Etapas',
        description: 'Proceso de acreditación de corredores con stepper vertical (Etapas 0-8), SLA tracking, Document Completeness Score via Stella AI, revisión humana para OCR de baja confianza, validación de vigencia de documentos (60 días), Expediente Builder con carta de remisión y Simulador de Examen Técnico (50 preguntas aleatorias).',
        status: 'implemented',
        legalBasis: 'SOP-ACA-001 · Ley 30/1984 · Resolución ANA Onboarding',
        engine: 'MotorOnboardingCorredor · MotorLicenciamientoACA',
        icon: UserPlus,
        dbTables: ['onboarding_procesos', 'onboarding_documentos', 'onboarding_audit_trail', 'corredores_acreditados'],
        sourceFiles: [
          'src/lib/onboarding/MotorOnboardingCorredor.ts',
          'src/lib/licenciamiento/MotorLicenciamientoACA.ts',
          'src/components/onboarding/OnboardingStepper.tsx',
          'src/components/onboarding/ControlCenterDashboard.tsx',
          'src/components/licenciamiento/SimuladorExamenTecnico.tsx',
        ],
      },
      {
        id: 'portal-corredor',
        name: 'Portal del Corredor — Workflow Aprobación',
        description: 'Workflow Draft→Review→Approved del copiloto. El corredor revisa borradores de ZENITH, aplica correcciones y ejecuta "Firmar y Transmitir". Expediente de defensa para auditorías ANA.',
        status: 'implemented',
        legalBasis: 'Ley 30/1984 Art. 6-12 · Resolución 222 ANA',
        engine: 'PortalCorredor · ExpedienteDefensa',
        icon: FileSignature,
        sourceFiles: [
          'src/components/zenith/PortalCorredor.tsx',
          'src/components/zenith/ExpedienteDefensa.tsx',
          'src/components/zenith/PanelRectificacionVoluntaria.tsx',
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────
  // BLOCK 9: BASE DE DATOS
  // ────────────────────────────────────────────────────
  {
    id: 'database',
    title: '9. Arquitectura de Base de Datos',
    subtitle: '22 Tablas · RLS · 9 Roles · Edge Functions',
    icon: Database,
    color: 'hsl(var(--muted-foreground))',
    features: [
      {
        id: 'db-tables',
        name: 'Esquema SQL — 22 Tablas con RLS',
        description: 'Base de datos relacional con 22 tablas protegidas por Row Level Security. Cada tabla tiene políticas granulares por rol (SELECT, INSERT, UPDATE, DELETE). Tablas de auditoría son inmutables (UPDATE=false, DELETE=false). Foreign keys aseguran integridad referencial.',
        status: 'implemented',
        legalBasis: 'ISO 27001:2022 A.8.10 · Ley 81/2019',
        engine: 'PostgreSQL + RLS + has_role() function',
        icon: Database,
        techSpecs: [
          { label: 'Operativas', value: 'embarques_orion, pre_facturas, alertas_peso, regimenes_temporales' },
          { label: 'Compliance', value: 'clasificaciones_validadas, consultas_clasificatorias, mapeo_gs1_hts, validaciones_kyc' },
          { label: 'Personas', value: 'profiles, user_roles, corredores_acreditados, consignatarios_fiscales, clientes_importadores, proveedores_internacionales' },
          { label: 'Auditoría', value: 'audit_logs, sys_audit_logs, security_events, onboarding_audit_trail' },
          { label: 'Onboarding', value: 'onboarding_procesos, onboarding_documentos, inspecciones_17pts' },
          { label: 'Financiero', value: 'pre_facturas, aprobaciones_cliente, service_contracts, tarifarios_corredor, acuerdos_comerciales' },
        ],
      },
      {
        id: 'edge-functions',
        name: 'Edge Functions — 6 Backend Functions',
        description: 'Funciones serverless desplegadas automáticamente: clasificar-hts-ai (JWT), motor-aprendizaje-hts (JWT), extract-invoice-data (JWT), extract-ana-document (JWT), orion-listener (no JWT — webhook), stella-help (no JWT). Todas conectan a Lovable AI (Gemini) sin API key externa.',
        status: 'implemented',
        engine: 'Deno Runtime · Lovable Cloud Edge Functions',
        icon: Server,
        techSpecs: [
          { label: 'clasificar-hts-ai', value: 'JWT=true — Clasificación HTS con Gemini' },
          { label: 'motor-aprendizaje-hts', value: 'JWT=true — Aprendizaje operativo con feedback' },
          { label: 'extract-invoice-data', value: 'JWT=true — OCR de facturas comerciales' },
          { label: 'extract-ana-document', value: 'JWT=true — Extracción de documentos ANA' },
          { label: 'orion-listener', value: 'JWT=false — Webhook receptor de Orion WMS' },
          { label: 'stella-help', value: 'JWT=false — Asesora conversacional Stella' },
        ],
      },
      {
        id: 'env-config',
        name: 'Configuración Centralizada — constants.ts',
        description: 'Todas las URLs de servicios externos (Supabase, SIGA, VUCE, ANA) centralizadas en src/lib/constants.ts. Variables sensibles via import.meta.env. Archivo .env.example documenta todas las variables requeridas para despliegue independiente.',
        status: 'implemented',
        engine: 'constants.ts · ConfigService.ts · .env.example',
        icon: Settings,
        techSpecs: [
          { label: 'VITE_SUPABASE_URL', value: 'URL del backend (Lovable Cloud)' },
          { label: 'VITE_SUPABASE_PUBLISHABLE_KEY', value: 'Clave pública de API' },
          { label: 'VITE_SIGA_GATEWAY_URL', value: 'Endpoint SIGA/CrimsonLogic' },
          { label: 'VITE_VUCE_URL', value: 'Endpoint VUCE' },
          { label: 'APP_CONFIG', value: 'Timeouts, thresholds, versión de la app' },
        ],
        sourceFiles: [
          'src/lib/constants.ts',
          'src/lib/config/ConfigService.ts',
          '.env.example',
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════

export default function FeatureCatalogPage() {
  const totalFeatures = BLOCKS.reduce((sum, b) => sum + b.features.length, 0);
  const implementedCount = BLOCKS.reduce(
    (sum, b) => sum + b.features.filter(f => f.status === 'implemented').length, 0
  );
  const complianceScore = Math.round((implementedCount / totalFeatures) * 100);

  const handleExport = () => {
    const lines: string[] = [
      '═══════════════════════════════════════════════════════════════════════',
      `  ZENITH v${PLATFORM_INFO.version} — CATÁLOGO TÉCNICO DE FUNCIONALIDADES`,
      `  ${COMPANY_INFO.name} — ${COMPANY_INFO.tagline}`,
      '  Compliance Checklist Técnico para Reguladores / Inversionistas / ANA',
      `  Generado: ${new Date().toISOString()}`,
      `  Score de Cumplimiento: ${complianceScore}% (${implementedCount}/${totalFeatures} features)`,
      '═══════════════════════════════════════════════════════════════════════',
      '',
    ];

    BLOCKS.forEach(block => {
      lines.push(`\n${'━'.repeat(70)}`);
      lines.push(`  ${block.title}`);
      lines.push(`  ${block.subtitle}`);
      lines.push('━'.repeat(70));
      block.features.forEach(f => {
        const st = STATUS_CONFIG[f.status];
        lines.push(`\n  ${st.label}  ${f.name}`);
        lines.push(`  ${'─'.repeat(50)}`);
        lines.push(`  ${f.description}`);
        if (f.legalBasis) lines.push(`  📜 Base Legal: ${f.legalBasis}`);
        if (f.engine) lines.push(`  ⚙️ Motor: ${f.engine}`);
        if (f.techSpecs) {
          lines.push('  📋 Especificaciones Técnicas:');
          f.techSpecs.forEach(s => lines.push(`     • ${s.label}: ${s.value}`));
        }
        if (f.sourceFiles) {
          lines.push('  📁 Archivos Fuente:');
          f.sourceFiles.forEach(s => lines.push(`     → ${s}`));
        }
        if (f.dbTables) {
          lines.push(`  🗄️ Tablas DB: ${f.dbTables.join(', ')}`);
        }
        if (f.edgeFunctions) {
          lines.push(`  ☁️ Edge Functions: ${f.edgeFunctions.join(', ')}`);
        }
        if (f.apiEndpoints) {
          lines.push('  🌐 API Endpoints:');
          f.apiEndpoints.forEach(e => lines.push(`     → ${e}`));
        }
      });
    });

    lines.push(`\n${'═'.repeat(70)}`);
    lines.push('  Documento generado automáticamente por ZENITH.');
    lines.push('  Este catálogo es un documento técnico y NO constituye asesoría legal.');
    lines.push(`  ${COMPANY_INFO.name} · ${COMPANY_INFO.location}`);
    lines.push('═'.repeat(70));

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ZENITH_Technical_Catalog_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Catálogo Técnico de Funcionalidades
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Especificaciones Técnicas Exhaustivas — ZENITH v{PLATFORM_INFO.version} · {totalFeatures} Features Documentadas
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm" className="gap-2 self-start">
          <Download className="w-4 h-4" />
          Exportar Catálogo Técnico
        </Button>
      </div>

      {/* Score Card */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Índice de Cumplimiento Técnico</span>
                <span className="text-2xl font-bold text-primary">{complianceScore}%</span>
              </div>
              <Progress value={complianceScore} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {implementedCount} de {totalFeatures} funcionalidades implementadas · {BLOCKS.length} bloques funcionales
              </p>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-16" />
            <div className="grid grid-cols-3 gap-3 text-center">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = BLOCKS.reduce(
                  (s, b) => s + b.features.filter(f => f.status === key).length, 0
                );
                return (
                  <div key={key}>
                    <p className="text-lg font-bold text-foreground">{count}</p>
                    <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>{cfg.label}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-[10px]">📊 22 Tablas SQL con RLS</Badge>
        <Badge variant="outline" className="text-[10px]">☁️ 6 Edge Functions</Badge>
        <Badge variant="outline" className="text-[10px]">🤖 Gemini 2.5 Flash (Lovable AI)</Badge>
        <Badge variant="outline" className="text-[10px]">🔐 9 Roles RBAC</Badge>
        <Badge variant="outline" className="text-[10px]">📜 10+ Leyes PA/CR/GT</Badge>
        <Badge variant="outline" className="text-[10px]">🌐 GS1 · ICC · OEA · BASC</Badge>
        <Badge variant="outline" className="text-[10px]">🏛️ ANA · MINSA · MIDA · CONAPRED</Badge>
        <Badge variant="outline" className="text-[10px]">⚡ Virtual Scrolling 7K+</Badge>
      </div>

      {/* Feature Blocks */}
      {BLOCKS.map(block => {
        const BlockIcon = block.icon;
        return (
          <div key={block.id} className="space-y-3">
            <div className="flex items-center gap-3 sticky top-0 z-10 bg-background py-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: block.color + '20', color: block.color }}
              >
                <BlockIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">{block.title}</h2>
                <p className="text-xs text-muted-foreground">{block.subtitle}</p>
              </div>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {block.features.length} features
              </Badge>
            </div>

            <div className="grid gap-3">
              {block.features.map(feature => {
                const FeatureIcon = feature.icon;
                const st = STATUS_CONFIG[feature.status];
                const hasDetails = feature.techSpecs || feature.sourceFiles || feature.dbTables || feature.edgeFunctions || feature.apiEndpoints;

                return (
                  <Collapsible key={feature.id}>
                    <Card className="border-border/60">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <FeatureIcon className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <CardTitle className="text-sm">{feature.name}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline" className={`text-[10px] ${st.className}`}>
                              {st.label}
                            </Badge>
                            {hasDetails && (
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground">
                                  <Code className="w-3 h-3" />
                                </Button>
                              </CollapsibleTrigger>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                        {feature.legalBasis && (
                          <div className="flex items-start gap-1.5 text-[11px]">
                            <span className="text-muted-foreground/60 flex-shrink-0">📜</span>
                            <span className="text-muted-foreground font-medium">{feature.legalBasis}</span>
                          </div>
                        )}
                        {feature.engine && (
                          <div className="flex items-start gap-1.5 text-[11px]">
                            <span className="text-muted-foreground/60 flex-shrink-0">⚙️</span>
                            <span className="font-mono text-muted-foreground/80">{feature.engine}</span>
                          </div>
                        )}

                        {/* Expandable technical details */}
                        <CollapsibleContent className="space-y-3 pt-2 border-t border-border/40 mt-2">
                          {feature.techSpecs && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium mb-1.5">
                                Especificaciones Técnicas
                              </p>
                              <div className="grid gap-1">
                                {feature.techSpecs.map((spec, i) => (
                                  <div key={i} className="flex gap-2 text-[11px]">
                                    <span className="text-muted-foreground/60 font-medium min-w-[100px]">{spec.label}:</span>
                                    <span className="text-muted-foreground font-mono text-[10px]">{spec.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {feature.sourceFiles && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium mb-1.5">
                                Archivos Fuente
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {feature.sourceFiles.map((f, i) => (
                                  <Badge key={i} variant="outline" className="text-[9px] font-mono border-border/40">
                                    {f.split('/').pop()}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {feature.dbTables && (
                            <div className="flex items-center gap-2">
                              <Database className="w-3 h-3 text-muted-foreground/40" />
                              <span className="text-[10px] text-muted-foreground/60 font-medium">Tablas:</span>
                              <div className="flex flex-wrap gap-1">
                                {feature.dbTables.map((t, i) => (
                                  <Badge key={i} variant="outline" className="text-[9px] font-mono bg-primary/5">
                                    {t}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {feature.edgeFunctions && (
                            <div className="flex items-center gap-2">
                              <Cloud className="w-3 h-3 text-muted-foreground/40" />
                              <span className="text-[10px] text-muted-foreground/60 font-medium">Edge Functions:</span>
                              <div className="flex flex-wrap gap-1">
                                {feature.edgeFunctions.map((ef, i) => (
                                  <Badge key={i} variant="outline" className="text-[9px] font-mono bg-success/5">
                                    {ef}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {feature.apiEndpoints && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium mb-1.5">
                                API Endpoints
                              </p>
                              {feature.apiEndpoints.map((ep, i) => (
                                <p key={i} className="text-[10px] font-mono text-muted-foreground/70">{ep}</p>
                              ))}
                            </div>
                          )}
                        </CollapsibleContent>
                      </CardContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div className="text-center py-6 border-t border-border space-y-1">
        <p className="text-[10px] text-muted-foreground/60">
          ZENITH v{PLATFORM_INFO.version} · {COMPANY_INFO.name} · {COMPANY_INFO.location}
        </p>
        <p className="text-[10px] text-muted-foreground/40">
          {totalFeatures} funcionalidades documentadas · {BLOCKS.length} bloques funcionales · Este catálogo es un documento técnico interno
        </p>
      </div>
    </div>
  );
}
