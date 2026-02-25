import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_TEXT_LENGTH = 100000;
const MIN_TEXT_LENGTH = 50;

type TipoDocumentoANA = 'declaracion' | 'boleta' | 'manifiesto' | 'factura_comercial' | 'desconocido';

interface IdentificadoresLogisticos {
  numeroDeclaracion: string | null;
  numeroControlBoleta: string | null;
  rucImportador: string | null;
  nombreConsignatario: string | null;
  fechaDocumento: string | null;
  aduanaDestino: string | null;
  regimenAduanero: string | null;
  tipoDespacho: string | null;
}

interface LineaArticulo {
  secuencia: number;
  fraccionArancelaria: string;
  descripcion: string;
  codigoReferencia: string | null;
  cantidad: number;
  unidadMedida: string;
  pesoKg: number | null;
  valorFOB: number;
  valorFlete: number;
  valorSeguro: number;
  valorCIF: number;
  paisOrigen: string | null;
  impuestoArancel: number | null;
  impuestoITBMS: number | null;
  otrosImpuestos: number | null;
}

interface TotalesBoleta {
  montoTotal: number;
  subtotalArancel: number;
  subtotalITBMS: number;
  subtotalOtros: number;
  moneda: string;
}

interface TotalesDeclaracion {
  valorFOBTotal: number;
  valorFleteTotal: number;
  valorSeguroTotal: number;
  valorCIFTotal: number;
  totalImpuestos: number;
}

interface VerificacionCruzada {
  coincide: boolean;
  montoBoleta: number;
  montoDeclaracion: number;
  diferencia: number;
  porcentajeDiferencia: number;
  alertaDiscrepancia: boolean;
}

