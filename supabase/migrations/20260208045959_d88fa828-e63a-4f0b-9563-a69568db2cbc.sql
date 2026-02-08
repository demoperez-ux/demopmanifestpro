
-- ============================================
-- Security & Identity Core - Entity Management
-- Clientes Importadores y Proveedores Internacionales
-- ============================================

-- 1. Tabla de Clientes Importadores
CREATE TABLE public.clientes_importadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  corredor_id UUID NOT NULL,
  razon_social TEXT NOT NULL,
  nombre_comercial TEXT,
  ruc TEXT NOT NULL,
  tipo_persona TEXT NOT NULL DEFAULT 'juridica' CHECK (tipo_persona IN ('natural', 'juridica')),
  representante_legal TEXT,
  cedula_representante TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  provincia TEXT,
  ciudad TEXT,
  pais TEXT DEFAULT 'PA',
  aviso_operacion TEXT,
  registro_publico TEXT,
  dv TEXT,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'suspendido', 'inactivo', 'bloqueado')),
  kyc_verificado BOOLEAN DEFAULT false,
  kyc_fecha TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla de Proveedores Internacionales (Vendors)
CREATE TABLE public.proveedores_internacionales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  corredor_id UUID NOT NULL,
  nombre_empresa TEXT NOT NULL,
  nombre_comercial TEXT,
  tax_id TEXT,
  pais_origen TEXT NOT NULL,
  direccion TEXT,
  ciudad TEXT,
  contacto_nombre TEXT,
  contacto_email TEXT,
  contacto_telefono TEXT,
  website TEXT,
  tipo_proveedor TEXT DEFAULT 'fabricante' CHECK (tipo_proveedor IN ('fabricante', 'distribuidor', 'trading_company', 'consolidador')),
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'suspendido', 'inactivo', 'sancionado')),
  sancion_lista TEXT,
  sancion_verificada_at TIMESTAMPTZ,
  incoterm_preferido TEXT DEFAULT 'FOB',
  moneda_preferida TEXT DEFAULT 'USD',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabla de Auditoría Forense del Sistema (sys_audit_logs)
CREATE TABLE public.sys_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_role app_role,
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'security')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable RLS on all new tables
ALTER TABLE public.clientes_importadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores_internacionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - Clientes Importadores
CREATE POLICY "Users view own clients or privileged roles"
  ON public.clientes_importadores FOR SELECT
  USING (
    corredor_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'auditor')
    OR has_role(auth.uid(), 'revisor')
  );

CREATE POLICY "Authenticated users can insert clients"
  ON public.clientes_importadores FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owner or admin can update clients"
  ON public.clientes_importadores FOR UPDATE
  USING (
    corredor_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'revisor')
  );

CREATE POLICY "Clients cannot be deleted"
  ON public.clientes_importadores FOR DELETE
  USING (false);

-- 6. RLS Policies - Proveedores Internacionales
CREATE POLICY "Users view own vendors or privileged roles"
  ON public.proveedores_internacionales FOR SELECT
  USING (
    corredor_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'auditor')
    OR has_role(auth.uid(), 'revisor')
  );

CREATE POLICY "Authenticated users can insert vendors"
  ON public.proveedores_internacionales FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owner or admin can update vendors"
  ON public.proveedores_internacionales FOR UPDATE
  USING (
    corredor_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'revisor')
  );

CREATE POLICY "Vendors cannot be deleted"
  ON public.proveedores_internacionales FOR DELETE
  USING (false);

-- 7. RLS Policies - System Audit Logs (INSERT-ONLY for integrity)
CREATE POLICY "Authenticated users can insert sys audit logs"
  ON public.sys_audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and auditors can view sys audit logs"
  ON public.sys_audit_logs FOR SELECT
  USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'auditor')
  );

CREATE POLICY "Sys audit logs cannot be updated"
  ON public.sys_audit_logs FOR UPDATE
  USING (false);

CREATE POLICY "Sys audit logs cannot be deleted"
  ON public.sys_audit_logs FOR DELETE
  USING (false);

-- 8. Auto-update timestamps
CREATE TRIGGER update_clientes_importadores_updated_at
  BEFORE UPDATE ON public.clientes_importadores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_proveedores_internacionales_updated_at
  BEFORE UPDATE ON public.proveedores_internacionales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Indexes for performance
CREATE INDEX idx_clientes_corredor ON public.clientes_importadores(corredor_id);
CREATE INDEX idx_clientes_ruc ON public.clientes_importadores(ruc);
CREATE INDEX idx_clientes_estado ON public.clientes_importadores(estado);
CREATE INDEX idx_proveedores_corredor ON public.proveedores_internacionales(corredor_id);
CREATE INDEX idx_proveedores_pais ON public.proveedores_internacionales(pais_origen);
CREATE INDEX idx_sys_audit_user ON public.sys_audit_logs(user_id);
CREATE INDEX idx_sys_audit_action ON public.sys_audit_logs(action_type);
CREATE INDEX idx_sys_audit_created ON public.sys_audit_logs(created_at DESC);
CREATE INDEX idx_sys_audit_severity ON public.sys_audit_logs(severity);
