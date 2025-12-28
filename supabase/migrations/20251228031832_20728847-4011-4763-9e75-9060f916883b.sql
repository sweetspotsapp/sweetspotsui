-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  budget TEXT,
  vibe JSONB,
  dietary JSONB,
  mobility JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create searches table
CREATE TABLE public.searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  lat FLOAT8,
  lng FLOAT8,
  mode TEXT DEFAULT 'car',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create places table
CREATE TABLE public.places (
  place_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  lat FLOAT8,
  lng FLOAT8,
  categories TEXT[],
  rating FLOAT8,
  ratings_total INT,
  provider TEXT,
  raw JSONB,
  last_enriched_at TIMESTAMPTZ
);

-- Create place_interactions table
CREATE TABLE public.place_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  place_id TEXT REFERENCES public.places(place_id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  weight INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create saved_places table
CREATE TABLE public.saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  place_id TEXT REFERENCES public.places(place_id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, place_id)
);

-- Create indexes
CREATE INDEX idx_searches_user_id ON public.searches(user_id);
CREATE INDEX idx_places_lat_lng ON public.places(lat, lng);
CREATE INDEX idx_place_interactions_user_id ON public.place_interactions(user_id);
CREATE INDEX idx_place_interactions_place_id ON public.place_interactions(place_id);
CREATE INDEX idx_saved_places_user_id ON public.saved_places(user_id);
CREATE INDEX idx_saved_places_place_id ON public.saved_places(place_id);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS policies for searches
CREATE POLICY "Users can view their own searches" ON public.searches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own searches" ON public.searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for places (public read, authenticated write)
CREATE POLICY "Anyone can view places" ON public.places
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert places" ON public.places
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update places" ON public.places
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS policies for place_interactions
CREATE POLICY "Users can view their own interactions" ON public.place_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interactions" ON public.place_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for saved_places
CREATE POLICY "Users can view their own saved places" ON public.saved_places
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved places" ON public.saved_places
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved places" ON public.saved_places
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for auto-creating profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();