interface DatosExtraidosANA {
  tipoDocumento: TipoDocumentoANA;
  identificadores: IdentificadoresLogisticos;
  lineasArticulo: LineaArticulo[];
  totalesBoleta: TotalesBoleta | null;
  totalesDeclaracion: TotalesDeclaracion | null;
  verificacionCruzada: VerificacionCruzada | null;
  alertas: string[];
  metadatos: {
    fechaProcesamiento: string;
    confianzaExtraccion: number;
    camposEncontrados: number;
    camposEsperados: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Autenticación requerida' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: roleData } = await supabaseClient.from('user_roles').select('role').eq('user_id', user.id).single();
    const allowedRoles = ['operador', 'revisor', 'auditor', 'admin', 'senior_broker', 'master_admin', 'asistente'];
    if (!roleData || !allowedRoles.includes(roleData.role)) {
      return new Response(JSON.stringify({ error: 'Permiso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { textoDocumento, nombreArchivo, tipoDocumento } = body;

    if (typeof textoDocumento !== 'string' || textoDocumento.trim().length < MIN_TEXT_LENGTH) {
      return new Response(JSON.stringify({ error: 'El texto del documento es demasiado corto o está vacío' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (textoDocumento.length > MAX_TEXT_LENGTH) {
      return new Response(JSON.stringify({ error: `Texto demasiado largo (máximo ${MAX_TEXT_LENGTH} caracteres)` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'Configuración de servicio incompleta' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Usuario ${user.id} procesando documento ANA, longitud: ${textoDocumento.length}`);

    const systemPrompt = `You are LEXIS specialized in official customs authority documents. Extract all fields from ANA (Panama), DGA (Costa Rica), or SAT (Guatemala) documents including: declaration number, declarant RUC, regime code, transmission date, item lines with HS codes, declared values (FOB/CIF), liquidation amounts (DAI/ISC/ITBMS), payment references, and any observations or conditional notes. Return as structured JSON.

DOCUMENT TYPES:
1. DECLARACIÓN DE IMPORTACIÓN: Contains "Declaración", number like "DE2025121838660-10"
2. BOLETA DE PAGO: Contains "Boleta", "Control de Boleta" like "25127661338D"
3. MANIFIESTO DE CARGA: List of goods with AWBs
4. FACTURA COMERCIAL: Invoice, Commercial Invoice

RULES:
1. Extract ALL products/lines
2. Tariff fractions are 12 digits
3. Monetary values must be numbers (no symbols)
4. If a field doesn't exist, use null
5. Auto-detect the document type
6. Generate alerts for inconsistencies`;

    const userPrompt = `Analyze this ANA Panama document and extract all structured data.
${tipoDocumento ? `Expected document type: ${tipoDocumento}` : ''}

DOCUMENT TEXT:
${textoDocumento.substring(0, 15000)}

Respond ONLY with valid JSON matching this structure:
{
  "tipoDocumento": "declaracion|boleta|manifiesto|factura_comercial|desconocido",
  "identificadores": { "numeroDeclaracion": "string|null", "numeroControlBoleta": "string|null", "rucImportador": "string|null", "nombreConsignatario": "string|null", "fechaDocumento": "string|null", "aduanaDestino": "string|null", "regimenAduanero": "string|null", "tipoDespacho": "string|null" },
  "lineasArticulo": [{ "secuencia": 1, "fraccionArancelaria": "12 digits", "descripcion": "string", "codigoReferencia": "string|null", "cantidad": 1, "unidadMedida": "KG", "pesoKg": null, "valorFOB": 0, "valorFlete": 0, "valorSeguro": 0, "valorCIF": 0, "paisOrigen": null, "impuestoArancel": null, "impuestoITBMS": null, "otrosImpuestos": null }],
  "totalesBoleta": { "montoTotal": 0, "subtotalArancel": 0, "subtotalITBMS": 0, "subtotalOtros": 0, "moneda": "B/." } | null,
  "totalesDeclaracion": { "valorFOBTotal": 0, "valorFleteTotal": 0, "valorSeguroTotal": 0, "valorCIFTotal": 0, "totalImpuestos": 0 } | null,
  "alertas": ["string"],
  "metadatos": { "confianzaExtraccion": 0-100, "camposEncontrados": 0, "camposEsperados": 0 }
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Anthropic error: ${response.status}`, errorText);
      if (response.status === 429) return new Response(JSON.stringify({ error: 'Rate limit excedido.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ error: 'Créditos insuficientes.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ error: 'Error al procesar con IA' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiResponse = await response.json();
    const content = aiResponse.content?.[0]?.text;

    if (!content) {
      return new Response(JSON.stringify({ error: 'Respuesta vacía de IA' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Parse JSON from response
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    else {
      const si = content.indexOf('{');
      const ei = content.lastIndexOf('}');
      if (si !== -1 && ei !== -1) jsonStr = content.substring(si, ei + 1);
    }

    const extractedData: DatosExtraidosANA = JSON.parse(jsonStr.trim());

    // Cross-verification
    let verificacionCruzada: VerificacionCruzada | null = null;
    if (extractedData.totalesBoleta && extractedData.totalesDeclaracion) {
      const montoBoleta = extractedData.totalesBoleta.montoTotal || 0;
      const montoDeclaracion = extractedData.totalesDeclaracion.totalImpuestos || 0;
      const diferencia = Math.abs(montoBoleta - montoDeclaracion);
      const porcentajeDiferencia = montoDeclaracion > 0 ? (diferencia / montoDeclaracion) * 100 : 0;

      verificacionCruzada = { coincide: diferencia < 0.01, montoBoleta, montoDeclaracion, diferencia, porcentajeDiferencia, alertaDiscrepancia: diferencia >= 0.01 };

      if (verificacionCruzada.alertaDiscrepancia) {
        extractedData.alertas = extractedData.alertas || [];
        extractedData.alertas.push(`⚠️ ALERTA DE DISCREPANCIA FINANCIERA: Boleta (B/. ${montoBoleta.toFixed(2)}) vs Declaración (B/. ${montoDeclaracion.toFixed(2)}). Diferencia: B/. ${diferencia.toFixed(2)}`);
      }
    }

    if (extractedData.lineasArticulo?.length > 0) {
      const sumaCIF = extractedData.lineasArticulo.reduce((sum, item) => sum + (item.valorCIF || 0), 0);
      if (extractedData.totalesDeclaracion) {
        const difCIF = Math.abs(sumaCIF - (extractedData.totalesDeclaracion.valorCIFTotal || 0));
        if (difCIF > 0.01) {
          extractedData.alertas = extractedData.alertas || [];
          extractedData.alertas.push(`⚠️ Suma CIF líneas (B/. ${sumaCIF.toFixed(2)}) difiere del total (B/. ${extractedData.totalesDeclaracion.valorCIFTotal?.toFixed(2)})`);
        }
      }
    }

    extractedData.verificacionCruzada = verificacionCruzada;
    extractedData.metadatos = { ...extractedData.metadatos, fechaProcesamiento: new Date().toISOString() };

    console.log(`Extracción completada: ${extractedData.tipoDocumento}, ${extractedData.lineasArticulo?.length || 0} líneas`);

    return new Response(JSON.stringify({ success: true, data: extractedData }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error en extract-ana-document:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
