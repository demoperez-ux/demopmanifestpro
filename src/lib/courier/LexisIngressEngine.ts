/**
 * LEXIS INGRESS ENGINE
 * 
 * Background processing engine that:
 * 1. Parses manifest (CSV/XLSX) into tramite rows
 * 2. Scans uploaded documents for tracking numbers / HAWB
 * 3. Auto-links documents to manifest rows
 * 4. Reports integrity metrics (complete, orphan, missing)
 */

export interface TramiteRow {
  id: string;
  trackingNumber: string;
  mawb: string;
  consignatario: string;
  descripcion: string;
  valorFOB: number;
  peso: number;
  partidaArancelaria?: string;
  documentosVinculados: DocumentoVinculado[];
  estado: 'completo' | 'incompleto' | 'sin_factura';
}

export interface DocumentoVinculado {
  id: string;
  archivo: File;
  tipo: 'factura' | 'guia_hija' | 'otro';
  trackingDetectado?: string;
  confianza: number;
  preview?: string;
  datosExtraidos?: {
    valorFOB?: number;
    flete?: number;
    partidaArancelaria?: string;
    shipper?: string;
  };
}

export interface GuiaMasterData {
  archivo: File;
  vuelo?: string;
  transportista?: string;
  mawb?: string;
  fechaLlegada?: string;
  origen?: string;
  destino?: string;
}

export interface IntegridadLote {
  totalTramites: number;
  tramitesCompletos: number;
  documentosHuerfanos: number;
  documentosFaltantes: number;
  porcentajeCompletitud: number;
}

export interface ResultadoVinculacion {
  documentoId: string;
  tramiteId: string | null;
  trackingDetectado: string | null;
  confianza: number;
  metodo: 'tracking_exacto' | 'fuzzy' | 'no_match';
}

// Simulated tracking patterns for document scanning
const TRACKING_PATTERNS = [
  /TBA\d{12,}/i,
  /1Z[A-Z0-9]{16}/i,       // UPS
  /\d{12,22}/,              // FedEx / DHL
  /JD\d{18}/i,              // JD
  /YT\d{16}/i,              // YunExpress
  /SF\d{13}/i,              // SF Express
  /[A-Z]{2}\d{9}[A-Z]{2}/i, // International postal
];

export class LexisIngressEngine {

  /**
   * Generate demo manifest data simulating a parsed CSV/XLSX
   */
  static generarManifiestoDemo(count: number = 689): TramiteRow[] {
    const descripciones = [
      { desc: 'Wireless Earbuds TWS Bluetooth', val: 32, peso: 0.3 },
      { desc: 'Phone Case Silicone Cover', val: 8, peso: 0.1 },
      { desc: 'Vitamin D3 5000IU Softgels', val: 24, peso: 0.4 },
      { desc: 'LED Strip Lights 5M RGB', val: 15, peso: 0.5 },
      { desc: 'Laptop Stand Aluminum Adjustable', val: 45, peso: 1.2 },
      { desc: 'USB-C Hub 7-in-1 Multiport', val: 28, peso: 0.2 },
      { desc: 'Rice Cooker 3L Electric', val: 55, peso: 3.5 },
      { desc: 'Bluetooth Speaker Portable', val: 38, peso: 0.8 },
      { desc: 'Smart Watch Fitness Tracker', val: 65, peso: 0.2 },
      { desc: 'Organic Green Tea 100 bags', val: 12, peso: 0.3 },
      { desc: 'Protein Powder Whey 2kg', val: 48, peso: 2.2 },
      { desc: 'Electric Toothbrush Sonic', val: 22, peso: 0.3 },
      { desc: 'Yoga Mat Non-Slip 6mm', val: 18, peso: 1.5 },
      { desc: 'Air Purifier HEPA Filter', val: 120, peso: 4.0 },
      { desc: 'Baby Monitor WiFi Camera', val: 75, peso: 0.6 },
      { desc: 'Mechanical Keyboard 65%', val: 58, peso: 0.9 },
      { desc: 'Ceramic Coffee Mug Set 4pcs', val: 20, peso: 1.8 },
      { desc: 'Running Shoes Mens Size 10', val: 85, peso: 0.7 },
      { desc: 'Portable Charger 20000mAh', val: 30, peso: 0.4 },
      { desc: 'Kitchen Knife Set 5pcs Stainless', val: 42, peso: 1.1 },
    ];

    const consignatarios = [
      'Juan Pérez García', 'María González López', 'Carlos Rodríguez S.',
      'Ana Martínez R.', 'Pedro Sánchez M.', 'Luisa Hernández T.',
      'Roberto Díaz A.', 'Carmen Flores V.', 'Miguel Torres B.',
      'Isabel Vargas C.', 'Fernando Morales', 'Rosa Jiménez P.',
    ];

    const mawbs = ['618-12345678', '230-87654321', '045-11223344'];

    return Array.from({ length: count }, (_, i) => {
      const item = descripciones[i % descripciones.length];
      const consig = consignatarios[i % consignatarios.length];
      const mawb = mawbs[Math.floor(i / Math.ceil(count / mawbs.length)) % mawbs.length];

      return {
        id: crypto.randomUUID(),
        trackingNumber: `TBA${(300000000000 + i).toString()}`,
        mawb,
        consignatario: consig,
        descripcion: item.desc,
        valorFOB: +(item.val + Math.random() * 15).toFixed(2),
        peso: +(item.peso + Math.random() * 0.5).toFixed(2),
        documentosVinculados: [],
        estado: 'sin_factura' as const,
      };
    });
  }

