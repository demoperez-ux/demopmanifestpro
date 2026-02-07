import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Types ──────────────────────────────────────────
interface OrionShipment {
  shipment_id: string;
  reference: string;
  document_type: 'BL' | 'MAWB' | 'CPIC' | 'DUA';
  shipper: string;
  consignee: string;
  consignee_tax_id?: string;
  origin_country: string;
  destination_country: string;
  customs_clearance_required: boolean;
  cargo_description?: string;
  gross_weight_kg?: number;
  net_weight_kg?: number;
  packages?: number;
  value_fob?: number;
  value_freight?: number;
  value_insurance?: number;
  currency?: string;
  transport_mode: 'air' | 'sea' | 'land';
  destination_precinct?: string;
  vessel_flight?: string;
  eta?: string;
  documents?: OrionDocument[];
  // GS1 Fields from Orion WMS
  gln_shipper?: string;
  gln_destination?: string;
  gtin_items?: OrionGTINItem[];
}

interface OrionDocument {
  type: string;
  reference: string;
  present: boolean;
}

interface OrionGTINItem {
  gtin: string;
  description: string;
  quantity: number;
  unit: string;
  sku?: string;
}

// ── Validation ─────────────────────────────────────
const PANAMA_CODE = 'PA';
const REQUIRED_DOC_TYPES = ['commercial_invoice', 'packing_list'];
const TRANSPORT_MODE_MAP: Record<string, string> = {
  air: 'aereo',
  sea: 'maritimo',
  land: 'terrestre',
};

// ── GS1 Checksum Validation ──────────────────────────
function calcularChecksumGS1(digitos: string): string {
  const nums = digitos.replace(/\D/g, '');
  if (nums.length < 1) return '';
  let suma = 0;
  for (let i = 0; i < nums.length; i++) {
    const digito = parseInt(nums[i], 10);
    const posDesdeDerechaBase0 = nums.length - 1 - i;
    suma += digito * (posDesdeDerechaBase0 % 2 === 0 ? 3 : 1);
  }
  const resto = suma % 10;
  return resto === 0 ? '0' : String(10 - resto);
}

function validarGTIN(gtin: string): { valido: boolean; errores: string[] } {
  const limpio = gtin.replace(/\D/g, '');
  if (limpio.length !== 13 && limpio.length !== 14) {
    return { valido: false, errores: [`Longitud inválida: ${limpio.length}`] };
  }
  const sinCheck = limpio.slice(0, -1);
  const checkRecibido = limpio[limpio.length - 1];
  const checkCalculado = calcularChecksumGS1(sinCheck);
  if (checkRecibido !== checkCalculado) {
    return { valido: false, errores: [`Checksum inválido: esperado ${checkCalculado}, recibido ${checkRecibido}`] };
  }
  return { valido: true, errores: [] };
}

function validarGLN(gln: string): boolean {
  const limpio = gln.replace(/\D/g, '');
  if (limpio.length !== 13) return false;
  const sinCheck = limpio.slice(0, 12);
  const checkRecibido = limpio[12];
  return checkRecibido === calcularChecksumGS1(sinCheck);
}

