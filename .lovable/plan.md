

## Three Fixes

### 1. Logo Click -- Navigate to Home (Desktop)

**File:** `src/components/BottomNav.tsx`

- Wrap the logo `<img>` in a clickable element (button or anchor) that calls `onTabChange("home")`.
- Add `cursor-pointer` and a subtle hover state (`opacity-80` or `hover:scale-105` transition).
- No new dependencies needed.

### 2. Official Website Link on Place Detail

This requires both a database change and code updates since the `places` table has no `website` column.

**Step A -- Database migration:**
- Add a `website` column (nullable text) to the `places` table.

**Step B -- Edge function update (`supabase/functions/enrich-places/index.ts`):**
- Add `websiteUri` to the Google Places API `fieldMask` in both the direct placeId lookup path and the batch enrichment path.
- Store `googlePlace.websiteUri` into the new `website` field when upserting.
- Add `website` to the `EnrichedPlace` interface.

**Step C -- Frontend (`src/pages/PlaceDetails.tsx`):**
- Add `website` to the `PlaceDetails` interface.
- Read it from the fetched data.

**Step D -- New UI section (`src/components/place-detail/QuickInfoSection.tsx` or inline in PlaceDetails):**
- Below the address line, render a clickable link with an `ExternalLink` icon showing the website domain.
- Opens in a new tab (`target="_blank" rel="noopener noreferrer"`).
- Only shown when `website` is not null.

### 3. Reviews "See All" Bug Fix

**File:** `src/components/place-detail/ReviewsList.tsx`

The expand/collapse state logic is correct, but the container has `max-h-80 overflow-y-auto` which limits the visible area even when expanded. Fix:

- Remove the fixed `max-h-80` from the reviews container, or make it conditional -- only apply it when collapsed.
- When expanded, allow the container to grow to full height with a smooth `transition-all` animation.
- The button toggle logic (`expanded` state) already works; the issue is purely the constrained container height.

### Technical Details

| Area | Files Changed |
|------|--------------|
| Logo click | `src/components/BottomNav.tsx` |
| Website column | New SQL migration |
| Website enrichment | `supabase/functions/enrich-places/index.ts` |
| Website display | `src/pages/PlaceDetails.tsx`, `src/components/place-detail/QuickInfoSection.tsx` |
| Reviews expand | `src/components/place-detail/ReviewsList.tsx` |

