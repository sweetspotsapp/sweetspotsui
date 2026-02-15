
# Increase Minimum Search Results

## Problem
Sometimes searches return only ~10 places because:
1. The backend `unified-search` function uses `pageSize: 20` per Google API page, and for some queries only one page of results comes back
2. The frontend "More to Explore" section caps at 10 places, hiding additional results even when available
3. The default `limit` parameter is 30, which is fine but could be higher

## Changes

### 1. Backend: `supabase/functions/unified-search/index.ts`
- Increase default `limit` from `30` to `50` (line 636)
- This ensures we return more results when Google has them

### 2. Backend: Ensure all 3 pages are fetched
- The current code already fetches up to 3 pages (60 places max from Google) -- this is good
- No change needed here, the pagination logic is correct

### 3. Frontend: `src/components/HomePage.tsx`
- Increase "More to Explore" cap from `10` to `20` (line 762): change `.slice(0, 10)` to `.slice(0, 20)`
- Increase each category section cap from `5` to `8` places (lines 717, 730, 745)
- This allows more places to be visible across all sections

### 4. Frontend: Top Picks section
- Check `TopPicksSection` for any limits and increase if needed

## Summary of numeric changes

| Location | Current | New |
|---|---|---|
| `unified-search` default limit | 30 | 50 |
| Category section caps | 5 each | 8 each |
| "More to Explore" cap | 10 | 20 |

This means users will typically see 40-50+ places instead of sometimes just 10-15.
