-- Create public bucket for permanently caching Google Places photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'place-photos',
  'place-photos',
  true,
  2097152, -- 2MB limit per photo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Allow anyone to read cached place photos
CREATE POLICY "Place photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'place-photos');
