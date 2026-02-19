
-- Restrict INSERT to service role only (no anon inserts)
DROP POLICY "System can insert nexus logs" ON public.nexus_traffic_logs;
CREATE POLICY "Service role can insert nexus logs" ON public.nexus_traffic_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