// ── GS1 GTIN→HTS Auto-complete ──────────────────────
async function autocompletarGTIN(
  supabase: any,
  items: OrionGTINItem[]
): Promise<{
  resultados: Array<{ gtin: string; hts?: string; descripcion?: string; conflicto: boolean; mensaje: string }>;
  conflictos: string[];
}> {
  const resultados: Array<{ gtin: string; hts?: string; descripcion?: string; conflicto: boolean; mensaje: string }> = [];
  const conflictos: string[] = [];

  for (const item of items) {
    const gtinLimpio = item.gtin.replace(/\D/g, '');
    const validacion = validarGTIN(gtinLimpio);

    if (!validacion.valido) {
      conflictos.push(`GTIN ${gtinLimpio} inválido: ${validacion.errores.join(', ')}`);
      resultados.push({ gtin: gtinLimpio, conflicto: true, mensaje: `Checksum GS1 inválido` });
      continue;
    }

    // Look up in mapeo_gs1_hts
    const { data: mapeos } = await supabase
      .from('mapeo_gs1_hts')
      .select('partida_arancelaria, descripcion_producto, descripcion_arancelaria, conflicto_detectado')
      .eq('gtin', gtinLimpio)
      .eq('activo', true)
      .order('usos_exitosos', { ascending: false })
      .limit(3);

    if (!mapeos || mapeos.length === 0) {
      resultados.push({ gtin: gtinLimpio, conflicto: false, mensaje: 'GTIN no registrado — clasificación manual requerida' });
      continue;
    }

    // Check for conflicts: multiple different HTS codes
    const htsUnicos = new Set(mapeos.map((m: any) => m.partida_arancelaria));
    if (htsUnicos.size > 1) {
      const confMsg = `Veredicto de Zod: Conflicto de identidad GS1 detectado. GTIN ${gtinLimpio} tiene ${htsUnicos.size} partidas diferentes: ${[...htsUnicos].join(', ')}`;
      conflictos.push(confMsg);
      resultados.push({ gtin: gtinLimpio, conflicto: true, mensaje: confMsg });
      continue;
    }

    // Check description mismatch
    const mapeo = mapeos[0];
    if (mapeo.conflicto_detectado) {
      conflictos.push(`GTIN ${gtinLimpio} tiene conflicto previo no resuelto`);
      resultados.push({ gtin: gtinLimpio, hts: mapeo.partida_arancelaria, conflicto: true, mensaje: 'Conflicto previo pendiente' });
      continue;
    }

    // Compare descriptions
    const descOrion = item.description.toLowerCase();
    const descZenith = (mapeo.descripcion_producto || '').toLowerCase();
    const palabrasOrion = new Set(descOrion.split(/\s+/).filter((w: string) => w.length > 3));
    const palabrasZenith = new Set(descZenith.split(/\s+/).filter((w: string) => w.length > 3));
    const interseccion = [...palabrasOrion].filter(w => palabrasZenith.has(w));
    const similitud = palabrasOrion.size > 0 ? interseccion.length / palabrasOrion.size : 1;

    if (similitud < 0.2 && palabrasOrion.size >= 2) {
      const confMsg = `Veredicto de Zod: Conflicto de identidad GS1 detectado. El GTIN ${gtinLimpio} reportado no coincide con la descripción aduanera. Orion: "${item.description}" vs ZENITH: "${mapeo.descripcion_producto}"`;
      conflictos.push(confMsg);
      resultados.push({ gtin: gtinLimpio, hts: mapeo.partida_arancelaria, conflicto: true, mensaje: confMsg });
      
      // Mark conflict in DB
      await supabase
        .from('mapeo_gs1_hts')
        .update({ conflicto_detectado: true, notas_conflicto: confMsg })
        .eq('gtin', gtinLimpio);
      continue;
    }

    // Success: auto-complete
    resultados.push({
      gtin: gtinLimpio,
      hts: mapeo.partida_arancelaria,
      descripcion: mapeo.descripcion_arancelaria,
      conflicto: false,
      mensaje: `Autocompletado: ${mapeo.partida_arancelaria} (${mapeo.descripcion_arancelaria || mapeo.descripcion_producto})`,
    });

    // Increment usage counter
    await supabase
      .from('mapeo_gs1_hts')
      .update({ usos_exitosos: (mapeo.usos_exitosos || 0) + 1, ultimo_uso: new Date().toISOString() })
      .eq('gtin', gtinLimpio)
      .eq('partida_arancelaria', mapeo.partida_arancelaria);
  }

  return { resultados, conflictos };
}

