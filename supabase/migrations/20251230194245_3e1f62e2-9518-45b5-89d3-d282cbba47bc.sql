-- Add new columns to places table for complete Google Places data
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS price_level integer;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS opening_hours jsonb;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS photos text[];
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS reviews jsonb;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS is_open_now boolean;

-- Add comment explaining price_level values
COMMENT ON COLUMN public.places.price_level IS 'Google price level: 0=free, 1=inexpensive, 2=moderate, 3=expensive, 4=very_expensive';