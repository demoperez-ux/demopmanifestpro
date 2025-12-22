/**
 * ESQUEMAS ZOD PARA VALIDACIÓN DE DATOS DE LOCALSTORAGE
 * Define las estructuras esperadas para datos persistidos
 */

import { z } from 'zod';

// ============================================
// ESQUEMAS PARA MANIFIESTOS
// ============================================

export const ManifiestoGuardadoSchema = z.object({
  id: z.string(),
  mawb: z.string(),
  fechaProcesamiento: z.string(),
  fechaCreacion: z.string(),
  totalFilas: z.number(),
  filasValidas: z.number(),
  filasConErrores: z.number(),
  valorTotal: z.number(),
  pesoTotal: z.number(),
  estado: z.enum(['procesado', 'revisado', 'exportado', 'archivado'])
});

export const FilaConManifiestoSchema = z.object({
  id: z.string(),
  manifiestoId: z.string(),
  fechaGuardado: z.string(),
  indice: z.number().optional(),
  tracking: z.string().optional(),
  destinatario: z.string().optional(),
  identificacion: z.string().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  provincia: z.string().optional(),
  descripcion: z.string().optional(),
  valorUSD: z.number().optional(),
  peso: z.number().optional()
}).passthrough(); // Permitir campos adicionales

export const ConsignatarioGuardadoSchema = z.object({
  id: z.string(),
  manifiestoId: z.string(),
  nombre: z.string(),
  identificacion: z.string(),
  telefono: z.string(),
  direccion: z.string(),
  provincia: z.string(),
  cantidadPaquetes: z.number(),
  valorTotal: z.number(),
  pesoTotal: z.number(),
  trackings: z.array(z.string())
});

// ============================================
// ESQUEMAS PARA LOCKS
// ============================================

export const ManifiestoLockSchema = z.object({
  mawb: z.string(),
  operador: z.string(),
  timestamp: z.string(),
  estado: z.enum(['procesando', 'completado', 'error']),
  sessionId: z.string()
});

export const LockEntrySchema = z.tuple([z.string(), ManifiestoLockSchema]);

// ============================================
// ESQUEMAS PARA STORAGE.TS
// ============================================

export const ProcessingConfigSchema = z.object({
  categories: z.record(z.any()).optional(),
  valueTresholds: z.record(z.any()).optional()
}).passthrough();

export const ManifestStorageSchema = z.object({
  id: z.string(),
  mawb: z.string().optional(),
  fileName: z.string(),
  totalRows: z.number(),
  totalBatches: z.number(),
  totalValue: z.number(),
  processedAt: z.string(),
  summary: z.any().optional()
});

// ============================================
// ESQUEMAS PARA MIGRACIÓN
// ============================================

export const StoredManifestBasicSchema = z.object({
  mawb: z.string().optional(),
  processedAt: z.string(),
  totalRows: z.number()
});
