-- Add photo_name column to places table for storing Google photo references
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS photo_name text;