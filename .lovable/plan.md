

# Plan: Flatten Photo Cache to Place ID Naming

## Summary
Change photo storage from deep nested paths (`places/ChIJ.../photos/AXCi.../400x400`) to flat files using place ID (`ChIJ....jpg`). Migrate all 646 existing files.

## What Changes

### 1. Edge Function: `place-photo/index.ts`
- Change storage path from `${photoName}/${maxWidth}x${maxHeight}` to `${placeId}.jpg` (flat)
- Accept a new `place_id` query param (required for cache key)
- Extract place ID from the photo_name if not provided separately
- On cache miss: fetch from Google, store as `{place_id}.jpg`, return image
- On cache hit: return stored file directly

### 2. Frontend: `src/lib/photoLoader.ts`
- `getStoragePhotoUrl(placeId)` → returns `/storage/v1/object/public/place-photos/{placeId}.jpg`
- `getEdgeFunctionPhotoUrl(photoName, placeId, maxWidth)` → passes both photo_name and place_id
- `getPlacePhotoUrl(photoName, placeId)` → convenience wrapper
- `resolvePhotoUrls` updated accordingly
- All functions now take `placeId` as a parameter

### 3. Frontend: `src/components/PlaceImage.tsx`
- Accept `placeId` prop alongside `photoName`
- Use flat storage URL for initial attempt, edge function as fallback

### 4. Frontend: `src/components/PlaceCard.tsx`
- Pass `place.place_id` to the updated photo helpers

### 5. All other photo consumers
- `DiscoverPage.tsx`, `PlaceDetails.tsx`, `SavedPage.tsx`, `BoardView.tsx`, `MapPage.tsx` — update `getPlaceImage` helpers to use `place_id` for storage URLs

### 6. Migration Edge Function: `migrate-photos`
- One-time edge function that:
  1. Lists all objects in `place-photos` bucket
  2. For each, extracts place_id from path (`places/{place_id}/photos/...`)
  3. Downloads the file and re-uploads as `{place_id}.jpg`
  4. Deletes the old nested file
- Run manually after deployment to rename all 646 files

## Technical Detail

**New storage path**: `{place_id}.jpg` (e.g., `ChIJ9xw8kWX5MIgRkHjuh9HkS5Q.jpg`)

**Place ID extraction** from current `photo_name`:
```
places/ChIJ9xw8kWX5MIgRkHjuh9HkS5Q/photos/AXCi.../400x400
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        This is the place_id
```

**Breaking change handling**: The edge function will check both old and new paths during a transition period, so no photos break while migration runs.

