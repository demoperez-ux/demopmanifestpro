
-- Nexus Traffic Logs - Immutable bridge audit trail
CREATE TABLE public.nexus_traffic_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('orion_to_zenith', 'zenith_to_orion')),
  transaction_id text NOT NULL,
  payload_hash text NOT NULL,
  verification_status text NOT NULL CHECK (verification_status IN ('verified', 'rejected', 'tampered')),
  source_ip text,
  source_domain text,
  endpoint text,
  payload_size integer,
  zod_score integer,
  zod_findings jsonb DEFAULT '[]'::jsonb,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nexus_traffic_logs ENABLE ROW LEVEL SECURITY;

-- Immutable: no updates, no deletes
CREATE POLICY "Nexus logs cannot be updated" ON public.nexus_traffic_logs FOR UPDATE USING (false);
CREATE POLICY "Nexus logs cannot be deleted" ON public.nexus_traffic_logs FOR DELETE USING (false);

-- Only it_security and master_admin can view
CREATE POLICY "IT Security can view nexus logs" ON public.nexus_traffic_logs
  FOR SELECT USING (
    has_role(auth.uid(), 'it_security'::app_role) OR 
    has_role(auth.uid(), 'master_admin'::app_role)
  );

-- System can insert (edge functions via service role)
CREATE POLICY "System can insert nexus logs" ON public.nexus_traffic_logs
  FOR INSERT WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_nexus_traffic_transaction ON public.nexus_traffic_logs(transaction_id);
CREATE INDEX idx_nexus_traffic_status ON public.nexus_traffic_logs(verification_status);
CREATE INDEX idx_nexus_traffic_created ON public.nexus_traffic_logs(created_at DESC);
