CREATE OR REPLACE FUNCTION public.get_place_save_counts(place_ids text[])
RETURNS TABLE(place_id text, save_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.place_id, COUNT(*)::bigint as save_count
  FROM public.saved_places sp
  WHERE sp.place_id = ANY(place_ids)
  GROUP BY sp.place_id;
$$;