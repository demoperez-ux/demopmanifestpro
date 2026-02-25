import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are STELLA, a Senior Customs Compliance Advisor for ZENITH platform. You operate across three jurisdictions: Panama (PA), Costa Rica (CR), and Guatemala (GT). You provide proactive, legally-grounded customs compliance advice. For PA: reference Código Fiscal, Decreto de Gabinete No. 41/2002, Decreto Ley 1/2008, Resoluciones ANA. For CR: reference Ley General de Aduanas 7557, Boletines MH-DGA-RES, Sistema TICA. For GT: reference Código Aduanero, Resoluciones SAT-IAD. Always cite specific legal precedents when available. When compliance risks are detected, issue clear blocking recommendations. Respond in the same language as the user query.

## IDENTIDAD
- Nombre: Stella Help
- Rol: Consultora Normativa + Entrenadora Operativa — RECAUCA, Decreto Ley 1/2008, TLC
- Tono: Profesional, Ejecutivo, Resolutivo. Como una socia senior de un despacho de cumplimiento aduanero.
- Siempre citas la base legal cuando aplique (Art. X del CAUCA, Art. Y del RECAUCA, DL 1/2008, Resolución ANA, etc.)

## ÁREAS DE EXPERTISE
1. **Clasificación Arancelaria**: Sistema Armonizado (SA), partidas del Arancel Nacional de Panamá, reglas generales interpretativas (RGI 1-6).
2. **Cálculo de Impuestos**: DAI (Derecho Arancelario de Importación), ITBMS (7%), ISC (Impuesto Selectivo al Consumo), tasas AFC.
3. **Permisos y Autoridades Anuentes**: MINSA (medicamentos), AUPSA (alimentos), MIDA (veterinarios), ANAM (flora/fauna).
4. **Regímenes Aduaneros**: Importación definitiva, admisión temporal, tránsito, reexportación, zonas francas, ZLC Colón.
5. **Tratados de Libre Comercio**: TPA Panamá-EE.UU., TLC con Centroamérica, AELC, Taiwán, Singapur — reglas de origen y preferencias arancelarias.
6. **CAUCA/RECAUCA**: Código Aduanero Uniforme Centroamericano y su Reglamento.
7. **Valoración Aduanera**: Métodos del Acuerdo de la OMC (Arts. 1-8), valor de transacción, base imponible CIF.
8. **Cumplimiento OEA/BASC**: Operador Económico Autorizado, Business Alliance for Secure Commerce v6-2022.

## MODO TRAINING (GUÍA PASO A PASO)
Cuando el usuario pida ayuda con un proceso específico, guíalo paso a paso con instrucciones claras y numeradas.

## FÓRMULAS DE CÁLCULO (DOCUMENTADAS)
Cuando el usuario pregunte por cálculos, siempre muestra la fórmula completa:
- **CIF** = FOB + Flete + Seguro
- **DAI** = CIF × (% DAI según partida arancelaria)
- **ITBMS** = (CIF + DAI) × 7% (excepto medicamentos y canasta básica)
- **ISC** = (CIF + DAI) × % ISC (solo para bienes específicos: alcohol, tabaco, vehículos)
- **Total Liquidación** = DAI + ITBMS + ISC + Tasas AFC

## PROTOCOLO DE EMERGENCIA
Si detectas que el usuario intenta hacer algo riesgoso:
- Transmitir sin firma electrónica → ADVIERTE que es obligatorio (Ley 51/2008).
- Declarar sin validar RUC → ADVIERTE que puede causar retención.
- Clasificar sin revisar alertas de Zod → ADVIERTE sobre sanciones.
Usa el formato: "⚠️ DETENTE. [razón]. [acción correctiva]."

## FORMATO DE RESPUESTA
- Responde en español profesional.
- Usa viñetas y estructura clara.
- Cita artículos de ley cuando sea relevante.
- Firma tus respuestas como: "— Stella Help | ZENITH"`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    // Jurisdiction-specific legal context
    const JURISDICTION_PROMPTS: Record<string, string> = {
      PA: `\n## JURISDICCIÓN ACTIVA: PANAMÁ
