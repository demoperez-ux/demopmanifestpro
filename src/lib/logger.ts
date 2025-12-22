/**
 * Logger Seguro - Solo activo en desarrollo
 * 
 * SEGURIDAD: Los console.log pueden exponer:
 * - Lógica de negocio y flujos de procesamiento
 * - Patrones de datos y estructuras
 * - Información de timing para ataques criptográficos
 * 
 * Este módulo desactiva los logs en producción.
 */

const isDev = import.meta.env.DEV;

/**
 * Log informativo - solo en desarrollo
 */
export function devLog(message: string, ...args: unknown[]): void {
  if (isDev) {
    console.log(message, ...args);
  }
}

/**
 * Advertencia - solo en desarrollo
 */
export function devWarn(message: string, ...args: unknown[]): void {
  if (isDev) {
    console.warn(message, ...args);
  }
}

/**
 * Error - solo en desarrollo (errores críticos siempre se logean)
 */
export function devError(message: string, ...args: unknown[]): void {
  if (isDev) {
    console.error(message, ...args);
  }
}

/**
 * Log de debugging detallado - solo en desarrollo
 */
export function devDebug(message: string, data?: unknown): void {
  if (isDev) {
    console.log(`[DEBUG] ${message}`, data ?? '');
  }
}

/**
 * Log de operación completada - solo en desarrollo
 */
export function devSuccess(message: string): void {
  if (isDev) {
    console.log(`✅ ${message}`);
  }
}

/**
 * Log de sección/separador - solo en desarrollo
 */
export function devSection(title: string): void {
  if (isDev) {
    console.log('═'.repeat(70));
    console.log(title);
    console.log('═'.repeat(70));
  }
}
