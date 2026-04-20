-- Add publishing/attribution columns to trip_templates
ALTER TABLE public.trip_templates
  ADD COLUMN IF NOT EXISTS published_by uuid,
  ADD COLUMN IF NOT EXISTS source_trip_id uuid,
  ADD COLUMN IF NOT EXISTS author_username text,
  ADD COLUMN IF NOT EXISTS author_avatar_url text,
  ADD COLUMN IF NOT EXISTS published_at timestamp with time zone DEFAULT now();

-- Index for lookup by source trip (used to detect already-published)
CREATE INDEX IF NOT EXISTS idx_trip_templates_source_trip_id ON public.trip_templates(source_trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_templates_published_by ON public.trip_templates(published_by);

-- RLS: allow authenticated users to publish (insert) trips they own
-- The published_by column must equal auth.uid() and the source_trip_id must reference one of their trips.
CREATE POLICY "Users can publish their own trips as templates"
ON public.trip_templates
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = published_by
  AND source_trip_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = source_trip_id AND t.user_id = auth.uid()
  )
);

-- RLS: allow users to unpublish (delete) templates they published
CREATE POLICY "Users can unpublish their own templates"
ON public.trip_templates
FOR DELETE
TO authenticated
USING (auth.uid() = published_by);

-- RLS: allow users to update their own published templates
CREATE POLICY "Users can update their own published templates"
ON public.trip_templates
FOR UPDATE
TO authenticated
USING (auth.uid() = published_by)
WITH CHECK (auth.uid() = published_by);