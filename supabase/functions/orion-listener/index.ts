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
}

interface OrionDocument {
  type: string;       // 'commercial_invoice', 'packing_list', 'bl', 'awb', 'phyto', etc.
  reference: string;
  present: boolean;
}

// ── Validation ─────────────────────────────────────
const PANAMA_CODE = 'PA';
const REQUIRED_DOC_TYPES = ['commercial_invoice', 'packing_list'];
const TRANSPORT_MODE_MAP: Record<string, string> = {
  air: 'aereo',
  sea: 'maritimo',
  land: 'terrestre',
};

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

  // Check required documents
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

  // Check transport document
  totalChecks++;
  const transportDoc = docs.find(d => ['bl', 'awb', 'cpic', 'carta_porte'].includes(d.type));
  if (transportDoc?.present) {
    passedChecks++;
  } else {
    findings.push('Documento de transporte faltante (B/L, AWB o CPIC)');
    stellaNotes.push('Jefe, no se detectó documento de transporte. Sin este documento no se puede tramitar la destinación aduanera.');
  }

  // Check optional but important documents
  const optionalDocs = ['certificate_of_origin', 'phyto', 'minsa_permit', 'mida_permit'];
  for (const optType of optionalDocs) {
    const doc = docs.find(d => d.type === optType);
    if (doc && !doc.present) {
      totalChecks++;
      // Referenced but not present
      findings.push(`Documento referenciado pero faltante: ${optType}`);
    } else if (doc?.present) {
      totalChecks++;
      passedChecks++;
    }
  }

  // Bonus for extra documents
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

  // Default rates for pre-liquidation estimate
  const daiRate = 10; // Generic estimate
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
    // Only accept POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body
    const body = await req.json();
    const shipments: OrionShipment[] = Array.isArray(body) ? body : body.shipments ? body.shipments : [body];

    if (!shipments.length) {
      return new Response(
        JSON.stringify({ error: 'No shipments provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for DB operations (webhook context)
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

    // Get existing references for duplicate check
    const { data: existingEmbarques } = await supabase
      .from('embarques_orion')
      .select('referencia, orion_shipment_id')
      .limit(1000);

    const existingRefs = (existingEmbarques || []).map(e => e.referencia);
    const existingShipmentIds = new Set((existingEmbarques || []).map(e => e.orion_shipment_id));

    const results = {
      processed: 0,
      filtered_out: 0,
      duplicates: 0,
      errors: 0,
      details: [] as Array<{ shipment_id: string; status: string; reason?: string }>,
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

        // ── Check for duplicate shipment ID ──
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

        // ── Zod findings ──
        const zodFindings = [
          ...docHealth.findings,
          ...dupCheck.findings,
        ];

        if (shipment.gross_weight_kg && shipment.net_weight_kg) {
          const diff = ((shipment.gross_weight_kg - shipment.net_weight_kg) / shipment.gross_weight_kg) * 100;
          if (diff > 40) {
            zodFindings.push(`Diferencia peso bruto/neto excesiva: ${diff.toFixed(1)}%. Verificar embalaje.`);
          }
        }

        // ── Determine status ──
        let estado = 'pendiente';
        if (preLiquidation) {
          estado = 'pre_liquidado';
        }
        if (zodFindings.length > 2) {
          estado = 'pendiente'; // Too many issues, keep as pending
        }

        // Calculate CIF
        const fob = shipment.value_fob || 0;
        const freight = shipment.value_freight ?? Math.round(fob * 0.07 * 100) / 100;
        const insurance = shipment.value_insurance ?? Math.round(fob * 0.01 * 100) / 100;
        const cif = Math.round((fob + freight + insurance) * 100) / 100;

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

    console.log(`Orion Listener: ${results.processed} processed, ${results.filtered_out} filtered, ${results.duplicates} duplicates, ${results.errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_received: shipments.length,
          processed: results.processed,
          filtered_out: results.filtered_out,
          duplicates: results.duplicates,
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
