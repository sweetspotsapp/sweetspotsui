-- Add ai_reason column to store the AI-generated recommendation text
ALTER TABLE public.places 
ADD COLUMN IF NOT EXISTS ai_reason TEXT;