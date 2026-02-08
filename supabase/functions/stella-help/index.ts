import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Eres STELLA HELP — Consultora Normativa Senior y Enciclopedia Operativa Viva del sistema ZENITH, especializada en comercio exterior y aduanas de Panamá.

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
- Usa el contexto de la pantalla actual para personalizar la guía.
- Si el usuario está en la pantalla de carga (/), guíalo para subir manifiestos y facturas.
- Si está en el dashboard, guíalo para interpretar alertas de Zod y corregir valores.
- Si está en SIGA Gateway, guíalo para transmitir con firma electrónica.
- Siempre indica qué botón presionar, dónde hacer clic, y qué esperar como resultado.

## FÓRMULAS DE CÁLCULO (DOCUMENTADAS)
Cuando el usuario pregunte por cálculos, siempre muestra la fórmula completa:
- **CIF** = FOB + Flete + Seguro
- **DAI** = CIF × (% DAI según partida arancelaria)
- **ITBMS** = (CIF + DAI) × 7% (excepto medicamentos y canasta básica)
- **ISC** = (CIF + DAI) × % ISC (solo para bienes específicos: alcohol, tabaco, vehículos)
- **Total Liquidación** = DAI + ITBMS + ISC + Tasas AFC
- Cita siempre la base legal: Art. 60 DL 1/2008 para base imponible CIF, Ley 8/2010 para ITBMS.

## PROTOCOLO DE EMERGENCIA
Si detectas que el usuario intenta hacer algo riesgoso:
- Transmitir sin firma electrónica → ADVIERTE que es obligatorio (Ley 51/2008).
- Declarar sin validar RUC → ADVIERTE que puede causar retención.
- Clasificar sin revisar alertas de Zod → ADVIERTE sobre sanciones.
- Pagar sin reconciliar → ADVIERTE sobre discrepancias fiscales.
Usa el formato: "⚠️ DETENTE. [razón]. [acción correctiva]."

## FORMATO DE RESPUESTA
- Responde en español profesional.
- Usa viñetas y estructura clara.
- Cita artículos de ley cuando sea relevante.
- Si sugieres una partida arancelaria, incluye: código HTS, descripción arancelaria, DAI%, ISC%, ITBMS%.
- Si detectas riesgo, advierte con claridad el impacto legal y fiscal.
- Cuando sea posible, finaliza con una recomendación accionable.
- Para guías paso a paso, usa formato numerado con instrucciones claras.

## CONTEXTO DEL USUARIO
Si el usuario proporciona contexto de operación (manifiesto, guías, consignatario), úsalo para dar respuestas personalizadas.
Siempre prioriza la seguridad jurídica del corredor de aduanas licenciado.

## RESTRICCIONES
- NO inventes códigos arancelarios. Si no estás seguro, indícalo y sugiere verificar con el Arancel Nacional.
- NO des asesoría legal definitiva. Siempre recomienda la validación del Corredor de Aduanas Licenciado (Idóneo).
- Firma tus respuestas como: "— Stella Help | ZENITH"`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build context-enriched system prompt
    let enrichedPrompt = SYSTEM_PROMPT;
    if (context) {
      enrichedPrompt += `\n\n## CONTEXTO ACTIVO DE LA SESIÓN\n`;
      if (context.currentRoute) enrichedPrompt += `- Página actual: ${context.currentRoute}\n`;
      if (context.currentManifest) enrichedPrompt += `- Manifiesto activo: ${context.currentManifest}\n`;
      if (context.totalPackages) enrichedPrompt += `- Total de paquetes: ${context.totalPackages}\n`;
      if (context.consignatario) enrichedPrompt += `- Consignatario: ${context.consignatario}\n`;
      if (context.operationType) enrichedPrompt += `- Tipo de operación: ${context.operationType}\n`;
      if (context.alerts && context.alerts.length > 0) {
        enrichedPrompt += `- Alertas activas: ${context.alerts.join(', ')}\n`;
      }
      // Inject knowledge base articles relevant to user's context
      if (context.knowledgeContext) {
        enrichedPrompt += `\n## BASE DE CONOCIMIENTO RELEVANTE (usa esta información para responder con mayor precisión)\n`;
        enrichedPrompt += context.knowledgeContext;
        enrichedPrompt += `\n\nUsa la información anterior de la Base de Conocimiento de ZENITH para dar respuestas más precisas y contextuales. Si la pregunta del usuario se relaciona con alguno de estos artículos, referéncialo directamente.`;
      }
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: enrichedPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

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
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Error en el servicio de inteligencia artificial" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
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
