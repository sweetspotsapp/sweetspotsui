

# Live Trip Mode — Revised Plan with Cancel & Real-Time Alerts

## What's New (vs. Previous Plan)

Two additions based on your feedback:

### 1. Cancel/Skip Activity
Users can **cancel** any upcoming activity during a live trip. Cancelled activities are visually struck through and excluded from progress calculations. They can also **undo** a cancel within the same session.

This is free — no API cost, purely UI + database state.

### 2. Real-Time Context Alerts

Here's the honest breakdown of what's possible, what it costs, and what's worth it:

| Feature | API Needed | Cost per Check | Worth It? |
|---------|-----------|---------------|-----------|
| **Place open/closed** | Google Places API | ~$0.017/call | **Yes** — we already store `opening_hours` and `is_open_now`. Just compare locally against device time. **Zero API cost.** |
| **Weather alerts** | OpenWeatherMap free tier | Free (1,000 calls/day) | **Yes** — one call per trip per day. Shows rain/storm warning on outdoor activities. |
| **Road/traffic conditions** | Google Routes API | ~$0.01/route | **Maybe** — we already call `compute-routes`. Could cache and refresh once per day. But adds complexity. |
| **Place permanently closed** | Google Places API | ~$0.017/call | **Yes** — check once when trip goes live. Flag any place that's permanently closed. |
| **Real-time crowd level** | Google Places API (Popular Times) | ~$0.025/call | **No** — expensive at scale, and we already store `popular_times` data. Just show the static chart. |

### Recommendation: Build These (Low/Zero Cost)

**Tier 1 — Free (use existing data)**
- Open/closed status from stored `opening_hours` — compare against current time client-side
- Popular times from stored `popular_times` — show "It's usually busy right now" badge
- Activity cancel/skip/undo

**Tier 2 — Cheap (one new API)**
- Weather widget: one OpenWeatherMap call per destination per day (free tier = 1,000/day)
- Show weather icon + temp on each day header
- Flag outdoor activities when rain/storm expected

**Tier 3 — Skip for Now**
- Real-time traffic between activities (complex, moderate cost)
- Live crowd data (expensive, marginal value over stored data)

---

## Updated Implementation Plan

### Phase 1: Database Migration
Add `checked_activities` jsonb column to `trips` table.
```sql
ALTER TABLE public.trips
ADD COLUMN checked_activities jsonb DEFAULT '{}';
```
Stores: `{ "1-0-0": "done", "1-1-0": "cancelled", "1-2-0": "skipped" }`

### Phase 2: Detection & State (`useLiveTrip.tsx`)
- New hook: detect if `today >= start_date && today <= end_date`
- Return `isLive`, `currentDayIndex`, `progress`, `nextActivity`
- `toggleActivity(key, status)` — cycle between done/cancelled/null
- Debounced persistence to DB

### Phase 3: Activity Card States (`ActivityCard.tsx`)
Add new props and visual states:
- **Now**: accent border, action row with `Done | Skip | Cancel | Navigate`
- **Done**: green checkmark overlay, collapsed
- **Cancelled**: red strikethrough, "Undo" button, greyed out
- **Skipped**: muted with skip icon

### Phase 4: Live Trip View (`TripView.tsx` + `DaySection.tsx`)
- Progress bar at top (excludes cancelled activities from total)
- Auto-scroll to current activity
- Completed section collapsed
- Cancelled activities shown at bottom of day with "Undo" option

### Phase 5: Open/Closed Alerts (Zero Cost)
- In `DaySection.tsx`, for today's activities, parse stored `opening_hours.weekday_text` against current time
- Show red "Closed now" or amber "Closes soon" badge on activity cards
- No API call needed — purely client-side time comparison

### Phase 6: Weather Widget (Free API)
- New edge function `trip-weather/index.ts`
- Calls OpenWeatherMap free API once per destination per day
- Cache result in `query_cache` table (expires after 6 hours)
- Show weather icon + temp in day header
- Flag outdoor activities (category = "outdoors"/"park"/"beach") with rain warning

### Phase 7: Home Page Live Banner
- Replace upcoming trip countdown with live banner when active
- Show progress, next activity, weather summary

### Files Changed

| File | Change |
|------|--------|
| DB migration | Add `checked_activities` column |
| `src/hooks/useLiveTrip.tsx` | **NEW** — detection + state management |
| `src/hooks/useTrip.tsx` | Add checked state persistence |
| `src/components/trip/ActivityCard.tsx` | Done/skip/cancel/navigate states |
| `src/components/trip/DaySection.tsx` | Live layout + open/closed badges |
| `src/components/trip/TripView.tsx` | Progress bar, auto-scroll, live header |
| `src/components/TripPage.tsx` | LIVE badge on trip list |
| `src/components/HomePage.tsx` | Live trip banner |
| `supabase/functions/trip-weather/index.ts` | **NEW** — weather data fetcher |

### Build Order
1. DB migration
2. `useLiveTrip.tsx` hook (detection + checked state)
3. `ActivityCard.tsx` (cancel/done/skip/navigate UI)
4. `DaySection.tsx` (live layout + open/closed badges)
5. `TripView.tsx` (progress bar + auto-scroll)
6. `TripPage.tsx` (LIVE badge)
7. `HomePage.tsx` (live banner)
8. `trip-weather` edge function + weather UI (can be Phase 2 release)

### Cost Summary
- Cancel/skip/done: **$0**
- Open/closed alerts: **$0** (existing data)
- Popular times badges: **$0** (existing data)
- Weather: **$0** (OpenWeatherMap free tier, ~1 call/trip/day)
- Total new API cost: **$0**

