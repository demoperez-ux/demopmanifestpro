
-- Tabla de Tarifarios vinculada a corredores_acreditados
CREATE TABLE public.tarifarios_corredor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  corredor_id UUID NOT NULL REFERENCES public.corredores_acreditados(id),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  
  -- Fórmula principal
  tipo_formula TEXT NOT NULL DEFAULT 'porcentaje_cif',  -- porcentaje_cif | tarifa_plana | mixto
  porcentaje_cif NUMERIC DEFAULT 0,                     -- % del CIF
  tarifa_plana NUMERIC DEFAULT 0,                       -- Tarifa fija por trámite
  tarifa_minima NUMERIC DEFAULT 60,                     -- Mínimo por Res. 222
  
  -- Recargos por servicios especiales
  recargo_fumigacion NUMERIC DEFAULT 0,
  recargo_inspeccion NUMERIC DEFAULT 0,
  recargo_almacenaje_dia NUMERIC DEFAULT 0,
  recargo_courier NUMERIC DEFAULT 0,
  recargo_perecederos NUMERIC DEFAULT 0,
  recargo_peligrosos NUMERIC DEFAULT 0,
  
  -- Handling
  handling_por_paquete NUMERIC DEFAULT 5,
  
  -- Estado
  activo BOOLEAN NOT NULL DEFAULT true,
  vigente_desde TIMESTAMP WITH TIME ZONE DEFAULT now(),
  vigente_hasta TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tarifarios_corredor ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Authenticated users can view tarifarios"
  ON public.tarifarios_corredor
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin or corredor owner can insert tarifarios"
  ON public.tarifarios_corredor
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (SELECT 1 FROM public.corredores_acreditados WHERE id = corredor_id AND user_id = auth.uid())
  );

CREATE POLICY "Admin or corredor owner can update tarifarios"
  ON public.tarifarios_corredor
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (SELECT 1 FROM public.corredores_acreditados WHERE id = corredor_id AND user_id = auth.uid())
  );

CREATE POLICY "Tarifarios cannot be deleted"
  ON public.tarifarios_corredor
  FOR DELETE
  USING (false);

-- Trigger updated_at
CREATE TRIGGER update_tarifarios_corredor_updated_at
  BEFORE UPDATE ON public.tarifarios_corredor
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX idx_tarifarios_corredor_id ON public.tarifarios_corredor(corredor_id);
CREATE INDEX idx_tarifarios_activo ON public.tarifarios_corredor(activo);
