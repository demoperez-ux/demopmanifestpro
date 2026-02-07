
-- Table for Orion FF incoming shipments
CREATE TABLE public.embarques_orion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Orion reference
  orion_shipment_id TEXT NOT NULL,
  referencia TEXT NOT NULL, -- B/L, MAWB, CPIC
  tipo_documento TEXT NOT NULL DEFAULT 'MAWB', -- BL, MAWB, CPIC, DUA
  
  -- Parties
  shipper TEXT,
  consignatario TEXT NOT NULL,
  consignatario_ruc TEXT,
  
  -- Origin / Destination
  origin_country TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  customs_clearance_required BOOLEAN NOT NULL DEFAULT true,
  
  -- Cargo details
  descripcion_carga TEXT,
  peso_bruto_kg NUMERIC,
  peso_neto_kg NUMERIC,
  bultos INTEGER,
  valor_fob NUMERIC,
  valor_flete NUMERIC,
  valor_seguro NUMERIC,
  valor_cif NUMERIC,
  moneda TEXT NOT NULL DEFAULT 'USD',
  
  -- Transport
  modo_transporte TEXT NOT NULL DEFAULT 'aereo', -- aereo, maritimo, terrestre
  recinto_destino TEXT,
  buque_vuelo TEXT,
  
  -- Timing
  eta TIMESTAMP WITH TIME ZONE,
  ata TIMESTAMP WITH TIME ZONE, -- actual time of arrival
  
  -- ZENITH processing
  estado TEXT NOT NULL DEFAULT 'pendiente', -- pendiente, en_proceso, pre_liquidado, aprobado, rechazado, descartado
  salud_documental INTEGER NOT NULL DEFAULT 0, -- 0-100%
  
  -- Pre-liquidation results (JSON)
  pre_liquidacion JSONB,
  
  -- Zod validation
  zod_validado BOOLEAN NOT NULL DEFAULT false,
  zod_hallazgos JSONB DEFAULT '[]'::jsonb,
  zod_duplicado_detectado BOOLEAN NOT NULL DEFAULT false,
  
  -- Stella notes
  stella_notas JSONB DEFAULT '[]'::jsonb,
  
  -- Audit
  operador_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.embarques_orion ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view embarques"
ON public.embarques_orion
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert embarques"
ON public.embarques_orion
FOR INSERT
WITH CHECK (true); -- Edge function inserts via service role

CREATE POLICY "Operators can update their embarques"
ON public.embarques_orion
FOR UPDATE
USING (
  auth.uid() = operador_id 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'revisor'::app_role)
);

-- Index for ETA-based queries
CREATE INDEX idx_embarques_orion_eta ON public.embarques_orion (eta);
CREATE INDEX idx_embarques_orion_estado ON public.embarques_orion (estado);
CREATE UNIQUE INDEX idx_embarques_orion_shipment_id ON public.embarques_orion (orion_shipment_id);

-- Trigger for updated_at
CREATE TRIGGER update_embarques_orion_updated_at
BEFORE UPDATE ON public.embarques_orion
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
