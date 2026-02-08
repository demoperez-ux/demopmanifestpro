
-- ============================================
-- Update ALL RLS policies to support new RBAC roles
-- Maps: admin→master_admin, revisor→senior_broker, auditor→it_security
-- Keeps backward compat by OR-ing old and new role names
-- ============================================

-- ─── user_roles ───────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Master admin can manage roles"
ON public.user_roles FOR ALL
USING (has_role(auth.uid(), 'master_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Master admin can view all roles"
ON public.user_roles FOR SELECT
USING (has_role(auth.uid(), 'master_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ─── alertas_peso ──────────────────────────────────
DROP POLICY IF EXISTS "Revisores pueden actualizar alertas" ON public.alertas_peso;
CREATE POLICY "Brokers and admins can update alertas"
ON public.alertas_peso FOR UPDATE
USING (
  has_role(auth.uid(), 'senior_broker'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

-- ─── clasificaciones_validadas ─────────────────────
DROP POLICY IF EXISTS "Revisores y admins pueden actualizar clasificaciones" ON public.clasificaciones_validadas;
CREATE POLICY "Brokers and admins can update clasificaciones"
ON public.clasificaciones_validadas FOR UPDATE
USING (
  has_role(auth.uid(), 'senior_broker'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Revisores y admins pueden insertar clasificaciones" ON public.clasificaciones_validadas;
CREATE POLICY "Brokers and admins can insert clasificaciones"
ON public.clasificaciones_validadas FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'senior_broker'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

-- ─── consignatarios_fiscales ───────────────────────
DROP POLICY IF EXISTS "Revisores y admins pueden actualizar consignatarios" ON public.consignatarios_fiscales;
CREATE POLICY "Brokers and admins can update consignatarios"
ON public.consignatarios_fiscales FOR UPDATE
USING (
  has_role(auth.uid(), 'senior_broker'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Revisores y admins pueden insertar consignatarios" ON public.consignatarios_fiscales;
CREATE POLICY "Brokers and admins can insert consignatarios"
ON public.consignatarios_fiscales FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'senior_broker'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Users can view own consignatarios or privileged roles" ON public.consignatarios_fiscales;
CREATE POLICY "Users can view consignatarios by role"
ON public.consignatarios_fiscales FOR SELECT
USING (
  (corredor_id = auth.uid())
  OR has_role(auth.uid(), 'master_admin'::app_role) OR has_role(auth.uid(), 'senior_broker'::app_role)
  OR has_role(auth.uid(), 'it_security'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'auditor'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role)
);

-- ─── mapeo_gs1_hts ─────────────────────────────────
DROP POLICY IF EXISTS "Revisores y admins pueden actualizar mapeos" ON public.mapeo_gs1_hts;
CREATE POLICY "Brokers and admins can update mapeos"
ON public.mapeo_gs1_hts FOR UPDATE
USING (
  has_role(auth.uid(), 'senior_broker'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Revisores y admins pueden insertar mapeos" ON public.mapeo_gs1_hts;
CREATE POLICY "Brokers and admins can insert mapeos"
ON public.mapeo_gs1_hts FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'senior_broker'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

-- ─── validaciones_kyc ──────────────────────────────
DROP POLICY IF EXISTS "Revisors and admins can insert KYC" ON public.validaciones_kyc;
CREATE POLICY "Brokers and admins can insert KYC"
ON public.validaciones_kyc FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'senior_broker'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Revisors and admins can update KYC" ON public.validaciones_kyc;
CREATE POLICY "Brokers and admins can update KYC"
ON public.validaciones_kyc FOR UPDATE
USING (
  has_role(auth.uid(), 'senior_broker'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

-- ─── proveedores_internacionales ───────────────────
DROP POLICY IF EXISTS "Owner or admin can update vendors" ON public.proveedores_internacionales;
CREATE POLICY "Owner or privileged can update vendors"
ON public.proveedores_internacionales FOR UPDATE
USING (
  (corredor_id = auth.uid())
  OR has_role(auth.uid(), 'master_admin'::app_role) OR has_role(auth.uid(), 'senior_broker'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'revisor'::app_role)
);

DROP POLICY IF EXISTS "Users view own vendors or privileged roles" ON public.proveedores_internacionales;
CREATE POLICY "Users view vendors by role"
ON public.proveedores_internacionales FOR SELECT
USING (
  (corredor_id = auth.uid())
  OR has_role(auth.uid(), 'master_admin'::app_role) OR has_role(auth.uid(), 'senior_broker'::app_role)
  OR has_role(auth.uid(), 'it_security'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'auditor'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role)
);

-- ─── embarques_orion ───────────────────────────────
DROP POLICY IF EXISTS "Operators can update their embarques" ON public.embarques_orion;
CREATE POLICY "Operators and privileged can update embarques"
ON public.embarques_orion FOR UPDATE
USING (
  (auth.uid() = operador_id)
  OR has_role(auth.uid(), 'master_admin'::app_role) OR has_role(auth.uid(), 'senior_broker'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'revisor'::app_role)
);

-- ─── pre_facturas ──────────────────────────────────
DROP POLICY IF EXISTS "Operators and revisors can update pre_facturas" ON public.pre_facturas;
CREATE POLICY "Operators and privileged can update pre_facturas"
ON public.pre_facturas FOR UPDATE
USING (
  (auth.uid() = operador_id)
  OR has_role(auth.uid(), 'master_admin'::app_role) OR has_role(auth.uid(), 'senior_broker'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'revisor'::app_role)
);

-- ─── onboarding_procesos ───────────────────────────
DROP POLICY IF EXISTS "Revisores and admins can insert onboarding processes" ON public.onboarding_procesos;
CREATE POLICY "Brokers and admins can insert onboarding processes"
ON public.onboarding_procesos FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'senior_broker'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Revisores and admins can update onboarding processes" ON public.onboarding_procesos;
CREATE POLICY "Brokers and admins can update onboarding processes"
ON public.onboarding_procesos FOR UPDATE
USING (
  has_role(auth.uid(), 'senior_broker'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

-- ─── onboarding_documentos ─────────────────────────
DROP POLICY IF EXISTS "Revisores and admins can update onboarding documents" ON public.onboarding_documentos;
CREATE POLICY "Brokers and admins can update onboarding documents"
ON public.onboarding_documentos FOR UPDATE
USING (
  has_role(auth.uid(), 'senior_broker'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

-- ─── audit_logs ────────────────────────────────────
DROP POLICY IF EXISTS "Users can view audit logs" ON public.audit_logs;
CREATE POLICY "Users can view audit logs by role"
ON public.audit_logs FOR SELECT
USING (
  (auth.uid() = user_id)
  OR has_role(auth.uid(), 'master_admin'::app_role) OR has_role(auth.uid(), 'it_security'::app_role)
  OR has_role(auth.uid(), 'auditor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

-- ─── inspecciones_17pts ────────────────────────────
DROP POLICY IF EXISTS "Users can view their own inspections" ON public.inspecciones_17pts;
CREATE POLICY "Users can view inspections by role"
ON public.inspecciones_17pts FOR SELECT
USING (
  (auth.uid() = operador_id)
  OR has_role(auth.uid(), 'master_admin'::app_role) OR has_role(auth.uid(), 'it_security'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'auditor'::app_role)
);

-- ─── onboarding_audit_trail ────────────────────────
DROP POLICY IF EXISTS "Auditors and admins can view audit trail" ON public.onboarding_audit_trail;
CREATE POLICY "Privileged roles can view audit trail"
ON public.onboarding_audit_trail FOR SELECT
USING (
  (auth.uid() = user_id)
  OR has_role(auth.uid(), 'master_admin'::app_role) OR has_role(auth.uid(), 'it_security'::app_role)
  OR has_role(auth.uid(), 'auditor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

-- ─── service_contracts ─────────────────────────────
DROP POLICY IF EXISTS "Revisors and admins can insert contracts" ON public.service_contracts;
CREATE POLICY "Brokers and admins can insert contracts"
ON public.service_contracts FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'senior_broker'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Revisors and admins can update contracts" ON public.service_contracts;
CREATE POLICY "Brokers and admins can update contracts"
ON public.service_contracts FOR UPDATE
USING (
  has_role(auth.uid(), 'senior_broker'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

-- ─── tarifarios_corredor ───────────────────────────
DROP POLICY IF EXISTS "Admin or corredor owner can insert tarifarios" ON public.tarifarios_corredor;
CREATE POLICY "Admin or corredor can insert tarifarios"
ON public.tarifarios_corredor FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'master_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
  OR (EXISTS (SELECT 1 FROM corredores_acreditados WHERE corredores_acreditados.id = tarifarios_corredor.corredor_id AND corredores_acreditados.user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Admin or corredor owner can update tarifarios" ON public.tarifarios_corredor;
CREATE POLICY "Admin or corredor can update tarifarios"
ON public.tarifarios_corredor FOR UPDATE
USING (
  has_role(auth.uid(), 'master_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
  OR (EXISTS (SELECT 1 FROM corredores_acreditados WHERE corredores_acreditados.id = tarifarios_corredor.corredor_id AND corredores_acreditados.user_id = auth.uid()))
);

-- ─── consultas_clasificatorias ─────────────────────
DROP POLICY IF EXISTS "Revisores y admins pueden actualizar consultas" ON public.consultas_clasificatorias;
CREATE POLICY "Brokers and admins can update consultas"
ON public.consultas_clasificatorias FOR UPDATE
USING (
  has_role(auth.uid(), 'senior_broker'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
  OR (auth.uid() = corredor_id)
);

DROP POLICY IF EXISTS "Revisores y admins pueden insertar consultas" ON public.consultas_clasificatorias;
CREATE POLICY "Brokers and admins can insert consultas"
ON public.consultas_clasificatorias FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'senior_broker'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
  OR (auth.uid() = corredor_id)
);

-- ─── acuerdos_comerciales ──────────────────────────
DROP POLICY IF EXISTS "Admins and revisores can insert trade agreements" ON public.acuerdos_comerciales;
CREATE POLICY "Brokers and admins can insert trade agreements"
ON public.acuerdos_comerciales FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'senior_broker'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Admins and revisores can update trade agreements" ON public.acuerdos_comerciales;
CREATE POLICY "Brokers and admins can update trade agreements"
ON public.acuerdos_comerciales FOR UPDATE
USING (
  has_role(auth.uid(), 'senior_broker'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'revisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

-- ─── corredores_acreditados ────────────────────────
DROP POLICY IF EXISTS "Admin can insert corredores" ON public.corredores_acreditados;
CREATE POLICY "Master admin can insert corredores"
ON public.corredores_acreditados FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'master_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
);

-- ─── regimenes_temporales ──────────────────────────
DROP POLICY IF EXISTS "Operators and admins can update regimenes" ON public.regimenes_temporales;
CREATE POLICY "Operators and privileged can update regimenes"
ON public.regimenes_temporales FOR UPDATE
USING (
  (auth.uid() = corredor_id)
  OR has_role(auth.uid(), 'master_admin'::app_role) OR has_role(auth.uid(), 'senior_broker'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'revisor'::app_role)
);
