
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can view places" ON public.places;

-- Create a new policy that allows anyone to view places
CREATE POLICY "Anyone can view places"
ON public.places
FOR SELECT
USING (true);
