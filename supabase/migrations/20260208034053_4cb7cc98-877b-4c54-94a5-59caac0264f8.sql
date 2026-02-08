
-- =============================================
-- SERVICE CONTRACTS — Tarifas Dinámicas por Cliente
-- Reglas: Precio por Guía Courier, Trámite Formal, Recargo Permiso
-- =============================================

CREATE TABLE public.service_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  corredor_id UUID NOT NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_ruc TEXT,
  
  -- Tarifas por tipo de servicio
  precio_guia_courier NUMERIC NOT NULL DEFAULT 5.00,
  precio_tramite_formal NUMERIC NOT NULL DEFAULT 60.00,
  recargo_permiso_especial NUMERIC NOT NULL DEFAULT 25.00,
  recargo_fumigacion NUMERIC NOT NULL DEFAULT 75.00,
  recargo_inspeccion NUMERIC NOT NULL DEFAULT 50.00,
  recargo_almacenaje_dia NUMERIC NOT NULL DEFAULT 15.00,
  
  -- Descuentos por volumen
  descuento_volumen_10 NUMERIC NOT NULL DEFAULT 5.0,
  descuento_volumen_50 NUMERIC NOT NULL DEFAULT 10.0,
  descuento_volumen_100 NUMERIC NOT NULL DEFAULT 15.0,
  
  -- Honorarios mínimos (Res. 222)
  honorario_minimo NUMERIC NOT NULL DEFAULT 60.00,
  porcentaje_cif NUMERIC NOT NULL DEFAULT 0.27,
  
  -- Metadata
  activo BOOLEAN NOT NULL DEFAULT true,
  vigente_desde TIMESTAMP WITH TIME ZONE DEFAULT now(),
  vigente_hasta TIMESTAMP WITH TIME ZONE,
  notas TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view contracts"
  ON public.service_contracts
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Revisors and admins can insert contracts"
  ON public.service_contracts
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'revisor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Revisors and admins can update contracts"
  ON public.service_contracts
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'revisor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Contracts cannot be deleted"
  ON public.service_contracts
  FOR DELETE
  USING (false);

-- Auto-update timestamps
CREATE TRIGGER update_service_contracts_updated_at
  BEFORE UPDATE ON public.service_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_service_contracts_corredor ON public.service_contracts(corredor_id);
CREATE INDEX idx_service_contracts_ruc ON public.service_contracts(cliente_ruc);
