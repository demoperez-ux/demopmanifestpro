// ============================================
// MOTOR DE APRENDIZAJE HTS CON CLAUDE (ANTHROPIC)
// Clasificación evolutiva basada en correcciones
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ClasificacionRequest {
  descripcion: string;
  valorUSD: number;
  peso?: number;
  guia?: string;
  mawb?: string;
  userId?: string;
}

interface ClasificacionValidada {
  id: string;
  hts_code: string;
  descripcion_arancelaria: string;
  dai_percent: number;
  isc_percent: number;
  itbms_percent: number;
  autoridad_anuente?: string;
  confianza: number;
  usos_exitosos: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Autenticación requerida' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[Motor Aprendizaje] Usuario autenticado: ${user.id}`);

    const { descripcion, valorUSD, peso, guia, mawb } = await req.json() as ClasificacionRequest;
    console.log(`[Motor Aprendizaje] Procesando: "${descripcion.substring(0, 50)}..." valor: $${valorUSD}`);

    // ═══════════════════════════════════════════════════════
    // PASO 1: BUSCAR EN CLASIFICACIONES VALIDADAS (APRENDIDAS)
    // ═══════════════════════════════════════════════════════
    
    const descripcionNormalizada = normalizarDescripcion(descripcion);
    
    const { data: clasificacionesExistentes, error: searchError } = await supabase
      .from('clasificaciones_validadas')
      .select('*')
      .eq('activo', true)
      .textSearch('descripcion_normalizada', descripcionNormalizada, { type: 'websearch', config: 'spanish' })
      .order('usos_exitosos', { ascending: false })
      .limit(5);

    if (searchError) {
      console.log('[Motor Aprendizaje] Error buscando clasificaciones:', searchError.message);
    }

    if (clasificacionesExistentes && clasificacionesExistentes.length > 0) {
      const mejorMatch = clasificacionesExistentes[0] as ClasificacionValidada;
      
      if (mejorMatch.confianza >= 85) {
        console.log(`[Motor Aprendizaje] ✓ Usando clasificación aprendida: ${mejorMatch.hts_code}`);
        
        await supabase
          .from('clasificaciones_validadas')
          .update({ usos_exitosos: mejorMatch.usos_exitosos + 1 })
          .eq('id', mejorMatch.id);

        return new Response(JSON.stringify({
          success: true,
          source: 'APRENDIDO',
          clasificacion: {
            hsCode: mejorMatch.hts_code,
            descripcionArancelaria: mejorMatch.descripcion_arancelaria,
            daiPercent: mejorMatch.dai_percent,
            iscPercent: mejorMatch.isc_percent,
            itbmsPercent: mejorMatch.itbms_percent,
            autoridadAnuente: mejorMatch.autoridad_anuente,
            confianza: mejorMatch.confianza,
            usosExitosos: mejorMatch.usos_exitosos + 1
          }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // ═══════════════════════════════════════════════════════
    // PASO 2: USAR CLAUDE PARA CLASIFICACIÓN
    // ═══════════════════════════════════════════════════════
    
    console.log('[Motor Aprendizaje] Consultando Claude...');

    const systemPrompt = `You are an expert customs tariff classifier for Panama's National Customs Authority (ANA).
Your task is to classify products according to Panama's Harmonized System (HTS).

CRITICAL RULES:
1. HTS code must be format XXXX.XX.XX (8 digits with dots)
2. For value < $100 USD, classify as "De Minimis" (no taxes required)
3. Detect if requires permit from MINSA, APA, AUPSA, MIDA or other authority
4. Identify pharmaceutical, cosmetic, food, veterinary products

Respond ONLY with valid JSON.`;

    const userPrompt = `Classify this product for import to Panama:

DESCRIPTION: ${descripcion}
DECLARED VALUE: $${valorUSD} USD
WEIGHT: ${peso || 'Not specified'} LB
GUIDE: ${guia || 'N/A'}

Respond with this exact JSON format:
{
  "hsCode": "XXXX.XX.XX",
  "descripcionArancelaria": "Official description",
  "daiPercent": 0-15,
  "iscPercent": 0-25,
  "itbmsPercent": 7,
  "autoridadAnuente": "MINSA/APA/AUPSA/MIDA or null",
  "esFarmaceutico": true/false,
  "esRestringido": true/false,
  "confianza": 0-100,
  "notas": "Additional observations"
}`;

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const errText = await aiResponse.text();
      throw new Error(`Anthropic API error: ${aiResponse.status} - ${errText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.content?.[0]?.text;

    if (!content) {
      throw new Error('No classification received from AI');
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

    const clasificacion = JSON.parse(jsonStr.trim());
    console.log(`[Motor Aprendizaje] Claude clasificó: ${clasificacion.hsCode} (confianza: ${clasificacion.confianza}%)`);

    return new Response(JSON.stringify({
      success: true,
      source: 'AI',
      clasificacion: {
        hsCode: clasificacion.hsCode,
        descripcionArancelaria: clasificacion.descripcionArancelaria,
        daiPercent: clasificacion.daiPercent || 0,
        iscPercent: clasificacion.iscPercent || 0,
        itbmsPercent: clasificacion.itbmsPercent || 7,
        autoridadAnuente: clasificacion.autoridadAnuente,
        esFarmaceutico: clasificacion.esFarmaceutico || false,
        esRestringido: clasificacion.esRestringido || false,
        confianza: clasificacion.confianza,
        notas: clasificacion.notas
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[Motor Aprendizaje] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function normalizarDescripcion(descripcion: string): string {
  return descripcion
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
