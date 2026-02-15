
# Replace Vibe & Other Filters with Practical Filters

## What Changes

Replace the current abstract "Occasion", "Vibe", and "Other" filter sections with more practical, actionable categories that help users find exactly what they need.

## New Filter Sections

**Dietary** (replacing Occasion)
- Halal
- Vegetarian / Vegan
- Gluten-Free

**Amenities** (replacing Vibe)
- Free WiFi
- Outdoor Seating
- Parking Available
- Wheelchair Accessible

**Good For** (replacing Other)
- Dog-Friendly
- Kid-Friendly
- Late Night
- Large Groups

Price and Distance filters stay as they are.

## Technical Details

### Files to update:

1. **`src/components/SlideOutMenu.tsx`** -- Update `FILTER_SECTIONS` array with the new filter IDs and labels.

2. **`src/hooks/useClientFilters.tsx`** -- Update `FILTER_TAG_MAP` to map new filter IDs to their corresponding `filter_tags` stored in the database (e.g., `halal` -> `'halal'`, `wifi` -> `'free-wifi'`, `dog_friendly` -> `'pet-friendly'`).

3. **`supabase/functions/unified-search/index.ts`** -- Add new valid tags to `VALID_FILTER_TAGS` array (e.g., `'halal'`, `'vegetarian-vegan'`, `'gluten-free'`, `'free-wifi'`, `'parking'`, `'wheelchair-accessible'`, `'large-groups'`).

4. **`supabase/functions/backfill-filter-tags/index.ts`** -- Add the same new valid tags so the AI tagging engine can assign them to existing places.

5. **`src/components/TravelPersonalityFilterModal.tsx`** -- Update `VIBE_OPTIONS` to align with the new practical categories (e.g., replace "Chill & relaxation" with "Halal", "Free WiFi", "Dog-Friendly", etc.).

### How filtering works (no change to logic):
- The `useClientFilters` hook matches selected filter IDs against `filter_tags` stored on each place in the database.
- The AI tagging engine in `unified-search` and `backfill-filter-tags` will start generating the new tags for places going forward.
- Existing untagged places will pass through filters (lenient matching already in place).
