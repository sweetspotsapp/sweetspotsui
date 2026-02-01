-- Add DELETE policy for searches table so users can delete their own search history
CREATE POLICY "Users can delete their own searches"
ON public.searches
FOR DELETE
USING (auth.uid() = user_id);