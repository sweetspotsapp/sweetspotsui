-- First create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create boards table to store user-created boards/categories
CREATE TABLE public.boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'from-violet-500 to-purple-600',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create board_places junction table to link places to boards
CREATE TABLE public.board_places (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(board_id, place_id)
);

-- Enable Row Level Security
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_places ENABLE ROW LEVEL SECURITY;

-- RLS policies for boards
CREATE POLICY "Users can view their own boards" 
ON public.boards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own boards" 
ON public.boards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own boards" 
ON public.boards 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own boards" 
ON public.boards 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for board_places
CREATE POLICY "Users can view their own board places" 
ON public.board_places 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add places to their boards" 
ON public.board_places 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove places from their boards" 
ON public.board_places 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_boards_user_id ON public.boards(user_id);
CREATE INDEX idx_board_places_board_id ON public.board_places(board_id);
CREATE INDEX idx_board_places_user_id ON public.board_places(user_id);

-- Trigger for updating timestamps
CREATE TRIGGER update_boards_updated_at
BEFORE UPDATE ON public.boards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();