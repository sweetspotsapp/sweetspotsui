
-- 1. Add sweetspots_id to profiles with auto-generation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sweetspots_id text UNIQUE;

-- 2. Create function to generate unique SweetSpots IDs
CREATE OR REPLACE FUNCTION public.generate_sweetspots_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
BEGIN
  LOOP
    new_id := 'SS-';
    FOR i IN 1..6 LOOP
      new_id := new_id || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    -- Check uniqueness
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE sweetspots_id = new_id);
  END LOOP;
  RETURN new_id;
END;
$$;

-- 3. Backfill existing profiles with SweetSpots IDs
UPDATE public.profiles SET sweetspots_id = public.generate_sweetspots_id() WHERE sweetspots_id IS NULL;

-- 4. Auto-assign on new profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, sweetspots_id)
  VALUES (new.id, public.generate_sweetspots_id());
  RETURN new;
END;
$$;

-- 5. Create shared_trips table
CREATE TABLE public.shared_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  shared_by uuid NOT NULL,
  shared_with uuid NOT NULL,
  permission text NOT NULL DEFAULT 'view',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(trip_id, shared_with)
);

ALTER TABLE public.shared_trips ENABLE ROW LEVEL SECURITY;

-- Owner can manage shares they created
CREATE POLICY "Users can view shares they created or received"
  ON public.shared_trips FOR SELECT TO authenticated
  USING (auth.uid() = shared_by OR auth.uid() = shared_with);

CREATE POLICY "Users can create shares for their own trips"
  ON public.shared_trips FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = shared_by);

CREATE POLICY "Users can delete shares they created"
  ON public.shared_trips FOR DELETE TO authenticated
  USING (auth.uid() = shared_by);

-- Allow viewing shared trips (add read policy to trips table)
CREATE POLICY "Users can view trips shared with them"
  ON public.trips FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_trips
      WHERE shared_trips.trip_id = trips.id
      AND shared_trips.shared_with = auth.uid()
    )
  );

-- Allow profiles to be looked up by sweetspots_id or email (for sharing)
CREATE POLICY "Users can look up profiles by sweetspots_id"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);
