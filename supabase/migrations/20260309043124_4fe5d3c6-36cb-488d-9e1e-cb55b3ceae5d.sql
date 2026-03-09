ALTER TABLE public.shared_trips ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- Update existing shared_trips to 'accepted' so they don't show as pending
UPDATE public.shared_trips SET status = 'accepted' WHERE status = 'pending';