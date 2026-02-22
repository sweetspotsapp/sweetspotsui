
-- Rename table from itineraries to trips
ALTER TABLE public.itineraries RENAME TO trips;

-- Rename column itinerary_data to trip_data
ALTER TABLE public.trips RENAME COLUMN itinerary_data TO trip_data;

-- Rename RLS policies
ALTER POLICY "Users can view their own itineraries" ON public.trips RENAME TO "Users can view their own trips";
ALTER POLICY "Users can create their own itineraries" ON public.trips RENAME TO "Users can create their own trips";
ALTER POLICY "Users can update their own itineraries" ON public.trips RENAME TO "Users can update their own trips";
ALTER POLICY "Users can delete their own itineraries" ON public.trips RENAME TO "Users can delete their own trips";

-- Rename trigger
ALTER TRIGGER update_itineraries_updated_at ON public.trips RENAME TO update_trips_updated_at;
