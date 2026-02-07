-- Storage bucket for inspection photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspecciones-17pts', 'inspecciones-17pts', false);

-- RLS policies for inspection photos bucket
CREATE POLICY "Authenticated users can upload inspection photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'inspecciones-17pts' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can view inspection photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'inspecciones-17pts' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete their own inspection photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'inspecciones-17pts' 
  AND auth.uid() IS NOT NULL
);

-- Table to persist inspection checklist state
CREATE TABLE public.inspecciones_17pts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mawb TEXT NOT NULL,
  operador_id UUID NOT NULL,
  estado TEXT NOT NULL DEFAULT 'en_progreso' CHECK (estado IN ('en_progreso', 'completada', 'certificada')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  progreso INTEGER NOT NULL DEFAULT 0,
  fotos_urls JSONB NOT NULL DEFAULT '{}'::jsonb,
  hash_certificacion TEXT,
  nivel_riesgo TEXT,
  score_riesgo INTEGER,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  certificada_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.inspecciones_17pts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own inspections"
ON public.inspecciones_17pts FOR SELECT
USING (auth.uid() = operador_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'auditor'::app_role));

CREATE POLICY "Users can create inspections"
ON public.inspecciones_17pts FOR INSERT
WITH CHECK (auth.uid() = operador_id);

CREATE POLICY "Users can update their own inspections"
ON public.inspecciones_17pts FOR UPDATE
USING (auth.uid() = operador_id);

-- No delete policy: inspections are immutable records

-- Trigger for updated_at
CREATE TRIGGER update_inspecciones_17pts_updated_at
BEFORE UPDATE ON public.inspecciones_17pts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();