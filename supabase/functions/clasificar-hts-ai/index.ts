import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ClasificacionRequest {
  descripcion: string;
  lineItemsFactura?: string[];
  peso?: number;
  valor?: number;
  jurisdiction?: string;
  precedents?: string[];
}

interface ClasificacionResponse {
  hsCode: string;
  descripcionArancelaria: string;
  confianza: number;
  razonamiento: string;
  terminosSensibles: Array<{
    termino: string;
    categoria: string;
    riesgo: 'alto' | 'medio' | 'bajo';
    autoridad?: string;
  }>;
  requiereRevision: boolean;
  motivoRevision?: string;
  sugerenciasAlternativas?: Array<{
    hsCode: string;
    descripcion: string;
    confianza: number;
  }>;
}

const SYSTEM_PROMPT = `You are an expert customs tariff classifier with deep knowledge of the Harmonized System (HS/SAC). Apply the 6 General Rules of Interpretation (GRI) in strict order. For each classification request, provide: (1) the 10-digit HS code, (2) the GRI rule applied, (3) confidence score 0-100, (4) legal justification, (5) applicable DAI/ISC/VAT rates for PA/CR/GT.

CÓDIGOS HTS COMUNES PANAMÁ:
- 9503: Juguetes (9503.00.99 genérico)
- 8471: Computadoras y partes (8471.30.01 laptops)
- 8517: Teléfonos celulares (8517.12.00)
- 6110: Ropa de punto (6110.20.00 algodón)
- 4202: Maletas y bolsos (4202.12.01)
- 8528: Monitores/TV (8528.52.01)
- 3304: Cosméticos (3304.99.00)
- 3004: Medicamentos (3004.90.99)

AUTORIDADES REGULADORAS:
- MINSA: Productos médicos, farmacéuticos, alimentos, cosméticos
- MIDA: Productos agrícolas, plantas, semillas
- MINGOB: Armas, explosivos, equipos de seguridad
- ASEP: Equipos de radio, telecomunicaciones

Respond ALWAYS in valid JSON format (Spanish).`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autenticación requerida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { descripcion, lineItemsFactura, peso, valor, jurisdiction, precedents } = await req.json() as ClasificacionRequest;
    
    if (!descripcion) {
      return new Response(
        JSON.stringify({ error: 'Descripción requerida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY no configurada');
    }

    let userPrompt = `Clasifica el siguiente producto para importación (jurisdicción: ${jurisdiction || 'PA'}):\n\nDESCRIPCIÓN: "${descripcion}"`;

    if (lineItemsFactura && lineItemsFactura.length > 0) {
      userPrompt += `\n\nLÍNEAS DE FACTURA:\n${lineItemsFactura.map((l, i) => `${i + 1}. ${l}`).join('\n')}`;
    }
    if (peso) userPrompt += `\n\nPESO: ${peso} kg`;
    if (valor) userPrompt += `\nVALOR DECLARADO: USD ${valor}`;
    if (precedents && precedents.length > 0) {
      userPrompt += `\n\nPRECEDENTES EXISTENTES:\n${precedents.join('\n')}`;
    }

    userPrompt += `\n\nResponde en JSON con esta estructura exacta:
{
  "hsCode": "código HTS de 8-10 dígitos",
  "descripcionArancelaria": "descripción oficial del código",
  "confianza": número 0-100,
  "razonamiento": "explicación con GRI aplicada",
  "terminosSensibles": [{ "termino": "...", "categoria": "salud|seguridad|electronico|quimico|regulado", "riesgo": "alto|medio|bajo", "autoridad": "MINSA|MIDA|etc" }],
  "requiereRevision": true/false,
  "motivoRevision": "razón si requiere revisión",
  "sugerenciasAlternativas": [{ "hsCode": "...", "descripcion": "...", "confianza": 0-100 }]
}`;

    console.log('[clasificar-hts-ai] Procesando:', descripcion.substring(0, 50));

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
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Límite de solicitudes excedido, intenta más tarde' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes en Anthropic' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('[clasificar-hts-ai] Anthropic error:', response.status, errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.content?.[0]?.text;

    if (!content) {
      throw new Error('Respuesta vacía del modelo AI');
    }

    // Extract JSON from response
    let jsonStr = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      const startIdx = content.indexOf('{');
      const endIdx = content.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = content.substring(startIdx, endIdx + 1);
      }
    }

    const clasificacion: ClasificacionResponse = JSON.parse(jsonStr);
    console.log('[clasificar-hts-ai] Clasificado:', clasificacion.hsCode, 'confianza:', clasificacion.confianza);

    return new Response(
      JSON.stringify(clasificacion),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[clasificar-hts-ai] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error desconocido',
        hsCode: '9999.99.99',
        descripcionArancelaria: 'CLASIFICACIÓN PENDIENTE',
        confianza: 0,
        razonamiento: 'Error en clasificación AI - requiere revisión manual',
        terminosSensibles: [],
        requiereRevision: true,
        motivoRevision: 'Error en procesamiento AI'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
