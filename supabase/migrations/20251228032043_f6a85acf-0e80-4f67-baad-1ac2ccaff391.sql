-- ============================================
-- CLASIFICACIONES VALIDADAS - MOTOR DE APRENDIZAJE
-- ============================================

-- Tabla para almacenar clasificaciones aprobadas por corredores
CREATE TABLE public.clasificaciones_validadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descripcion_original TEXT NOT NULL,
  descripcion_normalizada TEXT NOT NULL,
  hts_code VARCHAR(12) NOT NULL,
  descripcion_arancelaria TEXT,
  dai_percent NUMERIC(5,2) DEFAULT 0,
  isc_percent NUMERIC(5,2) DEFAULT 0,
  itbms_percent NUMERIC(5,2) DEFAULT 7,
  autoridad_anuente VARCHAR(50),
  corredor_id UUID NOT NULL,
  corredor_nombre VARCHAR(100),
  guia_origen VARCHAR(50),
  mawb_origen VARCHAR(20),
  confianza INTEGER DEFAULT 100,
  usos_exitosos INTEGER DEFAULT 1,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para búsqueda por descripción normalizada
CREATE INDEX idx_clasificaciones_descripcion ON public.clasificaciones_validadas 
  USING gin(to_tsvector('spanish', descripcion_normalizada));

-- Índice para HTS code
CREATE INDEX idx_clasificaciones_hts ON public.clasificaciones_validadas(hts_code);

-- Enable RLS
ALTER TABLE public.clasificaciones_validadas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios autenticados pueden ver clasificaciones"
ON public.clasificaciones_validadas
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Revisores y admins pueden insertar clasificaciones"
ON public.clasificaciones_validadas
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'revisor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Revisores y admins pueden actualizar clasificaciones"
ON public.clasificaciones_validadas
FOR UPDATE
USING (
  has_role(auth.uid(), 'revisor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Trigger para updated_at
CREATE TRIGGER update_clasificaciones_updated_at
BEFORE UPDATE ON public.clasificaciones_validadas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- AUDITORÍAS DE PESO - DISCREPANCIAS
-- ============================================

CREATE TABLE public.alertas_peso (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guia VARCHAR(50) NOT NULL,
  mawb VARCHAR(20),
  peso_bruto_declarado NUMERIC(10,2) NOT NULL,
  peso_neto_calculado NUMERIC(10,2) NOT NULL,
  diferencia NUMERIC(10,2) NOT NULL,
  porcentaje_diferencia NUMERIC(5,2) NOT NULL,
  severidad VARCHAR(10) NOT NULL CHECK (severidad IN ('alta', 'media', 'baja')),
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'revisado', 'resuelto', 'ignorado')),
  notas TEXT,
  revisado_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alertas_peso ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios autenticados pueden ver alertas"
ON public.alertas_peso
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Sistema puede insertar alertas"
ON public.alertas_peso
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Revisores pueden actualizar alertas"
ON public.alertas_peso
FOR UPDATE
USING (
  has_role(auth.uid(), 'revisor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);