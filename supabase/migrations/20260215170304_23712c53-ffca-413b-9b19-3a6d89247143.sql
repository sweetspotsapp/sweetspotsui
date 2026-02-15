-- Add name column for itinerary naming
ALTER TABLE public.itineraries ADD COLUMN name text DEFAULT NULL;

-- Add accommodation/stay info
ALTER TABLE public.itineraries ADD COLUMN accommodation jsonb DEFAULT NULL;

-- Add flight details (optional)
ALTER TABLE public.itineraries ADD COLUMN flight_details jsonb DEFAULT NULL;