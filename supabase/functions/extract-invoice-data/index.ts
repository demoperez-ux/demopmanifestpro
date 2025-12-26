import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedInvoiceData {
  awbs: string[];
  valores: { valor: number; moneda: string; concepto?: string }[];
  descripciones: string[];
  proveedores: string[];
  fechas: string[];
  destinatarios: string[];
  paises: { origen?: string; destino?: string };
  items: { descripcion: string; cantidad?: number; valorUnitario?: number; valorTotal?: number }[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { textoFactura, nombreArchivo } = await req.json();
    
    if (!textoFactura || textoFactura.trim().length === 0) {
      console.error('No se proporcionó texto de factura');
      return new Response(
        JSON.stringify({ error: 'No se proporcionó texto de factura' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY no está configurado');
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY no está configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Procesando factura: ${nombreArchivo || 'sin nombre'}, longitud texto: ${textoFactura.length}`);

    const systemPrompt = `Eres un experto en extracción de datos de facturas comerciales e invoices para importación/exportación. 
Tu tarea es extraer información estructurada del texto de una factura.

DEBES extraer:
1. AWBs/Números de guía: Busca patrones como AWB, guía, tracking, número de seguimiento (formatos: 123-45678901, AWB123456789, etc.)
2. Valores monetarios: Busca precios, totales, subtotales, con moneda (USD, EUR, etc.)
3. Descripciones de productos: Items, merchandise, goods, contenido
4. Proveedores/Remitentes: Shipper, sender, from, vendor
5. Destinatarios: Consignee, recipient, to, destinatario
6. Fechas: Fecha de factura, envío, etc.
7. Países de origen y destino
8. Items detallados con cantidad y precios si están disponibles

IMPORTANTE:
- Extrae TODOS los AWBs que encuentres, incluso si parecen parciales
- Los valores deben ser números, no strings
- Si no encuentras algún dato, devuelve array vacío o null
- Normaliza los AWBs removiendo guiones y espacios`;

    const userPrompt = `Extrae los datos de esta factura comercial:

${textoFactura.substring(0, 8000)}

Responde SOLO con un JSON válido con esta estructura exacta:
{
  "awbs": ["string"],
  "valores": [{"valor": number, "moneda": "string", "concepto": "string"}],
  "descripciones": ["string"],
  "proveedores": ["string"],
  "fechas": ["string"],
  "destinatarios": ["string"],
  "paises": {"origen": "string", "destino": "string"},
  "items": [{"descripcion": "string", "cantidad": number, "valorUnitario": number, "valorTotal": number}]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error de AI gateway: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit excedido. Intente de nuevo en unos momentos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Contacte al administrador.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Error al procesar con IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('Respuesta vacía de IA');
      return new Response(
        JSON.stringify({ error: 'Respuesta vacía de IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Respuesta IA recibida, parseando JSON...');

    // Extraer JSON de la respuesta (puede venir con markdown)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    let extractedData: ExtractedInvoiceData;
    try {
      extractedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Error al parsear JSON de IA:', parseError, 'Contenido:', jsonStr.substring(0, 500));
      // Intentar extraer datos básicos del texto
      extractedData = {
        awbs: [],
        valores: [],
        descripciones: [],
        proveedores: [],
        fechas: [],
        destinatarios: [],
        paises: {},
        items: []
      };
    }

    // Normalizar AWBs
    if (extractedData.awbs) {
      extractedData.awbs = extractedData.awbs.map(awb => 
        String(awb).replace(/[-\s]/g, '').toUpperCase()
      ).filter(awb => awb.length >= 9 && awb.length <= 20);
    }

    console.log(`Datos extraídos: ${extractedData.awbs?.length || 0} AWBs, ${extractedData.valores?.length || 0} valores`);

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en extract-invoice-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
