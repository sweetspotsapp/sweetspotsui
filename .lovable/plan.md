

# Fix Destination Picker to Support Suburbs & Districts

## The Problem
The current autocomplete has a fatal flaw: if your query matches anything in the hardcoded `WORLD_CITIES` list, it **short-circuits and never calls Google**. So typing "Mel" returns "Melbourne, Australia" from the local list and stops — you'll never see "Melton", "Melbourne CBD", or suburbs. Ironically, typing "Geelong" (not in the list) *does* hit Google and works fine.

## The Fix
**Always call Google Places Autocomplete, use local cities only as instant placeholders while loading.**

### Changes to `src/hooks/usePlaceAutocomplete.tsx`:
1. Show local matches **immediately** as temporary results (fast UX)
2. **Always** fire the Google API call after the 300ms debounce, regardless of local matches
3. When Google results arrive, **replace** local results with the richer Google results
4. Google Places Autocomplete already returns suburbs, districts, neighborhoods — no config change needed

### Optionally restrict to `(regions)` type filter
The `place-autocomplete` edge function can pass `types: "(regions)"` to Google, which returns cities, suburbs, districts, states — but excludes businesses/addresses. This keeps results relevant for trip destinations. Worth checking if this filter is already applied.

### Files to modify:
- `src/hooks/usePlaceAutocomplete.tsx` — remove the early return on local match, always call Google
- `supabase/functions/place-autocomplete/index.ts` — verify/add `types` filter for regions

### No database changes needed.

