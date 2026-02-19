/**
 * OPERATIONAL PROFILE CONFIGURATION — White-Label Architecture
 * 
 * Sistema agnóstico de perfiles operativos para gestionar tipos de operación logística.
 * Permite configurar nombre, formato de exportación y estándares técnicos
 * sin referencia a marcas comerciales externas.
 * 
 * ZENITH Customs Intelligence Platform v2.0.26
 */

// ─── Tipos ──────────────────────────────────────────────

export type ExportFormat = 'csv' | 'json' | 'xml';

/** Tipo de operación para acentos de interfaz */
export type OperationType = 'general' | 'alto_volumen' | 'sensible';

export interface PartnerConfig {
  id: string;
  name: string;
  logoUrl?: string;
  exportFormats: ExportFormat[];
  defaultExportFormat: ExportFormat;
  trackingPrefix?: string;
  /** Nombre del sistema ERP estándar para el botón de exportación */
  erpSystemName: string;
  /** Código IATA de aerolínea asociada (opcional) */
  iataCode?: string;
  /** Tipo de operación para theming dinámico */
  operationType: OperationType;
  activo: boolean;
  createdAt: string;
}

// ─── Perfiles Operativos por Defecto ────────────────────

const DEFAULT_PARTNERS: PartnerConfig[] = [
  {
    id: 'standard',
    name: 'Standard Gateway',
    exportFormats: ['csv', 'json', 'xml'],
    defaultExportFormat: 'csv',
    erpSystemName: 'External ERP Standard',
    operationType: 'general',
    activo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'strategic',
    name: 'Strategic Logistics Ally',
    exportFormats: ['csv', 'json', 'xml'],
    defaultExportFormat: 'json',
    erpSystemName: 'Global Logistics Platform',
    operationType: 'general',
    activo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ecommerce',
    name: 'E-commerce Fulfillment Node',
    exportFormats: ['csv', 'json'],
    defaultExportFormat: 'json',
    erpSystemName: 'Fulfillment Management System',
    operationType: 'alto_volumen',
    activo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'regional',
    name: 'Express Regional Operator',
    exportFormats: ['csv', 'json'],
    defaultExportFormat: 'csv',
    erpSystemName: 'Regional Operations Console',
    operationType: 'general',
    activo: true,
    createdAt: new Date().toISOString(),
  },
];

// ─── Gestor de Perfiles Operativos (Singleton) ──────────

class PartnerManager {
  private partners: Map<string, PartnerConfig>;
  private activePartnerId: string;

  constructor() {
    this.partners = new Map();
    DEFAULT_PARTNERS.forEach(p => this.partners.set(p.id, p));
    this.activePartnerId = 'standard';
  }

  /** Lista todos los perfiles registrados */
  getAll(): PartnerConfig[] {
    return Array.from(this.partners.values());
  }

  /** Lista perfiles activos */
  getActive(): PartnerConfig[] {
    return this.getAll().filter(p => p.activo);
  }

  /** Obtiene un perfil por ID */
  getById(id: string): PartnerConfig | undefined {
    return this.partners.get(id);
  }

  /** Obtiene el perfil actualmente seleccionado */
  getActivePartner(): PartnerConfig {
    return this.partners.get(this.activePartnerId) || DEFAULT_PARTNERS[0];
  }

  /** Cambia el perfil activo */
  setActivePartner(id: string): void {
    if (this.partners.has(id)) {
      this.activePartnerId = id;
    }
  }

  /** Registra un nuevo perfil */
  addPartner(config: Omit<PartnerConfig, 'createdAt'>): void {
    this.partners.set(config.id, {
      ...config,
      createdAt: new Date().toISOString(),
    });
  }

  /** Actualiza un perfil existente */
  updatePartner(id: string, updates: Partial<PartnerConfig>): void {
    const existing = this.partners.get(id);
    if (existing) {
      this.partners.set(id, { ...existing, ...updates });
    }
  }

  /** Desactiva un perfil */
  deactivatePartner(id: string): void {
    this.updatePartner(id, { activo: false });
  }
}

/** Instancia global del gestor de perfiles operativos */
export const partnerManager = new PartnerManager();

export default partnerManager;
