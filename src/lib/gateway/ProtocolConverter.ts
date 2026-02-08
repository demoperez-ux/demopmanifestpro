// ============================================
// ZENITH API GATEWAY — Protocol Converter
// JSON ↔ XML transformation engine for
// TradeNet / CrimsonLogic interoperability
// ============================================

export interface ZenithPayload {
  declaracionId: string;
  tipoDeclaracion: string;
  codigoRegimen: string;
  consignatario: {
    nombre: string;
    ruc: string;
    direccion?: string;
  };
  corredor: {
    licencia: string;
    nombre: string;
  };
  transporte: {
    modo: string;
    buqueVuelo?: string;
    mawb?: string;
  };
  mercancia: {
    descripcion: string;
    clasificacionHTS: string;
    paisOrigen: string;
    paisProcedencia: string;
    bultos: number;
    pesoNeto: number;
    pesoBruto: number;
  };
  valoracion: {
    fob: number;
    flete: number;
    seguro: number;
    cif: number;
    moneda: string;
  };
  impuestos: {
    dai: number;
    isc: number;
    itbm: number;
    tasaServicio: number;
    total: number;
  };
  recintoDestino?: string;
  aduanaDespacho?: string;
}

export interface ConversionResult {
  xml: string;
  hash: string;
  bytesSize: number;
  timestamp: string;
  protocolo: 'TradeNet-XML' | 'CrimsonLogic-SOAP' | 'OMA-WCO';
  validacion: {
    camposCompletos: boolean;
    camposFaltantes: string[];
    advertencias: string[];
  };
}

// ── XML Escape ──────────────────────────────

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── Hash Generator ──────────────────────────

