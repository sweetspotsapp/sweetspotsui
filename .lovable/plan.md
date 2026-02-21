

# Google Cloud API Enhancements - Implementation Plan

This plan covers four major improvements using Google Cloud APIs to enhance the app's functionality.

---

## Phase 1: Routes API for Accurate Travel Times

**What it does:** Replace the current Haversine formula (straight-line distance estimates) with real driving/walking directions from Google's Routes API, giving users accurate travel times in itineraries.

**Current state:** The `DistanceConnector` component uses a basic Haversine formula that calculates "as the crow flies" distance, then estimates travel time using rough speed assumptions (5km/h walking, 30km/h driving). The `rank_with_travel_time` and `unified-search` edge functions use Geoapify for travel time estimates.

**Changes:**

1. **New edge function: `supabase/functions/compute-routes/index.ts`**
   - Accepts an array of origin/destination coordinate pairs and a travel mode
   - Calls Google Routes API (`https://routes.googleapis.com/directions/v2:computeRoutes`)
   - Returns actual duration and distance for each pair
   - Uses the existing `GOOGLE_MAPS_API_KEY` secret (no new keys needed)
   - Add entry to `supabase/config.toml` with `verify_jwt = false`

2. **Update `src/components/itinerary/DistanceConnector.tsx`**
   - Add optional props for pre-computed `durationText` and `distanceText` from the Routes API
   - Fall back to Haversine calculation when Routes API data is not available

3. **Update `src/components/itinerary/DaySection.tsx`**
   - After itinerary loads, batch-call the `compute-routes` function for all consecutive activity pairs
   - Pass the real travel data down to `DistanceConnector`

4. **Update `src/hooks/useItinerary.tsx`**
   - Add a `useEffect` that fetches route data after itinerary generation completes
   - Store route data in state alongside itinerary data

---

## Phase 2: Google Geocoding API (Replace Geoapify)

**What it does:** Switch from Geoapify to Google Geocoding API for all geocoding, unifying the provider and improving accuracy.

**Current state:** The `unified-search` edge function uses Geoapify as the primary geocoder with Google as a fallback. The `GEOAPIFY_API_KEY` secret is configured.

**Changes:**

1. **Update `supabase/functions/unified-search/index.ts`**
   - Make Google Geocoding the primary geocoder instead of Geoapify
   - Keep Geoapify as a fallback (to not break anything if Google has issues)
   - Swap the order: try Google first, then Geoapify

2. **Update `supabase/functions/rank_with_travel_time/index.ts`**
   - Replace Geoapify travel time calculations with Google Routes API calls
   - This gives more accurate ETA and distance values for search results

---

## Phase 3: Place Popularity / Busy Times

**What it does:** Show users when places are busiest so they can plan visits at quieter times. Display a simple "busy now" indicator and popular times chart.

**Current state:** The `places` table has `opening_hours` and `is_open_now` fields but no popularity data. The `enrich-places` edge function fetches metadata from Google Places API.

**Changes:**

1. **Database migration**
   - Add `popular_times` (jsonb, nullable) column to the `places` table -- stores the weekly popularity data from Google

2. **Update `supabase/functions/enrich-places/index.ts`**
   - When enriching places, also request the `populationDensity` / `currentPopularity` fields from the Places API (New) if available
   - Store the data in the new `popular_times` column

3. **New component: `src/components/place-detail/PopularTimesChart.tsx`**
   - A small bar chart showing busy levels across hours of the day
   - Highlight the current hour
   - Uses simple CSS bars (no heavy chart library needed)

4. **Update `src/pages/PlaceDetails.tsx`**
   - Add the `PopularTimesChart` component to the place detail page
   - Show a "Busy now" / "Not too busy" / "Usually quiet" badge on place cards

5. **Update `src/components/PlaceCard.tsx` and `src/components/PlaceCardCompact.tsx`**
   - Add a small busyness indicator when popularity data is available

---

## Phase 4: Street View Previews

**What it does:** Add a Street View image to place detail pages so users can see the actual street-level view before visiting.

**Current state:** Place detail pages show photo carousels from the Google Places Photo API but no street-level imagery.

**Changes:**

1. **New edge function: `supabase/functions/street-view/index.ts`**
   - Accepts lat/lng or place_id
   - Calls Google Street View Static API (`https://maps.googleapis.com/maps/api/streetview`) to check if Street View is available (metadata endpoint)
   - If available, proxies the image back to the client (protects the API key)
   - Uses existing `GOOGLE_MAPS_API_KEY` secret
   - Add entry to `supabase/config.toml` with `verify_jwt = false`

2. **New component: `src/components/place-detail/StreetViewPreview.tsx`**
   - Displays a street-level preview image with a "Street View" label
   - Shows a loading skeleton while the image loads
   - Gracefully hides if no Street View is available for the location

3. **Update `src/pages/PlaceDetails.tsx`**
   - Add `StreetViewPreview` below the image carousel
   - Only render when lat/lng coordinates are available

---

## Implementation Order

I recommend implementing in this sequence to maximize impact while keeping each phase independent:

1. **Street View Previews** -- Quickest win, visual impact, standalone feature
2. **Routes API** -- High user value for itinerary planning
3. **Google Geocoding** -- Backend improvement, minimal UI changes
4. **Popular Times** -- Requires database migration and enrichment pipeline updates

---

## Technical Notes

### Two Google API Keys Architecture

The project uses two separate Google Maps API keys to isolate frontend and backend usage:

| Secret | Key type | Restriction | Used by |
|--------|----------|-------------|---------|
| `GOOGLE_MAPS_API_KEY` | Frontend key | HTTP referrer restricted to app domain | `get-maps-key` edge function (proxied to browser for Maps JS SDK + autocomplete) |
| `GOOGLE_MAPS_API_KEY_BE` | Backend key | No HTTP referrer restriction (IP or unrestricted) | All other edge functions: `unified-search`, `discover_candidates`, `enrich-places`, `generate-itinerary`, `import-from-link`, `place-photo`, `get_place_photo_url`, `resolve_photos_for_places`, `street-view`, `compute-routes`, `place-autocomplete` |

**Why two keys?** Server-side (Edge Function) requests have no browser `Referer` header. If the key has HTTP referrer restrictions, Google blocks the request with "Requests from referer <empty> are blocked". The backend key has no referrer restriction so it works server-side without workarounds.

### Required APIs enabled in Google Cloud Console

Both keys need:
- **Places API (New)** — text search, autocomplete, place details, photos
- **Geocoding API** — location name → lat/lng (backend key only)
- **Routes API** — travel times for itineraries (backend key only)
- **Street View Static API** — street view image proxy (backend key only)
- **Maps JavaScript API** — interactive map rendering (frontend key only)

### Setting secrets

```bash
supabase secrets set GOOGLE_MAPS_API_KEY=<frontend_key>
supabase secrets set GOOGLE_MAPS_API_KEY_BE=<backend_key>
```

- Each phase is independent and can be implemented and tested separately

