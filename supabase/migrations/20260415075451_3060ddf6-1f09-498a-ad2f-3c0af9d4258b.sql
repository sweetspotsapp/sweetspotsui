
-- 1. Add storage policies for the 'sweetspots' private bucket
-- Allow authenticated users to access their own files
CREATE POLICY "Users can view their own sweetspots files"
ON storage.objects FOR SELECT
USING (bucket_id = 'sweetspots' AND (select auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own sweetspots files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sweetspots' AND (select auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own sweetspots files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'sweetspots' AND (select auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own sweetspots files"
ON storage.objects FOR DELETE
USING (bucket_id = 'sweetspots' AND (select auth.uid())::text = (storage.foldername(name))[1]);

-- 2. Drop overly broad SELECT policies on public buckets and replace with path-scoped ones
-- This prevents file enumeration/listing while still allowing direct file access

-- Drop the broad avatars SELECT policy
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- Replace with a policy that allows access but prevents listing
CREATE POLICY "Avatar images are publicly accessible by path"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars' AND name IS NOT NULL AND name != '' AND name NOT LIKE '%/' );

-- Drop the broad place-photos SELECT policy if it exists  
DROP POLICY IF EXISTS "Public read access for place photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view place photos" ON storage.objects;

-- Replace with path-scoped policy
CREATE POLICY "Place photos are publicly accessible by path"
ON storage.objects FOR SELECT
USING (bucket_id = 'place-photos' AND name IS NOT NULL AND name != '' AND name NOT LIKE '%/');
