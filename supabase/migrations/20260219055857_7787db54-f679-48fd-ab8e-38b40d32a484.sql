
-- Create table for customs legal precedents (Resoluciones Anticipadas, Criterios Técnicos)
CREATE TABLE public.customs_precedents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL DEFAULT 'PA',
  ruling_id TEXT NOT NULL,
  ruling_type TEXT NOT NULL DEFAULT 'clasificacion',
  authority TEXT NOT NULL,
  hs_code TEXT NOT NULL,
  description_keywords TEXT[] NOT NULL DEFAULT '{}',
  product_description TEXT,
  legal_rationale TEXT NOT NULL,
  gri_applied TEXT,
  effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
  expiration_date TIMESTAMP WITH TIME ZONE,
  source_document TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_country_code CHECK (country_code IN ('PA', 'CR', 'GT')),
  CONSTRAINT valid_ruling_type CHECK (ruling_type IN ('clasificacion', 'valoracion', 'origen'))
);

-- Index for fast lookups
CREATE INDEX idx_precedents_country_hs ON public.customs_precedents (country_code, hs_code);
CREATE INDEX idx_precedents_ruling_id ON public.customs_precedents (ruling_id);
CREATE INDEX idx_precedents_keywords ON public.customs_precedents USING GIN (description_keywords);

-- Enable RLS
ALTER TABLE public.customs_precedents ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read precedents (public legal knowledge)
CREATE POLICY "Authenticated users can view precedents"
ON public.customs_precedents
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only privileged roles can insert
CREATE POLICY "Privileged roles can insert precedents"
ON public.customs_precedents
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'senior_broker'::app_role) OR
  has_role(auth.uid(), 'master_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Only privileged roles can update
CREATE POLICY "Privileged roles can update precedents"
ON public.customs_precedents
FOR UPDATE
USING (
  has_role(auth.uid(), 'senior_broker'::app_role) OR
  has_role(auth.uid(), 'master_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Precedents cannot be deleted (immutable legal record)
CREATE POLICY "Precedents cannot be deleted"
ON public.customs_precedents
FOR DELETE
USING (false);

-- Trigger for updated_at
CREATE TRIGGER update_customs_precedents_updated_at
BEFORE UPDATE ON public.customs_precedents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
