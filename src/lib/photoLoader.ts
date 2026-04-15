/**
 * Photo loader — flat storage format: {placeId}.jpg
 * Storage-first URLs, falling back to edge function on <img> error.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET = 'place-photos';

/**
 * Build the public storage URL for a cached photo (flat: {placeId}.jpg).
 */
export function getStoragePhotoUrl(placeId: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${placeId}.jpg`;
}

/**
 * Build the edge function URL (fallback that fetches from Google + caches).
 */
export function getEdgeFunctionPhotoUrl(photoName: string, placeId: string, maxWidth = 400, maxHeight = 400): string {
  return `${SUPABASE_URL}/functions/v1/place-photo?photo_name=${encodeURIComponent(photoName)}&place_id=${encodeURIComponent(placeId)}&maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}`;
}

/**
 * Convenience: build a place photo URL from a photo_name + place_id.
 * Returns storage URL (flat) for direct access.
 * Returns null when placeId is falsy.
 */
export function getPlacePhotoUrl(placeId: string | null | undefined): string | null {
  if (!placeId) return null;
  return getStoragePhotoUrl(placeId);
}

/**
 * Convert a photos array into resolved photo URLs using place_id for storage.
 * Since we store one photo per place_id, this returns the single storage URL.
 */
export function resolvePhotoUrls(placeId: string | null | undefined): string[] {
  if (!placeId) return [];
  return [getStoragePhotoUrl(placeId)];
}
