-- Allow users to delete their own place interactions (for vibe reset)
CREATE POLICY "Users can delete their own interactions"
ON public.place_interactions
FOR DELETE
USING (auth.uid() = user_id);