
-- Step 1: Add new enum values to app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'master_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'senior_broker';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'it_security';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'asistente';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agente_campo';
