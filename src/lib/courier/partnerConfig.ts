/**
 * PARTNER CONFIGURATION — Multi-Partner Architecture
 * 
 * Sistema dinámico para gestionar socios logísticos (UPS, DHL, FedEx, Amazon, etc.)
 * Permite configurar nombre, logo, formato de exportación y estándares técnicos
 * sin código hardcodeado.
 */

// ─── Tipos ──────────────────────────────────────────────

export type ExportFormat = 'csv' | 'json' | 'xml';

export interface PartnerConfig {
  id: string;
  name: string;
  logoUrl?: string;
  exportFormats: ExportFormat[];
  defaultExportFormat: ExportFormat;
  trackingPrefix?: string;
  /** Nombre del sistema ERP del socio para el botón de exportación */
  erpSystemName: string;
  /** Código IATA de aerolínea asociada (opcional) */
  iataCode?: string;
  activo: boolean;
  createdAt: string;
}

// ─── Socios por Defecto ─────────────────────────────────

const DEFAULT_PARTNERS: PartnerConfig[] = [
  {
    id: 'ups',
    name: 'UPS',
    exportFormats: ['csv', 'json'],
    defaultExportFormat: 'csv',
    trackingPrefix: '1Z',
    erpSystemName: 'UPS WorldShip',
    iataCode: '406',
    activo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dhl',
    name: 'DHL Express',
    exportFormats: ['csv', 'json', 'xml'],
    defaultExportFormat: 'json',
    trackingPrefix: '',
    erpSystemName: 'DHL MyBill',
    iataCode: '155',
    activo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'fedex',
    name: 'FedEx',
    exportFormats: ['csv', 'json'],
    defaultExportFormat: 'csv',
    trackingPrefix: '',
    erpSystemName: 'FedEx Ship Manager',
    iataCode: '023',
    activo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'amazon',
    name: 'Amazon Logistics',
    exportFormats: ['csv', 'json'],
    defaultExportFormat: 'json',
    trackingPrefix: 'TBA',
    erpSystemName: 'Amazon Seller Central',
    activo: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'generic',
    name: 'Courier Genérico',
    exportFormats: ['csv', 'json', 'xml'],
    defaultExportFormat: 'csv',
    erpSystemName: 'ERP',
    activo: true,
    createdAt: new Date().toISOString(),
  },
];

// ─── Gestor de Partners (Singleton) ─────────────────────

class PartnerManager {
  private partners: Map<string, PartnerConfig>;
  private activePartnerId: string;

  constructor() {
    this.partners = new Map();
    DEFAULT_PARTNERS.forEach(p => this.partners.set(p.id, p));
    this.activePartnerId = 'generic';
  }

  /** Lista todos los partners registrados */
  getAll(): PartnerConfig[] {
    return Array.from(this.partners.values());
  }

  /** Lista partners activos */
  getActive(): PartnerConfig[] {
    return this.getAll().filter(p => p.activo);
  }

  /** Obtiene un partner por ID */
  getById(id: string): PartnerConfig | undefined {
    return this.partners.get(id);
  }

  /** Obtiene el partner actualmente seleccionado */
  getActivePartner(): PartnerConfig {
    return this.partners.get(this.activePartnerId) || DEFAULT_PARTNERS[DEFAULT_PARTNERS.length - 1];
  }

  /** Cambia el partner activo */
  setActivePartner(id: string): void {
    if (this.partners.has(id)) {
      this.activePartnerId = id;
    }
  }

  /** Registra un nuevo partner */
  addPartner(config: Omit<PartnerConfig, 'createdAt'>): void {
    this.partners.set(config.id, {
      ...config,
      createdAt: new Date().toISOString(),
    });
  }

  /** Actualiza un partner existente */
  updatePartner(id: string, updates: Partial<PartnerConfig>): void {
    const existing = this.partners.get(id);
    if (existing) {
      this.partners.set(id, { ...existing, ...updates });
    }
  }

  /** Desactiva un partner */
  deactivatePartner(id: string): void {
    this.updatePartner(id, { activo: false });
  }
}

/** Instancia global del gestor de partners */
export const partnerManager = new PartnerManager();

export default partnerManager;
