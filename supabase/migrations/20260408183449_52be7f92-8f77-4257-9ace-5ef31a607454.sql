-- Fix 1: Replace overly permissive profile lookup policy
-- Drop the policy that lets any authenticated user read ALL profiles
DROP POLICY IF EXISTS "Users can look up profiles by sweetspots_id" ON public.profiles;

-- Create a restricted lookup policy scoped to sweetspots_id only
-- Users can only look up profiles where they know the sweetspots_id
CREATE POLICY "Authenticated users can look up profiles by sweetspots_id"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id  -- Users can always see their own profile
);

-- Create a security definer function for safe sweetspots_id lookups
CREATE OR REPLACE FUNCTION public.lookup_profile_by_sweetspots_id(lookup_id text)
RETURNS TABLE(id uuid, username text, avatar_url text, sweetspots_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.avatar_url, p.sweetspots_id
  FROM public.profiles p
  WHERE p.sweetspots_id = lookup_id;
$$;

-- Fix 2: Restrict shared_trips UPDATE to only the status column
-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Recipients can update invite status" ON public.shared_trips;

-- Create a trigger that prevents recipients from changing anything except status
CREATE OR REPLACE FUNCTION public.enforce_shared_trip_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only the recipient (shared_with) can update, and only the status field
  IF auth.uid() = NEW.shared_with THEN
    -- Prevent changing any field except status
    IF NEW.trip_id != OLD.trip_id 
       OR NEW.shared_by != OLD.shared_by 
       OR NEW.shared_with != OLD.shared_with 
       OR NEW.permission != OLD.permission THEN
      RAISE EXCEPTION 'Recipients can only update the status field';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_shared_trip_update_trigger
BEFORE UPDATE ON public.shared_trips
FOR EACH ROW
EXECUTE FUNCTION public.enforce_shared_trip_update();

-- Re-create the update policy with the trigger guard
CREATE POLICY "Recipients can update invite status"
ON public.shared_trips
FOR UPDATE
TO authenticated
USING (auth.uid() = shared_with)
WITH CHECK (auth.uid() = shared_with);

-- Fix 3: Add UPDATE policy for trip-documents bucket
CREATE POLICY "Users can update their own trip documents"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'trip-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);