async function sha256(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Validation ──────────────────────────────

function validarPayload(payload: ZenithPayload): { completo: boolean; faltantes: string[]; advertencias: string[] } {
  const faltantes: string[] = [];
  const advertencias: string[] = [];

  if (!payload.declaracionId) faltantes.push('declaracionId');
  if (!payload.tipoDeclaracion) faltantes.push('tipoDeclaracion');
  if (!payload.codigoRegimen) faltantes.push('codigoRegimen');
  if (!payload.consignatario.nombre) faltantes.push('consignatario.nombre');
  if (!payload.consignatario.ruc) faltantes.push('consignatario.ruc');
  if (!payload.corredor.licencia) faltantes.push('corredor.licencia');
  if (!payload.mercancia.clasificacionHTS) faltantes.push('mercancia.clasificacionHTS');
  if (!payload.mercancia.paisOrigen) faltantes.push('mercancia.paisOrigen');
  if (payload.valoracion.cif <= 0) advertencias.push('Valor CIF es cero o negativo');
  if (payload.mercancia.pesoNeto > payload.mercancia.pesoBruto) {
    advertencias.push('Peso neto supera al peso bruto — verificar');
  }
  if (payload.impuestos.total <= 0) {
    advertencias.push('Total de liquidación es cero — puede indicar exoneración o error');
  }

  return { completo: faltantes.length === 0, faltantes, advertencias };
}

// ── Regime Codes ────────────────────────────

const REGIMENES: Record<string, string> = {
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

const MODOS_TRANSPORTE: Record<string, { code: string; name: string }> = {
  aereo:      { code: '4', name: 'Transporte Aéreo' },
  maritimo:   { code: '1', name: 'Transporte Marítimo' },
  terrestre:  { code: '3', name: 'Transporte Terrestre' },
  multimodal: { code: '8', name: 'Transporte Multimodal' },
  courier:    { code: '4', name: 'Servicio Courier (Aéreo)' },
};

// ── Core Converter: JSON → TradeNet XML ─────

export async function convertirATradeNetXML(payload: ZenithPayload): Promise<ConversionResult> {
  const ts = new Date().toISOString();
  const validacion = validarPayload(payload);
  const regDesc = REGIMENES[payload.codigoRegimen] || 'No Especificado';
  const transp = MODOS_TRANSPORTE[payload.transporte.modo] || { code: '9', name: 'Otro' };

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TradeNetDeclaration xmlns="urn:tradenet:customs:pa:v3"
                     xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                     schemaVersion="3.2">
  <Header>
    <MessageID>${esc(payload.declaracionId)}</MessageID>
    <MessageType>CUSTOMS_DECLARATION</MessageType>
    <SenderID>ZENITH-GATEWAY</SenderID>
    <ReceiverID>ANA-TRADENET-PA</ReceiverID>
    <CreatedAt>${ts}</CreatedAt>
    <Protocol>TradeNet-XML</Protocol>
  </Header>

  <Declaration>
    <TypeCode>${esc(payload.tipoDeclaracion)}</TypeCode>
    <RegimeCode>${esc(payload.codigoRegimen)}</RegimeCode>
    <RegimeDescription>${esc(regDesc)}</RegimeDescription>
  </Declaration>

  <Importer>
    <Name>${esc(payload.consignatario.nombre)}</Name>
    <TaxID>${esc(payload.consignatario.ruc)}</TaxID>
    ${payload.consignatario.direccion ? `<Address>${esc(payload.consignatario.direccion)}</Address>` : ''}
  </Importer>

  <CustomsBroker>
    <LicenseID>${esc(payload.corredor.licencia)}</LicenseID>
    <Name>${esc(payload.corredor.nombre)}</Name>
  </CustomsBroker>

  <Transport>
    <ModeCode>${transp.code}</ModeCode>
    <ModeDescription>${esc(transp.name)}</ModeDescription>
    ${payload.transporte.buqueVuelo ? `<CarrierRef>${esc(payload.transporte.buqueVuelo)}</CarrierRef>` : ''}
    ${payload.transporte.mawb ? `<MasterDocRef>${esc(payload.transporte.mawb)}</MasterDocRef>` : ''}
  </Transport>

  <Goods>
    <Description>${esc(payload.mercancia.descripcion)}</Description>
    <HTSCode>${esc(payload.mercancia.clasificacionHTS)}</HTSCode>
    <OriginCountry>${esc(payload.mercancia.paisOrigen)}</OriginCountry>
    <ProvenanceCountry>${esc(payload.mercancia.paisProcedencia)}</ProvenanceCountry>
    <PackageCount>${payload.mercancia.bultos}</PackageCount>
    <NetWeight unit="KG">${payload.mercancia.pesoNeto.toFixed(3)}</NetWeight>
    <GrossWeight unit="KG">${payload.mercancia.pesoBruto.toFixed(3)}</GrossWeight>
  </Goods>

  <Valuation currency="${esc(payload.valoracion.moneda)}">
    <FOB>${payload.valoracion.fob.toFixed(2)}</FOB>
    <Freight>${payload.valoracion.flete.toFixed(2)}</Freight>
    <Insurance>${payload.valoracion.seguro.toFixed(2)}</Insurance>
    <CIF>${payload.valoracion.cif.toFixed(2)}</CIF>
  </Valuation>

  <Assessment currency="${esc(payload.valoracion.moneda)}">
    <ImportDuty type="DAI">${payload.impuestos.dai.toFixed(2)}</ImportDuty>
    <SelectiveConsumption type="ISC">${payload.impuestos.isc.toFixed(2)}</SelectiveConsumption>
    <TransferTax type="ITBM">${payload.impuestos.itbm.toFixed(2)}</TransferTax>
    <ServiceFee>${payload.impuestos.tasaServicio.toFixed(2)}</ServiceFee>
    <TotalDue>${payload.impuestos.total.toFixed(2)}</TotalDue>
  </Assessment>

  ${payload.recintoDestino ? `<CustomsOffice>
    <Warehouse>${esc(payload.recintoDestino)}</Warehouse>
    ${payload.aduanaDespacho ? `<ClearanceOffice>${esc(payload.aduanaDespacho)}</ClearanceOffice>` : ''}
  </CustomsOffice>` : ''}

  <Signature>
    <Status>PENDING_XMLDSIG</Status>
    <Placeholder/>
  </Signature>
</TradeNetDeclaration>`;

  const hash = await sha256(xml);
  const encoder = new TextEncoder();

  return {
    xml,
    hash,
    bytesSize: encoder.encode(xml).length,
    timestamp: ts,
    protocolo: 'TradeNet-XML',
    validacion: {
      camposCompletos: validacion.completo,
      camposFaltantes: validacion.faltantes,
      advertencias: validacion.advertencias,
    },
  };
}

// ── SOAP Envelope for CrimsonLogic ──────────

export async function convertirACrimsonLogicSOAP(payload: ZenithPayload): Promise<ConversionResult> {
  const tradeNetResult = await convertirATradeNetXML(payload);
  const ts = new Date().toISOString();

  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:crim="urn:crimsonlogic:customs:pa:gateway">
  <soap:Header>
    <crim:AuthToken>{{OAUTH_TOKEN}}</crim:AuthToken>
    <crim:Timestamp>${ts}</crim:Timestamp>
    <crim:MessageID>${esc(payload.declaracionId)}</crim:MessageID>
    <crim:IntegrityHash>${tradeNetResult.hash}</crim:IntegrityHash>
  </soap:Header>
  <soap:Body>
    <crim:SubmitDeclaration>
      <crim:Payload>${tradeNetResult.xml.replace(/<?xml[^?]*\?>/g, '')}</crim:Payload>
    </crim:SubmitDeclaration>
  </soap:Body>
</soap:Envelope>`;

  const hash = await sha256(soap);
  const encoder = new TextEncoder();

  return {
    xml: soap,
    hash,
    bytesSize: encoder.encode(soap).length,
    timestamp: ts,
    protocolo: 'CrimsonLogic-SOAP',
    validacion: tradeNetResult.validacion,
  };
}

// ── Protocol Stats ──────────────────────────

export function obtenerEstadisticasConversion(resultados: ConversionResult[]): {
  totalConversiones: number;
  exitosas: number;
  conAdvertencias: number;
  bytesTotales: number;
  protocoloDistribucion: Record<string, number>;
} {
  return {
    totalConversiones: resultados.length,
    exitosas: resultados.filter(r => r.validacion.camposCompletos).length,
    conAdvertencias: resultados.filter(r => r.validacion.advertencias.length > 0).length,
    bytesTotales: resultados.reduce((s, r) => s + r.bytesSize, 0),
    protocoloDistribucion: resultados.reduce((acc, r) => {
      acc[r.protocolo] = (acc[r.protocolo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
}
