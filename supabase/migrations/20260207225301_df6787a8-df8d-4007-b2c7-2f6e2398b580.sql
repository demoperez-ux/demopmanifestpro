
-- Fix the permissive INSERT policy to require authentication
DROP POLICY "System can insert embarques" ON public.embarques_orion;

CREATE POLICY "Authenticated users can insert embarques"
ON public.embarques_orion
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