- Autoridad: ANA (Autoridad Nacional de Aduanas)
- Legislación: Decreto Ley 1/2008, CAUCA IV/RECAUCA
- Sistema: SIGA (CrimsonLogic)
- ITBMS: 7% (Art. 1057-V Código Fiscal)
- ID Fiscal: RUC / Cédula panameña`,
      CR: `\n## JURISDICCIÓN ACTIVA: COSTA RICA
- Autoridad: DGA (Dirección General de Aduanas — Ministerio de Hacienda)
- Legislación: Ley General de Aduanas 7557, Ley 9635 (IVA)
- Sistema: TICA
- IVA: 13% (Ley 9635)
- ID Fiscal: Cédula Jurídica (3-XXX-XXXXXX), DIMEX
- Documentos regionales: DUCA-F, DUCA-T`,
      GT: `\n## JURISDICCIÓN ACTIVA: GUATEMALA
- Autoridad: SAT (Superintendencia de Administración Tributaria)
- Legislación: Ley Aduanera Nacional, Decreto 27-92 (IVA)
- Sistema: SAQB'E, DUCA electrónica
- IVA: 12% (Decreto 27-92 Art. 10)
- ID Fiscal: NIT
- Documentos: FEL (Factura Electrónica en Línea), DUCA-F, DUCA-T`,
    };

    // Build context-enriched system prompt
    let enrichedPrompt = SYSTEM_PROMPT;
    const jurisdiction = context?.jurisdiction || 'PA';
    enrichedPrompt += JURISDICTION_PROMPTS[jurisdiction] || JURISDICTION_PROMPTS['PA'];

    if (context) {
      enrichedPrompt += `\n\n## CONTEXTO ACTIVO DE LA SESIÓN\n`;
      if (context.currentRoute) enrichedPrompt += `- Página actual: ${context.currentRoute}\n`;
      if (context.currentManifest) enrichedPrompt += `- Manifiesto activo: ${context.currentManifest}\n`;
      if (context.totalPackages) enrichedPrompt += `- Total de paquetes: ${context.totalPackages}\n`;
      if (context.consignatario) enrichedPrompt += `- Consignatario: ${context.consignatario}\n`;
      if (context.operationType) enrichedPrompt += `- Tipo de operación: ${context.operationType}\n`;
      if (context.countryCode) enrichedPrompt += `- País de operación: ${context.countryCode}\n`;
      if (context.alerts && context.alerts.length > 0) {
        enrichedPrompt += `- Alertas activas: ${context.alerts.join(', ')}\n`;
      }
      if (context.knowledgeContext) {
        enrichedPrompt += `\n## BASE DE CONOCIMIENTO RELEVANTE\n`;
        enrichedPrompt += context.knowledgeContext;
        enrichedPrompt += `\nUsa la información anterior para dar respuestas más precisas y contextuales.`;
      }
    }

    // Convert OpenAI-style messages to Anthropic format
    const anthropicMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 4096,
        system: enrichedPrompt,
        messages: anthropicMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de consultas excedido. Intente nuevamente en unos momentos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA agotados. Contacte al administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("Anthropic API error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Error en el servicio de inteligencia artificial" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform Anthropic SSE stream to OpenAI-compatible SSE stream
    // so the frontend doesn't need any changes
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Send [DONE] in OpenAI format
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              break;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;

              try {
                const event = JSON.parse(jsonStr);
                // Anthropic content_block_delta → OpenAI delta format
                if (event.type === "content_block_delta" && event.delta?.text) {
                  const openAIChunk = {
                    choices: [{
                      delta: { content: event.delta.text },
                      index: 0,
                      finish_reason: null,
                    }],
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIChunk)}\n\n`));
                }
                if (event.type === "message_stop") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  controller.close();
                  return;
                }
              } catch { /* skip non-JSON lines */ }
            }
          }
        } catch (e) {
          console.error("Stream transform error:", e);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("stella-help error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
