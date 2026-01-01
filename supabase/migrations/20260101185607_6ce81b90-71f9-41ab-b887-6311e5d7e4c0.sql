-- Add filter_tags column to places table for AI-generated filter tags
ALTER TABLE public.places 
ADD COLUMN filter_tags text[] DEFAULT NULL;