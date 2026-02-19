/**
 * ZENITH — Constantes Centralizadas
 * 
 * Todas las URLs de servicios externos y configuraciones globales
 * se centralizan aquí para facilitar el mantenimiento y la portabilidad.
 * 
 * Las variables sensibles se leen desde import.meta.env (archivo .env).
 */

// ═══════════════════════════════════════════════════════════════
// SUPABASE / BACKEND
// ═══════════════════════════════════════════════════════════════

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
export const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;

// ═══════════════════════════════════════════════════════════════
// EDGE FUNCTIONS (BACKEND FUNCTIONS)
// ═══════════════════════════════════════════════════════════════

export const EDGE_FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

export const ENDPOINTS = {
  STELLA_HELP: `${EDGE_FUNCTIONS_BASE}/stella-help`,
  CLASIFICAR_HTS_AI: `${EDGE_FUNCTIONS_BASE}/clasificar-hts-ai`,
  EXTRACT_ANA_DOCUMENT: `${EDGE_FUNCTIONS_BASE}/extract-ana-document`,
  EXTRACT_INVOICE_DATA: `${EDGE_FUNCTIONS_BASE}/extract-invoice-data`,
  MOTOR_APRENDIZAJE_HTS: `${EDGE_FUNCTIONS_BASE}/motor-aprendizaje-hts`,
  ORION_LISTENER: `${EDGE_FUNCTIONS_BASE}/orion-listener`,
} as const;

// ═══════════════════════════════════════════════════════════════
// APIS EXTERNAS — ADUANAS DE PANAMÁ
// ═══════════════════════════════════════════════════════════════

export const EXTERNAL_APIS = {
  /** Sistema Integrado de Gestión Aduanera (CrimsonLogic) */
  SIGA_GATEWAY: import.meta.env.VITE_SIGA_GATEWAY_URL || 'https://siga.ana.gob.pa/api/v1',
  /** Ventanilla Única de Comercio Exterior */
  VUCE_ENDPOINT: import.meta.env.VITE_VUCE_URL || 'https://vuce.gob.pa/api/v1',
  /** Autoridad Nacional de Aduanas — consultas públicas */
  ANA_CONSULTAS: import.meta.env.VITE_ANA_CONSULTAS_URL || 'https://consultas.ana.gob.pa/api',
} as const;

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE LA APLICACIÓN
// ═══════════════════════════════════════════════════════════════

export const APP_CONFIG = {
  NAME: 'ZENITH',
  VERSION: '2.0.26',
  DESCRIPTION: 'La cumbre del control aduanero',
  AUTHOR: 'Core Development Team',
  /** Timeout para conexiones al SIGA/ANA (ms) */
  SIGA_TIMEOUT_MS: 10_000,
  /** Intervalo de reintentos del Circuit Breaker (ms) */
  CIRCUIT_BREAKER_RETRY_MS: 120_000,
  /** Umbral de descargas/minuto para alerta de anomalía */
  ANOMALY_DOWNLOAD_THRESHOLD: 50,
  /** Máximo de filas renderizadas antes de activar Virtual Scrolling */
  VIRTUAL_SCROLL_THRESHOLD: 500,
} as const;

// ═══════════════════════════════════════════════════════════════
// UTILIDADES DE ENTORNO
// ═══════════════════════════════════════════════════════════════

export const IS_DEV = import.meta.env.DEV;
export const IS_PROD = import.meta.env.PROD;
