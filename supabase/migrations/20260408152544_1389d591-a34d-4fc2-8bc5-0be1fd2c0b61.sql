
CREATE TABLE public.trip_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  destination TEXT NOT NULL,
  duration INTEGER NOT NULL,
  vibes TEXT[] NOT NULL DEFAULT '{}',
  budget TEXT NOT NULL DEFAULT '$$',
  group_size INTEGER NOT NULL DEFAULT 2,
  tagline TEXT,
  cover_image TEXT,
  trip_data JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can read active templates
CREATE POLICY "Anyone can view active templates"
  ON public.trip_templates
  FOR SELECT
  USING (is_active = true);

-- Add timestamp trigger
CREATE TRIGGER update_trip_templates_updated_at
  BEFORE UPDATE ON public.trip_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
