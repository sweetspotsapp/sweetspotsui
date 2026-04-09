ALTER TABLE public.trips ADD COLUMN status text NOT NULL DEFAULT 'active';
CREATE INDEX idx_trips_status ON public.trips (status);