// ── GLN Chain of Custody Audit ──────────────────────
async function auditarGLNCustodia(
  supabase: any,
  glnShipper: string | undefined,
  nombreShipper: string
): Promise<{ cadenaIntegra: boolean; alertas: string[]; stellaNota: string }> {
  const alertas: string[] = [];

  if (!glnShipper) {
    return {
      cadenaIntegra: false,
      alertas: ['Sin GLN de shipper proporcionado por Orion'],
      stellaNota: 'Jefe, Orion no proporcionó GLN del remitente. Cadena de custodia no verificable.',
    };
  }

  if (!validarGLN(glnShipper)) {
    return {
      cadenaIntegra: false,
      alertas: [`GLN shipper ${glnShipper} tiene formato/checksum inválido`],
      stellaNota: `Jefe, el GLN ${glnShipper} del remitente tiene checksum inválido. Posible error de transcripción.`,
    };
  }

  // Check if GLN shipper is registered in mapeo_gs1_hts
  const { data: mapeos } = await supabase
    .from('mapeo_gs1_hts')
    .select('nombre_shipper')
    .eq('gln_shipper', glnShipper.replace(/\D/g, ''))
    .limit(1);

  if (mapeos && mapeos.length > 0) {
    const nombreRegistrado = mapeos[0].nombre_shipper || '';
    const normOrion = nombreShipper.toUpperCase().trim();
    const normZenith = nombreRegistrado.toUpperCase().trim();

    if (normOrion === normZenith || normOrion.includes(normZenith) || normZenith.includes(normOrion)) {
      return {
        cadenaIntegra: true,
        alertas: [],
        stellaNota: `Cadena de custodia verificada ✅. GLN ${glnShipper} corresponde a "${nombreShipper}" — exportador registrado.`,
      };
    } else {
      alertas.push(`Discrepancia shipper: Orion="${nombreShipper}" vs ZENITH="${nombreRegistrado}" para GLN ${glnShipper}`);
      return {
        cadenaIntegra: false,
        alertas,
        stellaNota: `⚠️ Discrepancia de cadena de custodia: Orion reporta "${nombreShipper}" pero ZENITH registra "${nombreRegistrado}" para GLN ${glnShipper}.`,
      };
    }
  }

  return {
    cadenaIntegra: false,
    alertas: [`GLN ${glnShipper} no está en directorio de asociados ZENITH`],
    stellaNota: `Jefe, GLN ${glnShipper} de "${nombreShipper}" no está registrado. Recomiendo verificar y registrar como asociado de negocio.`,
  };
}

// ── AFC Perishable Detection ──────────────────────────
const PERISHABLE_PATTERNS = [
  /\b(frutas?|verduras?|hortalizas?|legumbres?|vegetales?)\b/i,
  /\b(carne|pollo|pescado|mariscos?|camar[oó]n|langosta)\b/i,
  /\b(leche|l[aá]cteos?|queso|yogur|mantequilla|crema)\b/i,
  /\b(huevos?|embutidos?|jam[oó]n|chorizo)\b/i,
  /\b(flores?|plantas?|rosas?|orqu[ií]deas?)\b/i,
  /\b(vacunas?|insulina|biol[oó]gicos?|sueros?)\b/i,
  /\b(congelados?|refrigerados?|cadena\s+fr[ií]o)\b/i,
  /\b(semillas?|fertilizantes?\s+org[aá]nicos?)\b/i,
];

function isPerishable(cargoDescription: string | undefined): boolean {
  if (!cargoDescription) return false;
  return PERISHABLE_PATTERNS.some(p => p.test(cargoDescription));
}

// ── AFC Pre-Arrival Assessment ────────────────────────
function evaluateAFCPreArrival(shipment: OrionShipment, docScore: number, zodOk: boolean, preLiq: boolean): {
  aptoDespachoAnticipado: boolean;
  certificado: Record<string, unknown> | null;
  selloFacilitacion: boolean;
} {
  const checks = [
    { criterio: 'Documentación ≥80%', cumple: docScore >= 80, art: 'Art. 7.1 AFC' },
    { criterio: 'Integridad Zod', cumple: zodOk, art: 'Art. 10.4 AFC' },
    { criterio: 'Pre-Liquidación', cumple: preLiq, art: 'Art. 7.1 AFC' },
    { criterio: 'ID Fiscal', cumple: !!shipment.consignee_tax_id, art: 'Art. 10.1 AFC' },
  ];
  const score = checks.filter(c => c.cumple).length * 25;
  const apto = score >= 75;

  return {
    aptoDespachoAnticipado: apto,
    certificado: apto ? {
      fechaEmision: new Date().toISOString(),
      estado: score === 100 ? 'aprobado' : 'parcial',
      puntajeTotal: score,
      verificaciones: checks,
      fundamentoLegal: 'Ley 26 de 2016 — Art. 7.1 AFC (OMC)',
      stellaResumen: score === 100
        ? 'Expediente cumple 100% AFC. Apto para despacho anticipado.'
        : `Expediente cumple ${score}% AFC. Despacho anticipado con observaciones.`,
    } : null,
    selloFacilitacion: score === 100,
  };
}

