CREATE POLICY "Recipients can update invite status"
ON public.shared_trips
FOR UPDATE
TO authenticated
USING (auth.uid() = shared_with)
WITH CHECK (auth.uid() = shared_with);