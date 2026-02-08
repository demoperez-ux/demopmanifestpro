
-- Add billing_status to embarques_orion
ALTER TABLE public.embarques_orion 
ADD COLUMN billing_status text NOT NULL DEFAULT 'DRAFT';

-- Create pre_facturas table
CREATE TABLE public.pre_facturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  embarque_id uuid REFERENCES public.embarques_orion(id) NOT NULL,
  corredor_id uuid REFERENCES public.corredores_acreditados(id),
  operador_id uuid NOT NULL,
  
  -- Invoice data
  doc_num text NOT NULL,
  mawb text NOT NULL,
  consignatario text NOT NULL,
  ruc text,
  razon_social text,
  moneda text NOT NULL DEFAULT 'USD',
  
  -- Line items stored as JSONB
  lineas jsonb NOT NULL DEFAULT '[]'::jsonb,
  soportes_terceros jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Totals
  subtotal numeric NOT NULL DEFAULT 0,
  itbms numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  
  -- Billing workflow
  billing_status text NOT NULL DEFAULT 'DRAFT',
  
  -- Client approval
  aprobado_por_cliente boolean DEFAULT false,
  cliente_aprobacion_timestamp timestamptz,
  cliente_aprobacion_ip text,
  cliente_aprobacion_nombre text,
  token_aprobacion text UNIQUE,
  token_expiracion timestamptz,
  
  -- Rejection feedback
  rechazado boolean DEFAULT false,
  rechazo_motivo text,
  rechazo_timestamp timestamptz,
  rechazo_por text,
  
  -- SAP export
  sap_exportado boolean DEFAULT false,
  sap_exportado_at timestamptz,
  sap_exportado_por uuid,
  
  -- Zod seal
  zod_hash_integridad text,
  zod_validado boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pre_facturas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view pre_facturas"
ON public.pre_facturas FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Operators can create pre_facturas"
ON public.pre_facturas FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Operators and revisors can update pre_facturas"
ON public.pre_facturas FOR UPDATE
USING (
  auth.uid() = operador_id 
  OR has_role(auth.uid(), 'revisor'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Pre-facturas cannot be deleted (audit trail)
CREATE POLICY "Pre-facturas cannot be deleted"
ON public.pre_facturas FOR DELETE
USING (false);

-- Trigger for updated_at
CREATE TRIGGER update_pre_facturas_updated_at
BEFORE UPDATE ON public.pre_facturas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create client approval tokens table (public access for client portal)
CREATE TABLE public.aprobaciones_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pre_factura_id uuid REFERENCES public.pre_facturas(id) NOT NULL,
  token text UNIQUE NOT NULL,
  cliente_nombre text,
  cliente_email text,
  aprobado boolean,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz
);

ALTER TABLE public.aprobaciones_cliente ENABLE ROW LEVEL SECURITY;

-- Client approvals viewable by authenticated users
CREATE POLICY "Authenticated users can view approvals"
ON public.aprobaciones_cliente FOR SELECT
USING (auth.uid() IS NOT NULL);

-- System can insert approvals
CREATE POLICY "Authenticated users can insert approvals"
ON public.aprobaciones_cliente FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Approvals can be updated (for recording approval action)
CREATE POLICY "Authenticated users can update approvals"
ON public.aprobaciones_cliente FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Approvals cannot be deleted
CREATE POLICY "Approvals cannot be deleted"
ON public.aprobaciones_cliente FOR DELETE
USING (false);