function calculateDocumentHealth(docs: OrionDocument[] | undefined): {
  score: number;
  findings: string[];
  stellaNotes: string[];
} {
  const findings: string[] = [];
  const stellaNotes: string[] = [];

  if (!docs || docs.length === 0) {
    return {
      score: 10,
      findings: ['No se recibieron documentos de Orion'],
      stellaNotes: ['Jefe, este embarque llegó sin documentos adjuntos. Necesitamos solicitar la documentación al embarcador.'],
    };
  }

  let totalChecks = 0;
  let passedChecks = 0;

  for (const reqType of REQUIRED_DOC_TYPES) {
    totalChecks++;
    const doc = docs.find(d => d.type === reqType);
    if (doc?.present) {
      passedChecks++;
    } else {
      const label = reqType === 'commercial_invoice' ? 'Factura Comercial' : 'Lista de Empaque';
      findings.push(`Documento faltante: ${label}`);
      stellaNotes.push(`Falta la ${label}. Art. 60 RECAUCA exige este documento para el despacho.`);
    }
  }

  totalChecks++;
  const transportDoc = docs.find(d => ['bl', 'awb', 'cpic', 'carta_porte'].includes(d.type));
  if (transportDoc?.present) {
    passedChecks++;
  } else {
    findings.push('Documento de transporte faltante (B/L, AWB o CPIC)');
    stellaNotes.push('Jefe, no se detectó documento de transporte. Sin este documento no se puede tramitar la destinación aduanera.');
  }

  const optionalDocs = ['certificate_of_origin', 'phyto', 'minsa_permit', 'mida_permit'];
  for (const optType of optionalDocs) {
    const doc = docs.find(d => d.type === optType);
    if (doc && !doc.present) {
      totalChecks++;
      findings.push(`Documento referenciado pero faltante: ${optType}`);
    } else if (doc?.present) {
      totalChecks++;
      passedChecks++;
    }
  }

  const extraDocs = docs.filter(d => d.present && ![...REQUIRED_DOC_TYPES, ...optionalDocs, 'bl', 'awb', 'cpic', 'carta_porte'].includes(d.type));
  if (extraDocs.length > 0) {
    totalChecks += extraDocs.length;
    passedChecks += extraDocs.length;
  }

  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  if (score === 100) {
    stellaNotes.push('Documentación completa. El expediente está listo para pre-liquidación automática.');
  } else if (score >= 70) {
    stellaNotes.push('Documentación parcial. Se puede iniciar la pre-liquidación pero habrá observaciones pendientes.');
  }

  return { score, findings, stellaNotes };
}

function checkDuplicates(ref: string, existingRefs: string[]): {
  isDuplicate: boolean;
  findings: string[];
} {
  const normalizedRef = ref.replace(/[-\s]/g, '').toUpperCase();
  const isDuplicate = existingRefs.some(
    existing => existing.replace(/[-\s]/g, '').toUpperCase() === normalizedRef
  );

  return {
    isDuplicate,
    findings: isDuplicate
      ? [`Documento duplicado detectado: ${ref}. Ya existe un embarque con esta referencia en ZENITH.`]
      : [],
  };
}

function calculatePreLiquidation(shipment: OrionShipment): Record<string, unknown> | null {
  const fob = shipment.value_fob;
  if (!fob || fob <= 0) return null;

  const freight = shipment.value_freight ?? Math.round(fob * 0.07 * 100) / 100;
  const insurance = shipment.value_insurance ?? Math.round(fob * 0.01 * 100) / 100;
  const cif = Math.round((fob + freight + insurance) * 100) / 100;

  const daiRate = 10;
  const montoDAI = Math.round(cif * (daiRate / 100) * 100) / 100;
  const baseITBMS = cif + montoDAI;
  const montoITBMS = Math.round(baseITBMS * 0.07 * 100) / 100;
  const tasaSistema = 3.00;
  const total = Math.round((montoDAI + montoITBMS + tasaSistema) * 100) / 100;

  let categoria: string;
  if (cif <= 100) categoria = 'B - De Minimis';
  else if (cif <= 2000) categoria = 'C - Bajo Valor';
  else categoria = 'D - Alto Valor (Requiere Corredor)';

  return {
    valorFOB: fob,
    valorFlete: freight,
    valorSeguro: insurance,
    valorCIF: cif,
    seguroTeorico: shipment.value_insurance === undefined,
    categoriaAduanera: categoria,
    estimadoDAI: montoDAI,
    tasaDAI: daiRate,
    estimadoITBMS: montoITBMS,
    tasaSistema,
    totalEstimado: total,
    nota: 'Pre-liquidación estimada. Tasas definitivas dependen de la clasificación HTS del corredor.',
    fundamentoLegal: 'Decreto Ley 1 de 2008, Art. 42 — Liquidación provisional',
    calculadoPor: 'ZENITH Orion Listener',
    fechaCalculo: new Date().toISOString(),
  };
}

