
-- Enable RLS on query_cache table
ALTER TABLE public.query_cache ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) can manage cache
CREATE POLICY "Service role can manage cache"
ON public.query_cache
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
