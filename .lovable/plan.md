

# Weather Forecast on Trip Date Picker

## The Idea

After the user selects a destination, the calendar date cells show tiny weather icons (sun, cloud, rain) so they can pick the best days. No extra panels, no clutter — just small icons inside each date cell.

```text
┌──────────────────────────────────────────┐
│  ←        April 2026           →         │
│  Su   Mo   Tu   We   Th   Fr   Sa       │
│                   1    2    3    4        │
│                  ☀️   ☀️   🌤   🌧        │
│   5    6    7    8    9   10   11        │
│  🌧   🌤   ☀️   ☀️   ☀️   🌤   🌤        │
│  12   13   14   15   16   17   18        │
│  ☀️   ☀️   🌧   🌧   🌤   ☀️   ☀️        │
│  ...                                     │
└──────────────────────────────────────────┘
         ↑ tiny icons below each number
```

Each cell: date number on top, a 12px weather icon below. That's it. No temperatures, no text — just a visual hint. If the user hovers/taps, a tiny tooltip shows "24°C, Partly cloudy".

## How It Works

1. User types destination → selects from autocomplete
2. On destination confirm, fetch 14-day forecast from OpenWeatherMap free tier (one API call)
3. Cache result in `query_cache` table (reuse the existing caching pattern)
4. Calendar renders tiny weather icons on each date cell that has forecast data
5. No forecast data = no icon shown (graceful degradation)

## Implementation

### 1. Edge Function: `trip-weather/index.ts` (NEW)
- Accepts `{ destination: string }`
- Geocodes destination to lat/lng (use Google geocoding we already have, or OpenWeatherMap's built-in city search)
- Calls OpenWeatherMap "One Call API 3.0" free tier — returns 8-day forecast (free tier limit)
- Alternatively use OpenWeatherMap "16 Day/Daily Forecast" on the free plan for longer range
- Returns: `{ daily: [{ date: "2026-04-09", icon: "clear", temp_high: 24, temp_low: 16, summary: "Clear sky" }, ...] }`
- Caches in `query_cache` for 6 hours (same pattern as recommend-for-you)
- Cost: **$0** — OpenWeatherMap free tier, 1 call per destination

### 2. Hook: `useWeatherForecast.ts` (NEW)
- `useWeatherForecast(destination: string | null)`
- Calls the edge function when destination is set and has length >= 3
- Returns `{ forecast: Map<string, { icon: string, tempHigh: number, summary: string }>, isLoading: boolean }`
- Only fetches once per destination (memoized)

### 3. Custom Calendar Day Cell in `CreateTripModal.tsx`
- Use react-day-picker's `components.Day` override to render custom cells
- Each cell: date number + tiny weather icon (12px) below
- Icon mapping: `clear` → ☀️, `clouds` → ☁️, `rain` → 🌧, `snow` → ❄️, `thunderstorm` → ⛈
- Use actual tiny SVG icons (not emoji) for crisp rendering at 12px
- Cells without forecast data render normally (no icon)
- On tap/hover: show tooltip with "24°C, Partly cloudy"

### 4. Visual Design
- Weather icons are 12px, muted opacity (0.6) so they don't compete with date numbers
- Selected date range still highlighted normally — weather icons stay visible
- Loading state: subtle shimmer on cells while fetching (or just nothing until loaded)
- Calendar cell height increases by ~8px to accommodate the icon

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/trip-weather/index.ts` | **NEW** — fetch + cache weather |
| `src/hooks/useWeatherForecast.ts` | **NEW** — call edge function |
| `src/components/trip/CreateTripModal.tsx` | Pass forecast to calendar, custom Day cell |
| `src/components/ui/calendar.tsx` | Add support for custom day content renderer |

### API Cost
- OpenWeatherMap free tier: 1,000 calls/day, 1 call per destination
- Cached for 6 hours — repeat visits don't re-fetch
- **Total: $0**

