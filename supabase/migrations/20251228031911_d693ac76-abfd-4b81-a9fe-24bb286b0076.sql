-- Drop existing places policies
DROP POLICY IF EXISTS "Anyone can view places" ON public.places;
DROP POLICY IF EXISTS "Authenticated users can insert places" ON public.places;
DROP POLICY IF EXISTS "Authenticated users can update places" ON public.places;

-- Create new policy: only authenticated users can read places
CREATE POLICY "Authenticated users can view places" ON public.places
  FOR SELECT USING (auth.role() = 'authenticated');

-- Note: Service role bypasses RLS automatically, so no policies needed for insert/update
-- Edge Functions using service role key will have full access