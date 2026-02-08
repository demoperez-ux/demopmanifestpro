
-- Table for Trade Agreements (TLC/FTA) preferential tariffs
CREATE TABLE public.acuerdos_comerciales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_arancelario VARCHAR NOT NULL,
  pais_origen VARCHAR NOT NULL,
  tratado_nombre TEXT NOT NULL,
  tratado_codigo VARCHAR NOT NULL,
  arancel_preferencial NUMERIC NOT NULL DEFAULT 0,
  arancel_general NUMERIC NOT NULL DEFAULT 0,
  requisitos_origen TEXT,
  vigente_desde TIMESTAMP WITH TIME ZONE,
  vigente_hasta TIMESTAMP WITH TIME ZONE,
  activo BOOLEAN NOT NULL DEFAULT true,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.acuerdos_comerciales ENABLE ROW LEVEL SECURITY;

-- Policies: All authenticated users can read, only admins/revisores can write
CREATE POLICY "Authenticated users can view trade agreements"
  ON public.acuerdos_comerciales
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and revisores can insert trade agreements"
  ON public.acuerdos_comerciales
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins and revisores can update trade agreements"
  ON public.acuerdos_comerciales
  FOR UPDATE
  USING (has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Trade agreements cannot be deleted"
  ON public.acuerdos_comerciales
  FOR DELETE
  USING (false);

-- Performance indices for lookups by HS code and country
CREATE INDEX idx_acuerdos_codigo ON public.acuerdos_comerciales(codigo_arancelario);
CREATE INDEX idx_acuerdos_pais ON public.acuerdos_comerciales(pais_origen);
CREATE INDEX idx_acuerdos_codigo_pais ON public.acuerdos_comerciales(codigo_arancelario, pais_origen);

-- Trigger for updated_at
CREATE TRIGGER update_acuerdos_comerciales_updated_at
  BEFORE UPDATE ON public.acuerdos_comerciales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