  /**
   * Simulate extracting master guide data from a PDF
   */
  static extraerGuiaMaster(file: File): GuiaMasterData {
    return {
      archivo: file,
      vuelo: 'CM-837',
      transportista: 'Copa Airlines Cargo',
      mawb: '230-87654321',
      fechaLlegada: new Date().toISOString().split('T')[0],
      origen: 'Miami (MIA)',
      destino: 'Tocumen (PTY)',
    };
  }

  /**
   * Simulate background scanning of documents to find tracking numbers
   */
  static async vincularDocumentos(
    documentos: File[],
    tramites: TramiteRow[],
    onProgress: (processed: number, total: number) => void
  ): Promise<{ tramitesActualizados: TramiteRow[]; resultados: ResultadoVinculacion[] }> {
    const resultados: ResultadoVinculacion[] = [];
    const tramitesMap = new Map(tramites.map(t => [t.trackingNumber, t]));
    const tramitesActualizados = tramites.map(t => ({ ...t, documentosVinculados: [...t.documentosVinculados] }));
    const actualizadosMap = new Map(tramitesActualizados.map(t => [t.trackingNumber, t]));

    for (let i = 0; i < documentos.length; i++) {
      const file = documentos[i];
      
      // Simulate processing delay (batch every 10)
      if (i % 10 === 0) {
        await new Promise(r => setTimeout(r, 30));
        onProgress(i, documentos.length);
      }

      // Simulate tracking detection from filename or content
      const tracking = this.detectarTrackingDesdeNombre(file.name, tramites);
      
      const doc: DocumentoVinculado = {
        id: crypto.randomUUID(),
        archivo: file,
        tipo: file.name.toLowerCase().includes('invoice') || file.name.toLowerCase().includes('factura') 
          ? 'factura' : 'guia_hija',
        trackingDetectado: tracking?.tracking || null,
        confianza: tracking?.confianza || 0,
        datosExtraidos: tracking ? {
          valorFOB: +(Math.random() * 100 + 10).toFixed(2),
          flete: +(Math.random() * 15 + 2).toFixed(2),
          partidaArancelaria: ['8471.30.00', '8518.40.00', '8528.72.00', '6110.20.00'][Math.floor(Math.random() * 4)],
          shipper: ['Amazon.com LLC', 'Temu Inc.', 'SHEIN Group', 'Walmart Inc.'][Math.floor(Math.random() * 4)],
        } : undefined,
      };

      if (tracking && actualizadosMap.has(tracking.tracking)) {
        const tramite = actualizadosMap.get(tracking.tracking)!;
        tramite.documentosVinculados.push(doc);
        tramite.estado = 'completo';
        resultados.push({
          documentoId: doc.id,
          tramiteId: tramite.id,
          trackingDetectado: tracking.tracking,
          confianza: tracking.confianza,
          metodo: tracking.confianza > 90 ? 'tracking_exacto' : 'fuzzy',
        });
      } else {
        resultados.push({
          documentoId: doc.id,
          tramiteId: null,
          trackingDetectado: tracking?.tracking || null,
          confianza: 0,
          metodo: 'no_match',
        });
      }
    }

    onProgress(documentos.length, documentos.length);

    // Update remaining tramites without docs
    tramitesActualizados.forEach(t => {
      if (t.documentosVinculados.length === 0) {
        t.estado = 'sin_factura';
      }
    });

    return { tramitesActualizados, resultados };
  }

  /**
   * Simulate tracking detection from filename
   */
  private static detectarTrackingDesdeNombre(
    filename: string,
    tramites: TramiteRow[]
  ): { tracking: string; confianza: number } | null {
    // Try to match any tramite tracking in the filename
    for (const tramite of tramites) {
      if (filename.includes(tramite.trackingNumber) || 
          filename.includes(tramite.trackingNumber.slice(-8))) {
        return { tracking: tramite.trackingNumber, confianza: 98 };
      }
    }

    // Random match simulation (80% chance of matching for demo)
    if (Math.random() < 0.8 && tramites.length > 0) {
      const randomTramite = tramites[Math.floor(Math.random() * tramites.length)];
      return { tracking: randomTramite.trackingNumber, confianza: 85 + Math.floor(Math.random() * 13) };
    }

    return null;
  }

  /**
   * Calculate batch integrity metrics
   */
  static calcularIntegridad(
    tramites: TramiteRow[],
    documentosHuerfanos: number
  ): IntegridadLote {
    const completos = tramites.filter(t => t.estado === 'completo').length;
    const faltantes = tramites.filter(t => t.estado === 'sin_factura').length;

    return {
      totalTramites: tramites.length,
      tramitesCompletos: completos,
      documentosHuerfanos,
      documentosFaltantes: faltantes,
      porcentajeCompletitud: tramites.length > 0 
        ? Math.round((completos / tramites.length) * 100) 
        : 0,
    };
  }
}
