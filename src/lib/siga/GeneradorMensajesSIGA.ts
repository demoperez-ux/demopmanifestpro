// ============================================
// GENERADOR DE MENSAJES XML – SIGA (OMA Standard)
// Mapea datos de Universal Gateway al esquema XML
// oficial del Sistema Integrado de Gestión Aduanera
// ============================================

export interface DatosDeclaracion {
  id: string;
  tipoDeclaracion: 'DUA' | 'DSI' | 'DRT' | 'DRE';
  codigoRegimen: string;
  regimenNombre: string;
  valorTransaccion: number;
  valorFOB: number;
  valorFlete: number;
  valorSeguro: number;
  valorCIF: number;
  moneda: string;
  clasificacionArancelaria: string;
  descripcionMercancia: string;
  paisOrigen: string;
  paisProcedencia: string;
  // Consignatario
  consignatarioNombre: string;
  consignatarioRUC: string;
  consignatarioDireccion?: string;
  // Transporte
  modoTransporte: string;
  buqueVuelo?: string;
  mawb?: string;
  // Bultos
  cantidadBultos: number;
  pesoNeto: number;
  pesoBruto: number;
  // Liquidación
  dai: number;
  isc: number;
  itbm: number;
  tasaServicio: number;
  totalLiquidacion: number;
  // Corredor
  corredorLicencia: string;
  corredorNombre: string;
  // Recinto
  recintoDestino?: string;
  aduanaDespacho?: string;
}

export interface MensajeXMLSIGA {
  id: string;
  xml: string;
  timestamp: string;
  hashIntegridad: string;
  version: string;
  tipoMensaje: string;
}

const SIGA_VERSION = '3.2.1';
const OMA_NAMESPACE = 'urn:wco:datamodel:WCO:DEC-DMS:2';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function mapCodigoRegimen(codigo: string): { codigo: string; descripcion: string } {
  const regimenes: Record<string, string> = {
    '10': 'Importación Definitiva',
    '20': 'Admisión Temporal',
    '21': 'Admisión Temporal para Perfeccionamiento Activo',
    '30': 'Reexportación',
    '40': 'Exportación Definitiva',
    '50': 'Tránsito Aduanero',
    '60': 'Depósito Aduanero',
    '70': 'Zona Libre',
    '80': 'Reimportación',
  };
  return {
    codigo,
    descripcion: regimenes[codigo] || 'Régimen No Especificado'
  };
}

function mapModoTransporte(modo: string): { codigo: string; nombre: string } {
  const modos: Record<string, { codigo: string; nombre: string }> = {
    'aereo': { codigo: '4', nombre: 'Transporte Aéreo' },
    'maritimo': { codigo: '1', nombre: 'Transporte Marítimo' },
    'terrestre': { codigo: '3', nombre: 'Transporte Terrestre' },
    'multimodal': { codigo: '8', nombre: 'Transporte Multimodal' },
    'courier': { codigo: '4', nombre: 'Servicio Courier (Aéreo)' },
  };
  return modos[modo] || { codigo: '9', nombre: 'Otro' };
}