// ── Main Handler ───────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const shipments: OrionShipment[] = Array.isArray(body) ? body : body.shipments ? body.shipments : [body];

    if (!shipments.length) {
      return new Response(
        JSON.stringify({ error: 'No shipments provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingEmbarques } = await supabase
      .from('embarques_orion')
      .select('referencia, orion_shipment_id')
      .limit(1000);

    const existingRefs = (existingEmbarques || []).map((e: any) => e.referencia);
    const existingShipmentIds = new Set((existingEmbarques || []).map((e: any) => e.orion_shipment_id));

    const results = {
      processed: 0,
      filtered_out: 0,
      duplicates: 0,
      errors: 0,
      gs1_conflicts: 0,
      details: [] as Array<{ shipment_id: string; status: string; reason?: string; gs1?: any }>,
    };

    for (const shipment of shipments) {
      try {
        // ── Filter: Only PA + customs required ──
        if (shipment.destination_country !== PANAMA_CODE) {
          results.filtered_out++;
          results.details.push({
            shipment_id: shipment.shipment_id,
            status: 'filtered',
            reason: `destination_country=${shipment.destination_country}, expected PA`,
          });
          continue;
        }

        if (!shipment.customs_clearance_required) {
          results.filtered_out++;
          results.details.push({
            shipment_id: shipment.shipment_id,
            status: 'filtered',
            reason: 'customs_clearance_required=false',
          });
          continue;
        }

        if (existingShipmentIds.has(shipment.shipment_id)) {
          results.duplicates++;
          results.details.push({
            shipment_id: shipment.shipment_id,
            status: 'duplicate',
            reason: 'orion_shipment_id already exists in ZENITH',
          });
          continue;
        }

        // ── Document Health (Stella) ──
        const docHealth = calculateDocumentHealth(shipment.documents);

        // ── Duplicate Document Check (Zod) ──
        const dupCheck = checkDuplicates(shipment.reference, existingRefs);

        // ── Pre-Liquidation ──
        const preLiquidation = calculatePreLiquidation(shipment);

        // ── GS1 GTIN Validation & Auto-complete ──
        let gs1Resultado: any = null;
        let gs1Conflictos: string[] = [];
        let gs1Validado = false;

        if (shipment.gtin_items && shipment.gtin_items.length > 0) {
          const gs1Result = await autocompletarGTIN(supabase, shipment.gtin_items);
          gs1Resultado = gs1Result.resultados;
          gs1Conflictos = gs1Result.conflictos;
          gs1Validado = gs1Conflictos.length === 0;

          if (gs1Conflictos.length > 0) {
            results.gs1_conflicts += gs1Conflictos.length;
            docHealth.stellaNotes.push(
              `⚠️ Zod GS1: ${gs1Conflictos.length} conflicto(s) de identidad GS1 detectado(s). Pre-liquidación bloqueada para ítems afectados.`
            );
          } else {
            docHealth.stellaNotes.push(
              `✅ GS1: ${gs1Result.resultados.length} GTIN(s) validados. Autocompletado exitoso de partidas arancelarias.`
            );
          }
        }

        // ── GLN Chain of Custody Audit ──
        let glnAuditoria: any = null;
        if (shipment.gln_shipper) {
          glnAuditoria = await auditarGLNCustodia(
            supabase,
            shipment.gln_shipper,
            shipment.shipper
          );
          
          if (!glnAuditoria.cadenaIntegra) {
            docHealth.stellaNotes.push(glnAuditoria.stellaNota);
            docHealth.findings.push(...glnAuditoria.alertas);
          } else {
            docHealth.stellaNotes.push(glnAuditoria.stellaNota);
          }
        }

        // ── Zod findings ──
        const zodFindings = [
          ...docHealth.findings,
          ...dupCheck.findings,
          ...gs1Conflictos,
        ];

        if (shipment.gross_weight_kg && shipment.net_weight_kg) {
          const diff = ((shipment.gross_weight_kg - shipment.net_weight_kg) / shipment.gross_weight_kg) * 100;
          if (diff > 40) {
            zodFindings.push(`Diferencia peso bruto/neto excesiva: ${diff.toFixed(1)}%. Verificar embalaje.`);
          }
        }

        // ── Determine status ──
        let estado = 'pendiente';
        if (gs1Conflictos.length > 0) {
          estado = 'gs1_conflicto'; // Blocked by Zod
        } else if (preLiquidation) {
          estado = 'pre_liquidado';
        }
        if (zodFindings.length > 2) {
          estado = 'pendiente';
        }

        // Calculate CIF
        const fob = shipment.value_fob || 0;
        const freight = shipment.value_freight ?? Math.round(fob * 0.07 * 100) / 100;
        const insurance = shipment.value_insurance ?? Math.round(fob * 0.01 * 100) / 100;
        const cif = Math.round((fob + freight + insurance) * 100) / 100;

        // ── AFC Protocol ──
        const perecedero = isPerishable(shipment.cargo_description);
        const zodOk = zodFindings.length === 0;
        const afcResult = evaluateAFCPreArrival(shipment, docHealth.score, zodOk, !!preLiquidation);

        if (perecedero) {
          docHealth.stellaNotes.push('🧊 Mercancía perecedera detectada. Art. 7.9 AFC exige despacho prioritario. Prioridad Periferia activada.');
        }
        if (afcResult.aptoDespachoAnticipado) {
          docHealth.stellaNotes.push('✅ Expediente apto para Despacho Anticipado (Art. 7.1 AFC). Documentación verificada antes del arribo.');
        }

        // ── Insert into DB ──
        const { error: insertError } = await supabase
          .from('embarques_orion')
          .insert({
            orion_shipment_id: shipment.shipment_id,
            referencia: shipment.reference,
            tipo_documento: shipment.document_type,
            shipper: shipment.shipper,
            consignatario: shipment.consignee,
            consignatario_ruc: shipment.consignee_tax_id,
            origin_country: shipment.origin_country,
            destination_country: shipment.destination_country,
            customs_clearance_required: shipment.customs_clearance_required,
            descripcion_carga: shipment.cargo_description,
            peso_bruto_kg: shipment.gross_weight_kg,
            peso_neto_kg: shipment.net_weight_kg,
            bultos: shipment.packages,
            valor_fob: shipment.value_fob,
            valor_flete: freight,
            valor_seguro: insurance,
            valor_cif: cif,
            moneda: shipment.currency || 'USD',
            modo_transporte: TRANSPORT_MODE_MAP[shipment.transport_mode] || 'aereo',
            recinto_destino: shipment.destination_precinct,
            buque_vuelo: shipment.vessel_flight,
            eta: shipment.eta,
            estado,
            salud_documental: docHealth.score,
            pre_liquidacion: preLiquidation,
            zod_validado: zodFindings.length === 0,
            zod_hallazgos: zodFindings,
            zod_duplicado_detectado: dupCheck.isDuplicate,
            stella_notas: docHealth.stellaNotes,
            // AFC fields
            afc_apto_despacho_anticipado: afcResult.aptoDespachoAnticipado,
            afc_certificado_cumplimiento: afcResult.certificado,
            afc_perecedero: perecedero,
            afc_prioridad_periferia: perecedero,
            afc_sello_facilitacion: afcResult.selloFacilitacion,
            // GS1 fields
            gln_shipper: shipment.gln_shipper?.replace(/\D/g, '') || null,
            gln_destino: shipment.gln_destination?.replace(/\D/g, '') || null,
            gtin_items: shipment.gtin_items || [],
            gs1_validado: gs1Validado,
            gs1_conflictos: gs1Conflictos,
          });

        if (insertError) {
          console.error(`Error inserting shipment ${shipment.shipment_id}:`, insertError);
          results.errors++;
          results.details.push({
            shipment_id: shipment.shipment_id,
            status: 'error',
            reason: insertError.message,
          });
        } else {
          results.processed++;
          existingRefs.push(shipment.reference);
          existingShipmentIds.add(shipment.shipment_id);
          results.details.push({
            shipment_id: shipment.shipment_id,
            status: estado,
            gs1: gs1Resultado ? { items: gs1Resultado.length, conflicts: gs1Conflictos.length } : undefined,
          });
        }
      } catch (shipmentError) {
        console.error(`Error processing shipment:`, shipmentError);
        results.errors++;
        results.details.push({
          shipment_id: shipment.shipment_id || 'unknown',
          status: 'error',
          reason: String(shipmentError),
        });
      }
    }

    console.log(`Orion Listener: ${results.processed} processed, ${results.filtered_out} filtered, ${results.duplicates} duplicates, ${results.gs1_conflicts} GS1 conflicts, ${results.errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_received: shipments.length,
          processed: results.processed,
          filtered_out: results.filtered_out,
          duplicates: results.duplicates,
          gs1_conflicts: results.gs1_conflicts,
          errors: results.errors,
        },
        details: results.details,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Orion Listener error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
