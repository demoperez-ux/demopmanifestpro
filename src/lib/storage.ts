import { z } from 'zod';
import { ProcessingConfig, DEFAULT_CONFIG, ProcessingSummary, ProcessedBatch } from '@/types/manifest';
import { devError } from '@/lib/logger';
import { safeJsonParse, safeJsonParseArray } from '@/lib/utils/safeJsonParse';
import { ProcessingConfigSchema, ManifestStorageSchema } from '@/lib/schemas/storageSchemas';

const CONFIG_KEY = 'manifest_processor_config';
const MANIFESTS_KEY = 'processed_manifests';

// ============================================
// MANIFEST STORAGE INTERFACE
// ============================================

export interface ManifestStorage {
  id: string;
  mawb?: string;
  fileName: string;
  totalRows: number;
  totalBatches: number;
  totalValue: number;
  processedAt: string;
  summary?: ProcessingSummary;
}

// ============================================
// CONFIG FUNCTIONS
// ============================================

export function saveConfig(config: ProcessingConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    devError('Error saving config');
  }
}

export function loadConfig(): ProcessingConfig {
  const stored = localStorage.getItem(CONFIG_KEY);
  const parsed = safeJsonParse<Partial<ProcessingConfig>>(stored, ProcessingConfigSchema as unknown as z.ZodType<Partial<ProcessingConfig>>, null);
  
  if (parsed) {
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      categories: parsed.categories || DEFAULT_CONFIG.categories,
      valueTresholds: parsed.valueTresholds || DEFAULT_CONFIG.valueTresholds,
    };
  }
  
  return DEFAULT_CONFIG;
}

export function resetConfig(): ProcessingConfig {
  localStorage.removeItem(CONFIG_KEY);
  return DEFAULT_CONFIG;
}

// ============================================
// MANIFEST STORAGE FUNCTIONS
// ============================================

export function getStoredManifests(): ManifestStorage[] {
  const stored = localStorage.getItem(MANIFESTS_KEY);
  return safeJsonParseArray<ManifestStorage>(stored, ManifestStorageSchema as unknown as z.ZodType<ManifestStorage>);
}

export function saveManifest(manifest: ManifestStorage): void {
  try {
    const manifests = getStoredManifests();
    // Avoid duplicates
    const existingIndex = manifests.findIndex(m => m.id === manifest.id);
    if (existingIndex >= 0) {
      manifests[existingIndex] = manifest;
    } else {
      manifests.push(manifest);
    }
    localStorage.setItem(MANIFESTS_KEY, JSON.stringify(manifests));
  } catch (error) {
    devError('Error saving manifest');
  }
}

export function deleteManifest(id: string): void {
  try {
    const manifests = getStoredManifests();
    const filtered = manifests.filter(m => m.id !== id);
    localStorage.setItem(MANIFESTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    devError('Error deleting manifest');
  }
}

export function getManifestById(id: string): ManifestStorage | undefined {
  return getStoredManifests().find(m => m.id === id);
}

export function getManifestByMawb(mawb: string): ManifestStorage | undefined {
  return getStoredManifests().find(m => m.mawb === mawb);
}
