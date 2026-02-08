
-- ============================================
-- Security Events Table — Advanced Forensic Logging
-- Tracks: login failures, document downloads, financial changes, DLP violations
-- Insert-only for forensic integrity
-- ============================================

CREATE TABLE public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL DEFAULT 'general',
  severity TEXT NOT NULL DEFAULT 'info',
  description TEXT,
  resource_type TEXT,
  resource_id TEXT,
  old_value TEXT,
  new_value TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  ip_address TEXT,
  session_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Insert-only: authenticated users can insert
CREATE POLICY "Authenticated users can insert security events"
ON public.security_events
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Only admin/auditor can view
CREATE POLICY "Admin and auditor can view security events"
ON public.security_events
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'auditor'::app_role)
);

-- Immutable: no updates allowed (except resolution by admin)
CREATE POLICY "Only admin can resolve security events"
ON public.security_events
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- No deletes ever
CREATE POLICY "Security events cannot be deleted"
ON public.security_events
FOR DELETE
USING (false);

-- Index for fast lookups
CREATE INDEX idx_security_events_type ON public.security_events(event_type);
CREATE INDEX idx_security_events_severity ON public.security_events(severity);
CREATE INDEX idx_security_events_created ON public.security_events(created_at DESC);
CREATE INDEX idx_security_events_user ON public.security_events(user_id);
