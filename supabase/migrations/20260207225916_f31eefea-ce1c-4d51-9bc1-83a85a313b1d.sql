
-- Table for Advance Rulings (Consultas Clasificatorias / Resoluciones Anticipadas)
CREATE TABLE public.consultas_clasificatorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_resolucion TEXT NOT NULL,
  fecha_resolucion TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_vigencia_inicio TIMESTAMP WITH TIME ZONE,
  fecha_vigencia_fin TIMESTAMP WITH TIME ZONE,
  solicitante TEXT NOT NULL,
  descripcion_mercancia TEXT NOT NULL,
  hts_code VARCHAR NOT NULL,
  descripcion_arancelaria TEXT,
  criterio_ana TEXT NOT NULL,
  fundamento_legal TEXT,
  dai_percent NUMERIC DEFAULT 0,
  itbms_percent NUMERIC DEFAULT 7,
  isc_percent NUMERIC DEFAULT 0,
  autoridad_anuente VARCHAR,
  estado VARCHAR NOT NULL DEFAULT 'vigente',
  notas TEXT,
  corredor_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consultas_clasificatorias ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view consultas" 
  ON public.consultas_clasificatorias 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Revisores y admins pueden insertar consultas" 
  ON public.consultas_clasificatorias 
  FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = corredor_id);

CREATE POLICY "Revisores y admins pueden actualizar consultas" 
  ON public.consultas_clasificatorias 
  FOR UPDATE 
  USING (has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = corredor_id);

-- Trigger for updated_at
CREATE TRIGGER update_consultas_clasificatorias_updated_at
  BEFORE UPDATE ON public.consultas_clasificatorias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for HTS lookups
CREATE INDEX idx_consultas_hts ON public.consultas_clasificatorias(hts_code);
CREATE INDEX idx_consultas_estado ON public.consultas_clasificatorias(estado);
CREATE INDEX idx_consultas_descripcion ON public.consultas_clasificatorias USING GIN(to_tsvector('spanish', descripcion_mercancia));

-- Add AFC columns to embarques_orion
ALTER TABLE public.embarques_orion 
  ADD COLUMN IF NOT EXISTS afc_apto_despacho_anticipado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS afc_certificado_cumplimiento JSONB,
  ADD COLUMN IF NOT EXISTS afc_perecedero BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS afc_prioridad_periferia BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS afc_alerta_perecedero_emitida BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS afc_sello_facilitacion BOOLEAN NOT NULL DEFAULT false;
