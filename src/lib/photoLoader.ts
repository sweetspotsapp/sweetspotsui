/**
 * Photo loader — uses storage-first URLs directly, falling back to
 * edge function only when the <img> fires an error.
 * No HEAD requests — eliminates 1 HTTP call per photo.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET = 'place-photos';

/**
 * Build the public storage URL for a cached photo.
 */
export function getStoragePhotoUrl(photoName: string, maxWidth = 400, maxHeight = 400): string {
  const storagePath = `${photoName}/${maxWidth}x${maxHeight}`;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

/**
 * Build the edge function URL (fallback that fetches from Google + caches).
 */
export function getEdgeFunctionPhotoUrl(photoName: string, maxWidth = 400, maxHeight = 400): string {
  return `${SUPABASE_URL}/functions/v1/place-photo?photo_name=${encodeURIComponent(photoName)}&maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}`;
}

/**
 * Returns the storage URL directly — no network check.
 * Components should use onError on <img> to fall back to getEdgeFunctionPhotoUrl.
 */
export async function loadPhoto(photoName: string, maxWidth = 400, maxHeight = 400): Promise<string | null> {
  return getStoragePhotoUrl(photoName, maxWidth, maxHeight);
}
