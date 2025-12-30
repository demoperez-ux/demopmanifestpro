import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Allowed origins for CORS - restrict to known application domains
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://www.lovable.dev',
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Input validation constants
const MAX_TEXT_LENGTH = 100000; // 100KB of text (facturas pueden ser largas)
const MAX_FILENAME_LENGTH = 255;
const MIN_TEXT_LENGTH = 10;

// Estructura mejorada para facturas Amazon
interface AmazonInvoiceItem {
  asin: string;
  descripcion: string;
  productGroup: string;
  paHsCode: string;        // PA HS Code de la factura
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
  transportationReference: string;  // AWB de Amazon (AMZPSR...)
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
  // Campos originales
  awbs: string[];
  valores: { valor: number; moneda: string; concepto?: string }[];
  descripciones: string[];
  proveedores: string[];
  fechas: string[];
  destinatarios: string[];
  paises: { origen?: string; destino?: string };
  items: { descripcion: string; cantidad?: number; valorUnitario?: number; valorTotal?: number; hsCode?: string }[];
  
  // Campos específicos para Amazon
  amazonInvoices: AmazonInvoice[];
  transportationReferences: string[];  // Lista de TRANSPORTATION REFERENCE (AWB Amazon)
  hsCodesPanama: { codigo: string; descripcion: string }[];  // PA HS Codes extraídos
  desglose: {
    totalItemValue: number;
    totalFreight: number;
    totalInvoiceValue: number;
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============================================
    // AUTHENTICATION CHECK
    // ============================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
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
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user role - only allow operador, revisor, auditor, and admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData) {
      console.error('Role check failed:', roleError?.message);
      return new Response(
        JSON.stringify({ error: 'Usuario sin rol asignado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowedRoles = ['operador', 'revisor', 'auditor', 'admin'];
    if (!allowedRoles.includes(roleData.role)) {
      console.error('Insufficient permissions for role:', roleData.role);
      return new Response(
        JSON.stringify({ error: 'Permiso denegado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // INPUT VALIDATION
    // ============================================
    
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_TEXT_LENGTH + 1000) {
      console.error('Request payload too large:', contentLength);
      return new Response(
        JSON.stringify({ error: 'Payload demasiado grande' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { textoFactura, nombreArchivo } = body;

    if (typeof textoFactura !== 'string') {
      console.error('Invalid textoFactura type:', typeof textoFactura);
      return new Response(
        JSON.stringify({ error: 'Tipo de datos inválido para textoFactura' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (nombreArchivo !== undefined && typeof nombreArchivo !== 'string') {
      console.error('Invalid nombreArchivo type:', typeof nombreArchivo);
      return new Response(
        JSON.stringify({ error: 'Tipo de datos inválido para nombreArchivo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!textoFactura || textoFactura.trim().length < MIN_TEXT_LENGTH) {
      console.error('Invoice text too short or empty');
      return new Response(
        JSON.stringify({ error: 'El texto de factura es demasiado corto o está vacío' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (textoFactura.length > MAX_TEXT_LENGTH) {
      console.error('Invoice text too long:', textoFactura.length);
      return new Response(
        JSON.stringify({ error: `Texto demasiado largo (máximo ${MAX_TEXT_LENGTH} caracteres)` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (nombreArchivo) {
      if (nombreArchivo.length > MAX_FILENAME_LENGTH) {
        console.error('Filename too long:', nombreArchivo.length);
        return new Response(
          JSON.stringify({ error: 'Nombre de archivo demasiado largo' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ============================================
    // PROCESS INVOICE WITH AMAZON-SPECIFIC EXTRACTION
    // ============================================
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY no está configurado');
      return new Response(
        JSON.stringify({ error: 'Configuración de servicio incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safeLogFilename = (nombreArchivo || 'sin nombre').substring(0, 100).replace(/[\r\n]/g, '');
    console.log(`Usuario ${user.id} procesando factura: ${safeLogFilename}, longitud texto: ${textoFactura.length}`);

    // Prompt optimizado para facturas Amazon
    const systemPrompt = `Eres un experto en extracción de datos de facturas comerciales Amazon para importación a Panamá.
Tu tarea es extraer información estructurada de facturas comerciales de Amazon.

CAMPOS CRÍTICOS A EXTRAER:
1. **TRANSPORTATION REFERENCE**: El número de seguimiento Amazon (formato AMZPSR...), este es el AWB principal
2. **PA HS Code**: Código arancelario de Panamá (formato XX.XX.XXXXXX o XXXX.XX.XXXXXX)
3. **UNIT VALUE**: Valor unitario de cada item en USD
4. **FREIGHT CHARGE**: Cargo de flete en USD
5. **TOTAL INVOICE VALUE**: Valor total de la factura en USD

OTROS CAMPOS IMPORTANTES:
- INVOICE NO: Número de factura
- INVOICE DATE: Fecha de factura
- CONSIGNEE: Nombre del destinatario
- PHONE: Teléfono del destinatario (con código de país)
- EMAIL: Email del destinatario
- ASIN: Código de producto Amazon
- DESCRIPTION: Descripción del producto
- QUANTITY: Cantidad de unidades
- COUNTRY OF ORIGIN: País de origen
- GROSS WEIGHT: Peso bruto en kg
- TOTAL ITEM VALUE: Valor total de items

IMPORTANTE:
- Una factura puede contener múltiples páginas/invoices
- Extrae TODOS los TRANSPORTATION REFERENCE que encuentres
- Los PA HS Codes son códigos arancelarios panameños, no confundir con otros códigos
- Normaliza teléfonos con formato +507XXXXXXXX para Panamá
- Los valores monetarios deben ser números, no strings`;

    const userPrompt = `Extrae los datos de esta factura comercial Amazon:

${textoFactura.substring(0, 15000)}

Responde SOLO con un JSON válido con esta estructura exacta:
{
  "amazonInvoices": [
    {
      "invoiceNo": "string",
      "invoiceDate": "string",
      "transportationReference": "string (AMZPSR...)",
      "numberOfPackages": number,
      "exporter": "string",
      "consignee": "string",
      "grossWeight": number,
      "phone": "string",
      "email": "string",
      "incoterms": "string",
      "items": [
        {
          "asin": "string",
          "descripcion": "string",
          "productGroup": "string",
          "paHsCode": "string",
          "countryOfOrigin": "string",
          "cantidad": number,
          "pesoNeto": number,
          "valorUnitario": number,
          "valorTotal": number
        }
      ],
      "totalItemValue": number,
      "freightCharge": number,
      "totalInvoiceValue": number
    }
  ],
  "transportationReferences": ["string"],
  "hsCodesPanama": [{"codigo": "string", "descripcion": "string"}],
  "awbs": ["string"],
  "valores": [{"valor": number, "moneda": "USD", "concepto": "string"}],
  "descripciones": ["string"],
  "destinatarios": ["string"],
  "fechas": ["string"],
  "proveedores": ["string"],
  "paises": {"origen": "string", "destino": "Panama"},
  "items": [{"descripcion": "string", "cantidad": number, "valorUnitario": number, "valorTotal": number, "hsCode": "string"}],
  "desglose": {
    "totalItemValue": number,
    "totalFreight": number,
    "totalInvoiceValue": number
  }
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

    // Extraer JSON de la respuesta
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    let extractedData: ExtractedInvoiceData;
    try {
      extractedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Error al parsear JSON de IA:', parseError);
      // Fallback con estructura mínima
      extractedData = {
        awbs: [],
        valores: [],
        descripciones: [],
        proveedores: [],
        fechas: [],
        destinatarios: [],
        paises: { destino: 'Panama' },
        items: [],
        amazonInvoices: [],
        transportationReferences: [],
        hsCodesPanama: [],
        desglose: { totalItemValue: 0, totalFreight: 0, totalInvoiceValue: 0 }
      };
    }

    // Post-procesamiento: extraer y normalizar datos
    
    // 1. Combinar todos los TRANSPORTATION REFERENCE de las facturas Amazon
    if (extractedData.amazonInvoices?.length > 0) {
      const refs = extractedData.amazonInvoices
        .map(inv => inv.transportationReference)
        .filter(ref => ref && ref.length > 5);
      
      extractedData.transportationReferences = [...new Set([
        ...(extractedData.transportationReferences || []),
        ...refs
      ])];
      
      // Agregar TRANSPORTATION REFERENCE a AWBs
      extractedData.awbs = [...new Set([
        ...(extractedData.awbs || []),
        ...extractedData.transportationReferences.map(r => r.replace(/[-\s]/g, '').toUpperCase())
      ])];
      
      // Extraer todos los HS Codes de Panama
      const hsCodes: { codigo: string; descripcion: string }[] = [];
      extractedData.amazonInvoices.forEach(inv => {
        inv.items?.forEach(item => {
          if (item.paHsCode) {
            hsCodes.push({
              codigo: item.paHsCode.replace(/\s/g, ''),
              descripcion: item.descripcion || item.productGroup || ''
            });
          }
        });
      });
      extractedData.hsCodesPanama = [...new Set(hsCodes.map(h => JSON.stringify(h)))].map(s => JSON.parse(s));
      
      // Calcular desglose total
      let totalItemValue = 0;
      let totalFreight = 0;
      let totalInvoiceValue = 0;
      
      extractedData.amazonInvoices.forEach(inv => {
        totalItemValue += inv.totalItemValue || 0;
        totalFreight += inv.freightCharge || 0;
        totalInvoiceValue += inv.totalInvoiceValue || 0;
      });
      
      extractedData.desglose = { totalItemValue, totalFreight, totalInvoiceValue };
      
      // Agregar valores al array de valores
      if (totalInvoiceValue > 0) {
        extractedData.valores = extractedData.valores || [];
        extractedData.valores.push({ valor: totalInvoiceValue, moneda: 'USD', concepto: 'TOTAL INVOICE VALUE' });
      }
      if (totalFreight > 0) {
        extractedData.valores.push({ valor: totalFreight, moneda: 'USD', concepto: 'FREIGHT CHARGE' });
      }
      if (totalItemValue > 0) {
        extractedData.valores.push({ valor: totalItemValue, moneda: 'USD', concepto: 'TOTAL ITEM VALUE' });
      }
    }

    // 2. Normalizar AWBs adicionales
    if (extractedData.awbs) {
      extractedData.awbs = extractedData.awbs.map(awb => 
        String(awb).replace(/[-\s]/g, '').toUpperCase()
      ).filter(awb => awb.length >= 9 && awb.length <= 25);
      extractedData.awbs = [...new Set(extractedData.awbs)];
    }

    console.log(`Datos extraídos: ${extractedData.awbs?.length || 0} AWBs, ${extractedData.amazonInvoices?.length || 0} facturas Amazon, ${extractedData.hsCodesPanama?.length || 0} HS Codes`);

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en extract-invoice-data:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
