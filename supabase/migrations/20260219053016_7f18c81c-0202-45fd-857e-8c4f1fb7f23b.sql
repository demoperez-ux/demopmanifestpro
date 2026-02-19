
-- Add country_code to embarques_orion for multi-tenant regional reporting
ALTER TABLE public.embarques_orion
ADD COLUMN country_code text NOT NULL DEFAULT 'PA';

-- Add country_code to pre_facturas
ALTER TABLE public.pre_facturas
ADD COLUMN country_code text NOT NULL DEFAULT 'PA';

-- Add country_code to audit_logs
ALTER TABLE public.audit_logs
ADD COLUMN country_code text NOT NULL DEFAULT 'PA';

-- Add country_code to nexus_traffic_logs
ALTER TABLE public.nexus_traffic_logs
ADD COLUMN country_code text NOT NULL DEFAULT 'PA';

-- Create index for regional filtering
CREATE INDEX idx_embarques_country ON public.embarques_orion(country_code);
CREATE INDEX idx_prefacturas_country ON public.pre_facturas(country_code);

-- Add check constraint for valid country codes
ALTER TABLE public.embarques_orion
ADD CONSTRAINT chk_embarques_country_code CHECK (country_code IN ('PA', 'CR', 'GT'));

ALTER TABLE public.pre_facturas
ADD CONSTRAINT chk_prefacturas_country_code CHECK (country_code IN ('PA', 'CR', 'GT'));
