// ============================================
// Servicio VUCE — Ventanilla Única de Comercio Exterior (MICI)
// Arquitectura para sincronización con VUCE/MICI
// ============================================

import { devLog } from '@/lib/logger';

export interface SolicitudVUCE {
  id: string;
  tipo: 'certificado_origen' | 'licencia_importacion' | 'permiso_exportacion';
  estado: 'borrador' | 'enviado' | 'en_revision' | 'aprobado' | 'rechazado';
  
  // Datos del solicitante
  corredorId: string;
  corredorNombre: string;
  importadorRuc: string;
  importadorNombre: string;
  
  // Datos de la mercancía
  hsCode: string;
  descripcionMercancia: string;
  paisOrigen: string;
  paisDestino: string;
  valorFOB: number;
  moneda: string;
  pesoKg: number;
  unidades: number;
  
  // TLC aplicable
  tlcAplicable?: string;
  preferenciaArancelaria?: number;
  
  // Certificado de Origen
  numeroCertificado?: string;
  fechaEmision?: string;
  fechaVigencia?: string;
  exportadorNombre?: string;
  exportadorDireccion?: string;
  
  // ZENITH metadata
  manifiestoId?: string;
  guiaReferencia?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface RespuestaVUCE {
  exitoso: boolean;
  numeroTramite?: string;
  estado: string;
  mensaje: string;
  fechaRespuesta: string;
  documentoUrl?: string;
}

// TLCs vigentes de Panamá
export const TLCS_PANAMA = [
  { id: 'TLC-USA', nombre: 'TPA (Panamá-USA)', paises: ['US', 'USA'], vigente: true },
  { id: 'TLC-EU', nombre: 'Acuerdo de Asociación UE-CA', paises: ['DE', 'FR', 'ES', 'IT', 'NL'], vigente: true },
  { id: 'TLC-TAIWAN', nombre: 'TLC Panamá-Taiwán', paises: ['TW', 'TWN'], vigente: true },
  { id: 'TLC-CHILE', nombre: 'TLC Panamá-Chile', paises: ['CL', 'CHL'], vigente: true },
  { id: 'TLC-PERU', nombre: 'TLC Panamá-Perú', paises: ['PE', 'PER'], vigente: true },
  { id: 'TLC-COLOMBIA', nombre: 'TLC Panamá-Colombia', paises: ['CO', 'COL'], vigente: true },
  { id: 'TLC-ISRAEL', nombre: 'TLC Panamá-Israel', paises: ['IL', 'ISR'], vigente: true },
  { id: 'TLC-MEX', nombre: 'TLC Panamá-México', paises: ['MX', 'MEX'], vigente: true },
  { id: 'TLC-CAN', nombre: 'TLC Panamá-Canadá', paises: ['CA', 'CAN'], vigente: true },
  { id: 'TLC-EFTA', nombre: 'TLC Panamá-EFTA', paises: ['CH', 'NO', 'IS', 'LI'], vigente: true },
  { id: 'TLC-UK', nombre: 'TLC Panamá-Reino Unido', paises: ['GB', 'UK'], vigente: true },
  { id: 'TLC-KR', nombre: 'TLC Panamá-Corea del Sur', paises: ['KR', 'KOR'], vigente: true },
];

/**
 * Servicio de integración con VUCE del MICI
 * Prepara datos en el formato requerido para la Ventanilla Única
 */
export class ServicioVUCE {

  /**
   * Genera payload para solicitud de Certificado de Origen vía VUCE
   */
  static prepararSolicitudOrigen(params: {
    hsCode: string;
    descripcion: string;
    paisOrigen: string;
    valorFOB: number;
    pesoKg: number;
    importadorRuc: string;
    importadorNombre: string;
    exportadorNombre?: string;
    corredorId: string;
    corredorNombre: string;
  }): SolicitudVUCE {
    const tlc = this.detectarTLC(params.paisOrigen);

    const solicitud: SolicitudVUCE = {
      id: `VUCE-${Date.now()}`,
      tipo: 'certificado_origen',
      estado: 'borrador',
      corredorId: params.corredorId,
      corredorNombre: params.corredorNombre,
      importadorRuc: params.importadorRuc,
      importadorNombre: params.importadorNombre,
      hsCode: params.hsCode,
      descripcionMercancia: params.descripcion,
      paisOrigen: params.paisOrigen,
      paisDestino: 'PA',
      valorFOB: params.valorFOB,
      moneda: 'USD',
      pesoKg: params.pesoKg,
      unidades: 1,
      tlcAplicable: tlc?.nombre,
      exportadorNombre: params.exportadorNombre,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    devLog(`[VUCE] Solicitud preparada: ${solicitud.id}, TLC: ${tlc?.nombre || 'N/A'}`);
    return solicitud;
  }

  /**
   * Detecta TLC aplicable según país de origen
   */
  static detectarTLC(paisOrigen: string): typeof TLCS_PANAMA[0] | null {
    const pais = paisOrigen.toUpperCase();
    return TLCS_PANAMA.find(t => t.vigente && t.paises.includes(pais)) || null;
  }

  /**
   * Genera XML para envío a VUCE (formato estándar)
   */
  static generarXMLVUCE(solicitud: SolicitudVUCE): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<SolicitudVUCE xmlns="urn:panama:mici:vuce:2024">
  <Encabezado>
    <NumeroSolicitud>${solicitud.id}</NumeroSolicitud>
    <TipoTramite>${solicitud.tipo}</TipoTramite>
    <FechaSolicitud>${solicitud.createdAt}</FechaSolicitud>
    <CorredorRUC>${solicitud.corredorId}</CorredorRUC>
    <CorredorNombre>${solicitud.corredorNombre}</CorredorNombre>
  </Encabezado>
  <Importador>
    <RUC>${solicitud.importadorRuc}</RUC>
    <Nombre>${solicitud.importadorNombre}</Nombre>
  </Importador>
  <Mercancia>
    <CodigoSA>${solicitud.hsCode}</CodigoSA>
    <Descripcion>${solicitud.descripcionMercancia}</Descripcion>
    <PaisOrigen>${solicitud.paisOrigen}</PaisOrigen>
    <PaisDestino>${solicitud.paisDestino}</PaisDestino>
    <ValorFOB moneda="${solicitud.moneda}">${solicitud.valorFOB}</ValorFOB>
    <PesoBruto unidad="KG">${solicitud.pesoKg}</PesoBruto>
  </Mercancia>
  ${solicitud.tlcAplicable ? `<PreferenciaArancelaria>
    <TLCAplicable>${solicitud.tlcAplicable}</TLCAplicable>
  </PreferenciaArancelaria>` : ''}
  <FirmaDigital>
    <Sistema>ZENITH</Sistema>
    <Version>2026</Version>
  </FirmaDigital>
</SolicitudVUCE>`;
  }
}

export default ServicioVUCE;
