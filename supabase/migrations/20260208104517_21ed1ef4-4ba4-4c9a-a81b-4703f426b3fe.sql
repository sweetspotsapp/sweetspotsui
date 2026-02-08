-- Add AI intelligence columns for unique place insights
ALTER TABLE public.places 
ADD COLUMN IF NOT EXISTS insider_tips text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS signature_items text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS unique_vibes text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS best_for text[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS local_secrets text DEFAULT NULL;