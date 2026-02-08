
-- ============================================
-- CAUCA/RECAUCA Compliance Module
-- Regímenes Temporales + Validaciones KYC
-- ============================================

-- Table: regimenes_temporales
CREATE TABLE public.regimenes_temporales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  embarque_id UUID REFERENCES public.embarques_orion(id),
  corredor_id UUID NOT NULL,
  regimen_codigo INTEGER NOT NULL DEFAULT 20,
  regimen_nombre TEXT NOT NULL DEFAULT 'Admisión Temporal',
  referencia TEXT NOT NULL,
  consignatario TEXT NOT NULL,
  descripcion_mercancia TEXT,
  valor_cif NUMERIC DEFAULT 0,
  fecha_ingreso TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_vencimiento TIMESTAMP WITH TIME ZONE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo',
  alertas_enviadas JSONB DEFAULT '[]'::jsonb,
  reexportacion_referencia TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.regimenes_temporales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view regimenes"
  ON public.regimenes_temporales FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Operators can insert regimenes"
  ON public.regimenes_temporales FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Operators and admins can update regimenes"
  ON public.regimenes_temporales FOR UPDATE
  USING (
    auth.uid() = corredor_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'revisor'::app_role)
  );

CREATE POLICY "Regimenes cannot be deleted"
  ON public.regimenes_temporales FOR DELETE
  USING (false);

CREATE TRIGGER update_regimenes_temporales_updated_at
  BEFORE UPDATE ON public.regimenes_temporales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table: validaciones_kyc
CREATE TABLE public.validaciones_kyc (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consignatario_id UUID REFERENCES public.consignatarios_fiscales(id),
  corredor_id UUID NOT NULL,
  nombre_cliente TEXT NOT NULL,
  ruc_cedula TEXT NOT NULL,
  ruc_activo BOOLEAN DEFAULT false,
  aviso_operacion_verificado BOOLEAN DEFAULT false,
  aviso_operacion_numero TEXT,
  poder_representacion_verificado BOOLEAN DEFAULT false,
  documento_representante TEXT,
  documento_coincide_firma BOOLEAN DEFAULT false,
  validacion_zod_hash TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  notas TEXT,
  fecha_validacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.validaciones_kyc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view KYC validations"
  ON public.validaciones_kyc FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Revisors and admins can insert KYC"
  ON public.validaciones_kyc FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'revisor'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Revisors and admins can update KYC"
  ON public.validaciones_kyc FOR UPDATE
  USING (
    has_role(auth.uid(), 'revisor'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "KYC validations cannot be deleted"
  ON public.validaciones_kyc FOR DELETE
  USING (false);

CREATE TRIGGER update_validaciones_kyc_updated_at
  BEFORE UPDATE ON public.validaciones_kyc
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
