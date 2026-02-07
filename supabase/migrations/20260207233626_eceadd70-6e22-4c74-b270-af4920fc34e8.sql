
-- ============================================
-- Onboarding de Corredor de Aduana (SOP-ACA-001)
-- ============================================

-- Tabla principal de procesos de onboarding
CREATE TABLE public.onboarding_procesos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  corredor_nombre TEXT NOT NULL,
  corredor_cedula TEXT NOT NULL,
  corredor_email TEXT,
  corredor_telefono TEXT,
  empresa_nombre TEXT,
  empresa_ruc TEXT,
  
  -- Etapa actual (0-8)
  etapa_actual INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'en_progreso',
  
  -- Fianza
  monto_fianza NUMERIC,
  tipo_fianza TEXT,
  estado_fianza TEXT DEFAULT 'pendiente',
  
  -- Scores
  document_completeness_score NUMERIC DEFAULT 0,
  risk_score INTEGER DEFAULT 0,
  
  -- Control Points (JSON con estado de cada CP)
  control_points JSONB DEFAULT '{}',
  
  -- SLA tracking (timestamps por etapa)
  sla_timestamps JSONB DEFAULT '{}',
  
  -- Metadata
  notas TEXT,
  created_by UUID NOT NULL,
  assigned_to UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documentos del onboarding
CREATE TABLE public.onboarding_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proceso_id UUID NOT NULL REFERENCES public.onboarding_procesos(id) ON DELETE CASCADE,
  
  nombre_documento TEXT NOT NULL,
  tipo_documento TEXT NOT NULL,
  etapa INTEGER NOT NULL,
  
  -- AI Processing
  ai_confidence NUMERIC DEFAULT 0,
  ai_extracted_data JSONB DEFAULT '{}',
  ai_campos_criticos JSONB DEFAULT '{}',
  requiere_revision_manual BOOLEAN DEFAULT false,
  revisado_por UUID,
  revisado_at TIMESTAMPTZ,
  
  -- Validación Zod
  zod_validado BOOLEAN DEFAULT false,
  zod_sello_hash TEXT,
  
  -- Storage
  storage_path TEXT,
  file_size INTEGER,
  mime_type TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit trail inmutable para onboarding
CREATE TABLE public.onboarding_audit_trail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proceso_id UUID NOT NULL REFERENCES public.onboarding_procesos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_role TEXT,
  
  accion TEXT NOT NULL,
  etapa INTEGER,
  motivo TEXT,
  detalles JSONB DEFAULT '{}',
  
  -- Hash chain for immutability
  hash_content TEXT,
  hash_previous TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_procesos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_audit_trail ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onboarding_procesos
CREATE POLICY "Authenticated users can view onboarding processes"
  ON public.onboarding_procesos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Revisores and admins can insert onboarding processes"
  ON public.onboarding_procesos FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'revisor') OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Revisores and admins can update onboarding processes"
  ON public.onboarding_procesos FOR UPDATE
  USING (
    has_role(auth.uid(), 'revisor') OR has_role(auth.uid(), 'admin')
  );

-- RLS Policies for onboarding_documentos
CREATE POLICY "Authenticated users can view onboarding documents"
  ON public.onboarding_documentos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert onboarding documents"
  ON public.onboarding_documentos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Revisores and admins can update onboarding documents"
  ON public.onboarding_documentos FOR UPDATE
  USING (
    has_role(auth.uid(), 'revisor') OR has_role(auth.uid(), 'admin')
  );

-- RLS Policies for onboarding_audit_trail (IMMUTABLE)
CREATE POLICY "Authenticated users can insert audit trail"
  ON public.onboarding_audit_trail FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Auditors and admins can view audit trail"
  ON public.onboarding_audit_trail FOR SELECT
  USING (
    auth.uid() = user_id OR 
    has_role(auth.uid(), 'auditor') OR 
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Audit trail cannot be updated"
  ON public.onboarding_audit_trail FOR UPDATE
  USING (false);

CREATE POLICY "Audit trail cannot be deleted"
  ON public.onboarding_audit_trail FOR DELETE
  USING (false);

-- Trigger for updated_at
CREATE TRIGGER update_onboarding_procesos_updated_at
  BEFORE UPDATE ON public.onboarding_procesos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_onboarding_documentos_updated_at
  BEFORE UPDATE ON public.onboarding_documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for onboarding documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding-docs', 'onboarding-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload onboarding docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'onboarding-docs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view onboarding docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'onboarding-docs' AND auth.uid() IS NOT NULL);
