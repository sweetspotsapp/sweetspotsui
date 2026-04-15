

# Plan: Remove Unsplash Fallbacks, Always Re-fetch via Edge Function

## Summary
Remove all Unsplash placeholder image URLs across the app. When a photo isn't cached in storage, fall back to the `place-photo` edge function (which fetches from Google and caches). If even that fails, show a neutral "No photo" placeholder (gray `bg-muted` box).

## Changes

### 1. `PlaceCardCompact.tsx`
- Remove `getPlaceholderImage()` function
- On image error: try edge function if `photo_name` + `place_id` available, otherwise show `bg-muted` "No photo" div
- Remove Unsplash from `imageUrl` fallback logic

### 2. `PlaceImage.tsx`
- Remove `fallbackSrc` prop (no longer needed)
- Already correct — shows "No photo" on final failure

### 3. `TopPickCard.tsx`
- Remove `getPlaceholderImage()`, use edge function fallback same pattern as PlaceCardCompact

### 4. `CategorySeeAll.tsx`
- Remove `getPlaceholderImage()`, use storage URL + edge function fallback

### 5. `CategoryDetail.tsx`
- Remove Unsplash placeholder function, use storage/edge function pattern

### 6. `CategoryEditor.tsx` + `BoardEditor.tsx`
- Remove Unsplash placeholders for small thumbnails, use storage URL

### 7. `DiscoverPage.tsx`
- In `unifiedToMockPlace`: use `getStoragePhotoUrl(place.place_id)` instead of Unsplash
- In `getImageForPlace`: remove Unsplash fallback, return storage URL or edge function URL

### 8. `HomePage.tsx`
- Replace Unsplash fallback with edge function URL using `photo_name` + `place_id`

### 9. `PlaceDetails.tsx`
- Replace Unsplash fallbacks in related spots and hero image with storage/edge function URLs

### 10. `ImageCarousel.tsx`
- Replace `onError` Unsplash fallback with edge function call or "No photo" state

### 11. `mockPlaces.ts` (skip)
- These are demo/mock data — leave as-is since they're not real places

### 12. `tripHelpers.ts` (skip)
- These are curated destination cover images (Tokyo, Bali etc.), not place photos — leave as-is

## Fallback Strategy
```
1. Try: storage URL → {placeId}.jpg
2. On error: edge function URL → fetches from Google, caches, returns image
3. On error: show bg-muted "No photo" div
```

This ensures every photo miss triggers a cache-fill for future loads.

