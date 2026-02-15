
-- Create itineraries table
CREATE TABLE public.itineraries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget TEXT NOT NULL DEFAULT '$$',
  group_size INTEGER NOT NULL DEFAULT 1,
  vibes TEXT[] DEFAULT '{}',
  must_include_place_ids TEXT[] DEFAULT '{}',
  board_ids TEXT[] DEFAULT '{}',
  itinerary_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own itineraries"
ON public.itineraries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own itineraries"
ON public.itineraries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own itineraries"
ON public.itineraries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own itineraries"
ON public.itineraries FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_itineraries_updated_at
BEFORE UPDATE ON public.itineraries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
