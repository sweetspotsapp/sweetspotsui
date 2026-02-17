-- Create cache table for edge function caching
CREATE TABLE IF NOT EXISTS public.query_cache (
  cache_key TEXT PRIMARY KEY,
  cache_value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_query_cache_expires_at ON public.query_cache(expires_at);

-- Function to clean up expired cache entries (optional, can be called periodically)
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.query_cache 
  WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to service role
GRANT ALL ON public.query_cache TO service_role;
GRANT EXECUTE ON FUNCTION clean_expired_cache() TO service_role;