export async function generarHashIntegridad(contenido: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(contenido);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generarMensajeXML(datos: DatosDeclaracion): Promise<MensajeXMLSIGA> {
  const timestamp = new Date().toISOString();
  const regimen = mapCodigoRegimen(datos.codigoRegimen);
  const transporte = mapModoTransporte(datos.modoTransporte);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Declaration xmlns="${OMA_NAMESPACE}"
             xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <DeclarationHeader>
    <MessageID>${escapeXml(datos.id)}</MessageID>
    <MessageType>SIGA-DEC</MessageType>
    <MessageVersion>${SIGA_VERSION}</MessageVersion>
    <CreationDateTime>${timestamp}</CreationDateTime>
    <SenderID>ZENITH-CUSTOMS-GATEWAY</SenderID>
    <ReceiverID>ANA-SIGA-PA</ReceiverID>
  </DeclarationHeader>

  <DeclarationType>
    <TypeCode>${escapeXml(datos.tipoDeclaracion)}</TypeCode>
    <CustomsRegimeCode>${escapeXml(regimen.codigo)}</CustomsRegimeCode>
    <CustomsRegimeDescription>${escapeXml(regimen.descripcion)}</CustomsRegimeDescription>
  </DeclarationType>

  <Consignee>
    <Name>${escapeXml(datos.consignatarioNombre)}</Name>
    <TaxIdentification>${escapeXml(datos.consignatarioRUC)}</TaxIdentification>
    ${datos.consignatarioDireccion ? `<Address>${escapeXml(datos.consignatarioDireccion)}</Address>` : ''}
  </Consignee>

  <CustomsBroker>
    <LicenseNumber>${escapeXml(datos.corredorLicencia)}</LicenseNumber>
    <Name>${escapeXml(datos.corredorNombre)}</Name>
  </CustomsBroker>

  <Transport>
    <ModeCode>${transporte.codigo}</ModeCode>
    <ModeDescription>${escapeXml(transporte.nombre)}</ModeDescription>
    ${datos.buqueVuelo ? `<VesselFlightNumber>${escapeXml(datos.buqueVuelo)}</VesselFlightNumber>` : ''}
    ${datos.mawb ? `<MasterAWB>${escapeXml(datos.mawb)}</MasterAWB>` : ''}
  </Transport>

  <GoodsDescription>
    <Description>${escapeXml(datos.descripcionMercancia)}</Description>
    <TariffClassification>${escapeXml(datos.clasificacionArancelaria)}</TariffClassification>
    <OriginCountry>${escapeXml(datos.paisOrigen)}</OriginCountry>
    <ProvenanceCountry>${escapeXml(datos.paisProcedencia)}</ProvenanceCountry>
    <Packages>${datos.cantidadBultos}</Packages>
    <NetWeight unit="KG">${datos.pesoNeto.toFixed(3)}</NetWeight>
    <GrossWeight unit="KG">${datos.pesoBruto.toFixed(3)}</GrossWeight>
  </GoodsDescription>

  <Valuation>
    <TransactionValue currency="${escapeXml(datos.moneda)}">${datos.valorTransaccion.toFixed(2)}</TransactionValue>
    <FOBValue currency="${escapeXml(datos.moneda)}">${datos.valorFOB.toFixed(2)}</FOBValue>
    <FreightValue currency="${escapeXml(datos.moneda)}">${datos.valorFlete.toFixed(2)}</FreightValue>
    <InsuranceValue currency="${escapeXml(datos.moneda)}">${datos.valorSeguro.toFixed(2)}</InsuranceValue>
    <CIFValue currency="${escapeXml(datos.moneda)}">${datos.valorCIF.toFixed(2)}</CIFValue>
  </Valuation>

  <DutyTaxFee>
    <ImportDuty rate="DAI">${datos.dai.toFixed(2)}</ImportDuty>
    <SelectiveConsumption rate="ISC">${datos.isc.toFixed(2)}</SelectiveConsumption>
    <TransferTax rate="ITBM">${datos.itbm.toFixed(2)}</TransferTax>
    <ServiceFee>${datos.tasaServicio.toFixed(2)}</ServiceFee>
    <TotalAssessment currency="${escapeXml(datos.moneda)}">${datos.totalLiquidacion.toFixed(2)}</TotalAssessment>
  </DutyTaxFee>

  ${datos.recintoDestino ? `<CustomsOffice>
    <DestinationWarehouse>${escapeXml(datos.recintoDestino)}</DestinationWarehouse>
    ${datos.aduanaDespacho ? `<ClearanceOffice>${escapeXml(datos.aduanaDespacho)}</ClearanceOffice>` : ''}
  </CustomsOffice>` : ''}

  <DigitalSignature>
    <SignatureStatus>PENDING</SignatureStatus>
    <SignatureTimestamp></SignatureTimestamp>
  </DigitalSignature>
</Declaration>`;

  const hash = await generarHashIntegridad(xml);

  return {
    id: datos.id,
    xml,
    timestamp,
    hashIntegridad: hash,
    version: SIGA_VERSION,
    tipoMensaje: 'SIGA-DEC',
  };
}

// ── Demo data generator ─────────────────────
export function generarDeclaracionDemo(): DatosDeclaracion {
  const tipos: DatosDeclaracion['tipoDeclaracion'][] = ['DUA', 'DSI', 'DRT'];
  const regimenes = ['10', '20', '40', '60'];
  const consignatarios = [
    { nombre: 'Global Trade Corp S.A.', ruc: '155700123-1-2024' },
    { nombre: 'Farma Plus International', ruc: '8-NT-2-34567' },
    { nombre: 'TechImport Panamá S.A.', ruc: '155900456-1-2023' },
    { nombre: 'AgroInsumos del Istmo', ruc: '2-700-1234' },
  ];

  const cons = consignatarios[Math.floor(Math.random() * consignatarios.length)];
  const valorFOB = Math.round(Math.random() * 50000 + 500);
  const flete = Math.round(valorFOB * 0.08);
  const seguro = Math.round(valorFOB * 0.015);
  const cif = valorFOB + flete + seguro;
  const dai = Math.round(cif * 0.10);
  const isc = Math.round((cif + dai) * 0.05);
  const itbm = Math.round((cif + dai + isc) * 0.07);

  return {
    id: `DEC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    tipoDeclaracion: tipos[Math.floor(Math.random() * tipos.length)],
    codigoRegimen: regimenes[Math.floor(Math.random() * regimenes.length)],
    regimenNombre: '',
    valorTransaccion: valorFOB,
    valorFOB,
    valorFlete: flete,
    valorSeguro: seguro,
    valorCIF: cif,
    moneda: 'USD',
    clasificacionArancelaria: `${Math.floor(Math.random() * 9000 + 1000)}.${Math.floor(Math.random() * 90 + 10)}.${Math.floor(Math.random() * 90 + 10)}`,
    descripcionMercancia: ['Suplementos alimenticios varios', 'Equipo médico diagnóstico', 'Repuestos automotrices', 'Productos farmacéuticos'][Math.floor(Math.random() * 4)],
    paisOrigen: ['US', 'CN', 'DE', 'MX', 'CO'][Math.floor(Math.random() * 5)],
    paisProcedencia: ['US', 'CO', 'MX'][Math.floor(Math.random() * 3)],
    consignatarioNombre: cons.nombre,
    consignatarioRUC: cons.ruc,
    modoTransporte: 'aereo',
    buqueVuelo: `CM${Math.floor(Math.random() * 900 + 100)}`,
    mawb: `230-${Math.floor(Math.random() * 90000000 + 10000000)}`,
    cantidadBultos: Math.floor(Math.random() * 50 + 1),
    pesoNeto: Math.round(Math.random() * 500 + 10),
    pesoBruto: Math.round(Math.random() * 600 + 15),
    dai,
    isc,
    itbm,
    tasaServicio: 3.00,
    totalLiquidacion: dai + isc + itbm + 3,
    corredorLicencia: `ANA-${Math.floor(Math.random() * 9000 + 1000)}`,
    corredorNombre: 'Corredor Demo',
    recintoDestino: ['Tocumen', 'Colón Free Zone', 'Balboa', 'Manzanillo'][Math.floor(Math.random() * 4)],
    aduanaDespacho: 'Aduana de Tocumen',
  };
}
