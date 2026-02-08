
-- Step 2: Migrate existing users from old roles to new roles
UPDATE public.user_roles SET role = 'asistente' WHERE role = 'operador';
UPDATE public.user_roles SET role = 'senior_broker' WHERE role = 'revisor';
UPDATE public.user_roles SET role = 'it_security' WHERE role = 'auditor';
UPDATE public.user_roles SET role = 'master_admin' WHERE role = 'admin';

-- Update handle_new_user to assign 'asistente' by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'asistente');
  RETURN NEW;
END;
$function$;

-- Update get_user_role to use new priority order
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'master_admin' THEN 1
      WHEN 'senior_broker' THEN 2
      WHEN 'it_security' THEN 3
      WHEN 'asistente' THEN 4
      WHEN 'agente_campo' THEN 5
    END
  LIMIT 1
$function$;

-- Update RLS policies on security_events to use new roles
DROP POLICY IF EXISTS "Admin and auditor can view security events" ON public.security_events;
CREATE POLICY "Admin and IT Security can view security events"
ON public.security_events
FOR SELECT
USING (
  has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'it_security'::app_role)
);

DROP POLICY IF EXISTS "Only admin can resolve security events" ON public.security_events;
CREATE POLICY "Only master_admin can resolve security events"
ON public.security_events
FOR UPDATE
USING (has_role(auth.uid(), 'master_admin'::app_role));

-- Update RLS policies on sys_audit_logs for new roles
DROP POLICY IF EXISTS "Admin and auditor can view audit logs" ON public.sys_audit_logs;
CREATE POLICY "Admin and IT Security can view audit logs"
ON public.sys_audit_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'master_admin'::app_role)
  OR has_role(auth.uid(), 'it_security'::app_role)
);
