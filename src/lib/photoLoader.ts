/**
 * Staggered photo loader — prevents Google Places API 429 rate limits
 * by batching concurrent photo requests and using storage-first URLs.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET = 'place-photos';

// In-flight request dedup
const inflightPhotos = new Map<string, Promise<string | null>>();

// Concurrency limiter
let activeRequests = 0;
const MAX_CONCURRENT = 3;
const queue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    queue.push(() => {
      activeRequests++;
      resolve();
    });
  });
}

function releaseSlot() {
  activeRequests--;
  const next = queue.shift();
  if (next) next();
}

/**
 * Build the public storage URL for a cached photo.
 * If the photo is already cached in storage, this URL works directly.
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
 * Load a photo with storage-first strategy:
 * 1. Try public storage URL (instant, no edge function call)
 * 2. On 404, fall through to edge function (fetches from Google + caches)
 * 3. Deduplicates and rate-limits concurrent requests
 * 
 * Returns the working URL or null on failure.
 */
export async function loadPhoto(photoName: string, maxWidth = 400, maxHeight = 400): Promise<string | null> {
  const key = `${photoName}/${maxWidth}x${maxHeight}`;
  
  // Dedup in-flight requests
  if (inflightPhotos.has(key)) {
    return inflightPhotos.get(key)!;
  }

  const promise = (async () => {
    // Step 1: Try storage URL directly (no edge function overhead)
    const storageUrl = getStoragePhotoUrl(photoName, maxWidth, maxHeight);
    try {
      const headResp = await fetch(storageUrl, { method: 'HEAD' });
      if (headResp.ok) {
        return storageUrl;
      }
    } catch {
      // Storage miss, continue to edge function
    }

    // Step 2: Use edge function with concurrency limiting
    await acquireSlot();
    try {
      const edgeUrl = getEdgeFunctionPhotoUrl(photoName, maxWidth, maxHeight);
      const resp = await fetch(edgeUrl);
      if (resp.ok) {
        // The edge function caches it, so next time storage URL works
        return edgeUrl;
      }
      return null;
    } catch {
      return null;
    } finally {
      releaseSlot();
    }
  })();

  inflightPhotos.set(key, promise);
  
  // Clean up after resolution
  promise.finally(() => {
    setTimeout(() => inflightPhotos.delete(key), 5000);
  });

  return promise;
}
