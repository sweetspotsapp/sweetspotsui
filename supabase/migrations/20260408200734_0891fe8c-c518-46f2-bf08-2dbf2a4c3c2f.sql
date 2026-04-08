ALTER TABLE public.trips
ADD COLUMN checked_activities jsonb DEFAULT '{}';