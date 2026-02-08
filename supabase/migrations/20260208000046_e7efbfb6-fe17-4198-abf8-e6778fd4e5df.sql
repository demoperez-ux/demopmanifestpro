
-- Tabla de Corredores Acreditados
CREATE TABLE public.corredores_acreditados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nombre_completo TEXT NOT NULL,
  cedula TEXT NOT NULL,
  licencia_ana TEXT NOT NULL UNIQUE,
  licencia_vencimiento TIMESTAMP WITH TIME ZONE NOT NULL,
  tipo_fianza TEXT NOT NULL DEFAULT 'bancaria',
  monto_fianza NUMERIC NOT NULL DEFAULT 0,
  estado_fianza TEXT NOT NULL DEFAULT 'vigente',
  fianza_vencimiento TIMESTAMP WITH TIME ZONE,
  firma_digital_habilitada BOOLEAN NOT NULL DEFAULT false,
  firma_clave_publica TEXT,
  telefono TEXT,
  email TEXT,
  empresa TEXT,
  estado TEXT NOT NULL DEFAULT 'activo',
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.corredores_acreditados ENABLE ROW LEVEL SECURITY;

-- Solo autenticados pueden ver corredores
CREATE POLICY "Authenticated users can view corredores"
  ON public.corredores_acreditados
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo admin o el propio corredor pueden insertar
CREATE POLICY "Admin can insert corredores"
  ON public.corredores_acreditados
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Solo admin o el propio corredor pueden editar
CREATE POLICY "Admin or self can update corredor"
  ON public.corredores_acreditados
  FOR UPDATE
  USING (
    auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)
  );

-- No se pueden eliminar
CREATE POLICY "Corredores cannot be deleted"
  ON public.corredores_acreditados
  FOR DELETE
  USING (false);

-- Trigger de updated_at
CREATE TRIGGER update_corredores_acreditados_updated_at
  BEFORE UPDATE ON public.corredores_acreditados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX idx_corredores_user_id ON public.corredores_acreditados(user_id);
CREATE INDEX idx_corredores_licencia ON public.corredores_acreditados(licencia_ana);
CREATE INDEX idx_corredores_vencimiento ON public.corredores_acreditados(licencia_vencimiento);
