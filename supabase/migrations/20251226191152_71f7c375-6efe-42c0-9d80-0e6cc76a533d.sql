-- Add explicit DELETE policy on profiles table to prevent all deletions
-- This makes the security posture explicit and prevents accidental data loss
CREATE POLICY "Profiles cannot be deleted"
  ON public.profiles FOR DELETE
  USING (false);