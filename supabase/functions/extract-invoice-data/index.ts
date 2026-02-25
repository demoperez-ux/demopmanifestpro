import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation constants
const MAX_TEXT_LENGTH = 100000;
const MIN_TEXT_LENGTH = 10;

interface AmazonInvoiceItem {
  asin: string;
  descripcion: string;
  productGroup: string;
  paHsCode: string;
  exportControlNumber: string;
  countryOfOrigin: string;
  cantidad: number;
  pesoNeto: number;
  valorUnitario: number;
  valorTotal: number;
}

interface AmazonInvoice {
  invoiceNo: string;
  invoiceDate: string;
  transportationReference: string;
  numberOfPackages: number;
  exporter: string;
  shipFrom: string;
  consignee: string;
  grossWeight: number;
  phone: string;
  email: string;
  incoterms: string;
  carrierServiceCode: string;
  taxId: string;
  items: AmazonInvoiceItem[];
  totalItemValue: number;
  freightCharge: number;
  giftWrapCharge: number;
  totalInvoiceValue: number;
}

interface ExtractedInvoiceData {
  awbs: string[];
  valores: { valor: number; moneda: string; concepto?: string }[];
  descripciones: string[];
  proveedores: string[];
  fechas: string[];
  destinatarios: string[];
  paises: { origen?: string; destino?: string };
  items: { descripcion: string; cantidad?: number; valorUnitario?: number; valorTotal?: number; hsCode?: string }[];
  amazonInvoices: AmazonInvoice[];
  transportationReferences: string[];
  hsCodesPanama: { codigo: string; descripcion: string }[];
  desglose: {
    totalItemValue: number;
    totalFreight: number;
    totalInvoiceValue: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Autenticación requerida' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Role check
    const { data: roleData } = await supabaseClient.from('user_roles').select('role').eq('user_id', user.id).single();
    const allowedRoles = ['operador', 'revisor', 'auditor', 'admin', 'senior_broker', 'master_admin', 'asistente'];
    if (!roleData || !allowedRoles.includes(roleData.role)) {
      return new Response(JSON.stringify({ error: 'Permiso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { textosPorPagina, textoFactura, nombreArchivo, awbsRequeridos } = body;
    const paginasTexto: string[] = textosPorPagina || (textoFactura ? [textoFactura] : []);
    
    if (!paginasTexto.length || !paginasTexto.some(p => p && p.trim().length >= MIN_TEXT_LENGTH)) {
      return new Response(JSON.stringify({ error: 'El texto de factura es demasiado corto o está vacío' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const awbsRequeridosSet = new Set<string>(
      (awbsRequeridos || []).map((awb: string) => awb.toUpperCase().replace(/[-\\s]/g, ''))
    );

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'Configuración de servicio incompleta' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Usuario ${user.id} procesando factura multi-página: ${paginasTexto.length} páginas`);

    const systemPrompt = `You are LEXIS, an intelligent document scribe for customs processing. You extract data from Amazon commercial invoices with maximum precision.

CRITICAL FIELDS:
1. TRANSPORTATION REFERENCE: Amazon tracking number (AMZPSR...)
2. PA HS Code: Panama tariff code (XX.XX.XXXXXX)
3. UNIT VALUE: Unit value in USD
4. FREIGHT CHARGE: Freight cost in USD
5. TOTAL INVOICE VALUE: Total value in USD

Respond ONLY with valid JSON, no markdown or additional text.`;

    const allInvoices: AmazonInvoice[] = [];
    const allTransportationRefs: string[] = [];
    const allHsCodes: { codigo: string; descripcion: string }[] = [];
    const facturasCoincidentes: AmazonInvoice[] = [];
    const facturasNoRequeridas: { transportationReference: string; page: number }[] = [];
    
    for (let pageIndex = 0; pageIndex < paginasTexto.length; pageIndex++) {
      const textoPage = paginasTexto[pageIndex];
      if (!textoPage || textoPage.trim().length < 20) continue;

      const userPrompt = `Extract data from this Amazon invoice (page ${pageIndex + 1}):

${textoPage.substring(0, 12000)}

Respond with JSON:
{\\"invoiceNo\\":\\"string\\",\\"invoiceDate\\":\\"string\\",\\"transportationReference\\":\\"AMZPSR...\\",\\"numberOfPackages\\":1,\\"exporter\\":\\"Amazon Export Sales LLC\\",\\"consignee\\":\\"string\\",\\"grossWeight\\":0.0,\\"phone\\":\\"string\\",\\"email\\":\\"string\\",\\"incoterms\\":\\"FCA\\",\\"items\\":[{\\"asin\\":\\"string\\",\\"descripcion\\":\\"string\\",\\"productGroup\\":\\"string\\",\\"paHsCode\\":\\"string\\",\\"countryOfOrigin\\":\\"string\\",\\"cantidad\\":1,\\"pesoNeto\\":0.0,\\"valorUnitario\\":0.0,\\"valorTotal\\":0.0}],\\"totalItemValue\\":0.0,\\"freightCharge\\":0.0,\\"totalInvoiceValue\\":0.0}`;

      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5-20250514',
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });

        if (!response.ok) {
          console.error(`Error procesando página ${pageIndex + 1}: ${response.status}`);
          const _body = await response.text();
          continue;
        }

        const aiResponse = await response.json();
        const content = aiResponse.content?.[0]?.text;
        if (!content) continue;

        let jsonStr = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) jsonStr = jsonMatch[1];
        else {
          const si = content.indexOf('{');
          const ei = content.lastIndexOf('}');
          if (si !== -1 && ei !== -1) jsonStr = content.substring(si, ei + 1);
        }

        const invoice: AmazonInvoice = JSON.parse(jsonStr.trim());
        invoice.transportationReference = invoice.transportationReference || '';
        (invoice as any).pageNumber = pageIndex + 1;
        
        allInvoices.push(invoice);
        
        if (invoice.transportationReference) {
          const refNormalizada = invoice.transportationReference.replace(/[-\\s]/g, '').toUpperCase();
          allTransportationRefs.push(invoice.transportationReference);
          
          let esRequerida = awbsRequeridosSet.size === 0;
          if (awbsRequeridosSet.size > 0) {
            for (const awbReq of awbsRequeridosSet) {
              if (refNormalizada.includes(awbReq) || awbReq.includes(refNormalizada)) { esRequerida = true; break; }
            }
          }
          
          if (esRequerida) facturasCoincidentes.push(invoice);
          else facturasNoRequeridas.push({ transportationReference: invoice.transportationReference, page: pageIndex + 1 });
        }
        
        invoice.items?.forEach(item => {
          if (item.paHsCode) allHsCodes.push({ codigo: item.paHsCode.replace(/\s/g, ''), descripcion: item.descripcion || '' });
        });

      } catch (parseError) {
        console.error(`Error parseando página ${pageIndex + 1}:`, parseError);
      }
    }

    let totalItemValue = 0, totalFreight = 0, totalInvoiceValue = 0;
    facturasCoincidentes.forEach(inv => {
      totalItemValue += inv.totalItemValue || 0;
      totalFreight += inv.freightCharge || 0;
      totalInvoiceValue += inv.totalInvoiceValue || 0;
    });

    const extractedData: ExtractedInvoiceData = {
      awbs: [...new Set(allTransportationRefs.map(r => r.replace(/[-\\s]/g, '').toUpperCase()))],
      valores: [
        { valor: totalInvoiceValue, moneda: 'USD', concepto: 'TOTAL INVOICE VALUE' },
        { valor: totalFreight, moneda: 'USD', concepto: 'FREIGHT CHARGE' },
        { valor: totalItemValue, moneda: 'USD', concepto: 'TOTAL ITEM VALUE' }
      ].filter(v => v.valor > 0),
      descripciones: [...new Set(facturasCoincidentes.flatMap(inv => inv.items?.map(i => i.descripcion) || []).filter(Boolean))],
      proveedores: ['Amazon Export Sales LLC'],
      fechas: [...new Set(allInvoices.map(inv => inv.invoiceDate).filter(Boolean))],
      destinatarios: [...new Set(facturasCoincidentes.map(inv => inv.consignee).filter(Boolean))],
      paises: { origen: 'US', destino: 'Panama' },
      items: facturasCoincidentes.flatMap(inv => inv.items?.map(item => ({ descripcion: item.descripcion, cantidad: item.cantidad, valorUnitario: item.valorUnitario, valorTotal: item.valorTotal, hsCode: item.paHsCode })) || []),
      amazonInvoices: facturasCoincidentes,
      transportationReferences: facturasCoincidentes.map(inv => inv.transportationReference),
      hsCodesPanama: [...new Set(allHsCodes.map(h => JSON.stringify(h)))].map(s => JSON.parse(s)),
      desglose: { totalItemValue, totalFreight, totalInvoiceValue }
    };

    const resumenProcesamiento = {
      totalPaginas: paginasTexto.length,
      facturasExtraidas: allInvoices.length,
      facturasCoincidentes: facturasCoincidentes.length,
      facturasNoRequeridas: facturasNoRequeridas.length,
      awbsEncontrados: allTransportationRefs,
      facturasOmitidas: facturasNoRequeridas
    };

    return new Response(
      JSON.stringify({ success: true, data: extractedData, resumen: resumenProcesamiento }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en extract-invoice-data:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
