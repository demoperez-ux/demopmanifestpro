
-- ============================================
-- TABLA: mapeo_gs1_hts
-- Vincula GTIN (Orión WMS) con partida arancelaria (ZENITH)
-- Incluye GLN de shipper para auditoría de cadena de custodia
-- ============================================

CREATE TABLE public.mapeo_gs1_hts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- GS1 Identifiers
  gtin VARCHAR(14) NOT NULL,
  gtin_tipo VARCHAR(10) DEFAULT 'GTIN-13',
  gtin_checksum_valido BOOLEAN NOT NULL DEFAULT true,
  
  -- HTS Classification
  partida_arancelaria VARCHAR(20) NOT NULL,
  descripcion_arancelaria TEXT,
  descripcion_producto TEXT NOT NULL,
  unidad_medida VARCHAR(10) DEFAULT 'u',
  
  -- Tax rates
  dai_percent NUMERIC DEFAULT 0,
  isc_percent NUMERIC DEFAULT 0,
  itbms_percent NUMERIC DEFAULT 7,
  
  -- Regulatory
  autoridad_anuente VARCHAR(50),
  restricciones_salud TEXT[],
  
  -- GS1 Origin
  pais_origen VARCHAR(50),
  prefijo_gs1 VARCHAR(3),
  
  -- GLN Shipper (for chain of custody)
  gln_shipper VARCHAR(13),
  nombre_shipper TEXT,
  
  -- Orion sync metadata
  orion_sku VARCHAR(100),
  orion_sync_at TIMESTAMP WITH TIME ZONE,
  fuente VARCHAR(50) DEFAULT 'manual',
  
  -- Usage tracking
  usos_exitosos INTEGER DEFAULT 0,
  ultimo_uso TIMESTAMP WITH TIME ZONE DEFAULT now(),
  activo BOOLEAN DEFAULT true,
  
  -- Integrity
  corredor_id UUID,
  validado_por_zod BOOLEAN DEFAULT false,
  conflicto_detectado BOOLEAN DEFAULT false,
  notas_conflicto TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: one GTIN maps to one HTS
  CONSTRAINT unique_gtin_hts UNIQUE(gtin, partida_arancelaria)
);

-- Enable RLS
ALTER TABLE public.mapeo_gs1_hts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view mappings"
  ON public.mapeo_gs1_hts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Revisores y admins pueden insertar mapeos"
  ON public.mapeo_gs1_hts FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'revisor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Revisores y admins pueden actualizar mapeos"
  ON public.mapeo_gs1_hts FOR UPDATE
  USING (
    has_role(auth.uid(), 'revisor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Indexes for fast lookup
CREATE INDEX idx_mapeo_gs1_gtin ON public.mapeo_gs1_hts(gtin);
CREATE INDEX idx_mapeo_gs1_hts_code ON public.mapeo_gs1_hts(partida_arancelaria);
CREATE INDEX idx_mapeo_gs1_gln_shipper ON public.mapeo_gs1_hts(gln_shipper);
CREATE INDEX idx_mapeo_gs1_activo ON public.mapeo_gs1_hts(activo) WHERE activo = true;

-- Trigger for updated_at
CREATE TRIGGER update_mapeo_gs1_hts_updated_at
  BEFORE UPDATE ON public.mapeo_gs1_hts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add GLN fields to embarques_orion for chain of custody
ALTER TABLE public.embarques_orion 
  ADD COLUMN IF NOT EXISTS gln_shipper VARCHAR(13),
  ADD COLUMN IF NOT EXISTS gln_destino VARCHAR(13),
  ADD COLUMN IF NOT EXISTS gtin_items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS gs1_validado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gs1_conflictos JSONB DEFAULT '[]'::jsonb;
