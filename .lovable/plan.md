
# Itinerary Creation Module

## Overview

Add a new "Itinerary" tab to the bottom navigation (Home > Saved > Itinerary > Profile) that lets users generate AI-powered trip itineraries. Users can specify trip parameters, pull in spots from their saved boards, and get a drag-and-drop schedule with swap suggestions.

---

## Navigation Changes

Update `BottomNav` to include 4 tabs: Home, Saved, Itinerary, Profile. The Itinerary tab uses a `CalendarDays` icon from lucide-react. Update `Index.tsx` to render the new `ItineraryPage` component when the itinerary tab is active.

---

## Itinerary Page: Two-Phase UI

### Phase 1: Trip Setup Form

A scrollable form matching the app's existing mobile-first style (max-w-md, sticky header with "SweetSpots" branding):

| Field | Input Type | Details |
|-------|-----------|---------|
| Destination | Location picker (reuse `LocationPickerModal`) | City/area for the trip |
| Dates | Date range picker (start + end date) | Using the existing Calendar component in a popover |
| Duration | Auto-calculated from dates | Display as "X days" |
| Budget | Segmented buttons | $ / $$ / $$$ / $$$$ |
| Group Size | Number stepper | 1-20 with +/- buttons |
| Trip Vibe | Multi-select chips | "Foodie", "Adventure", "Chill", "Nightlife", "Culture", "Shopping", "Nature" |

Below the form, a "Add from Saved Spots" section:
- Shows user's boards as selectable cards (reusing `BoardCard` style)
- Tapping a board expands it to show individual spots with checkboxes
- Selected spots get a "Must Include" badge
- A "Generate Itinerary" button at the bottom

### Phase 2: Generated Itinerary View

A day-by-day timeline:
- Each day is a collapsible section with time slots (Morning, Afternoon, Evening)
- Each activity shows: place name, time, category icon, brief description
- Drag handle on each item for reordering (using CSS-based drag or simple up/down arrows for mobile)
- Each item has a "Swap" button that opens a bottom sheet with 3-4 alternative suggestions
- "Must Include" spots are pinned with a lock icon
- A floating "Regenerate" button to re-run with tweaks

---

## Database Changes

New `itineraries` table:

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid | Owner |
| destination | text | Trip location |
| start_date | date | Trip start |
| end_date | date | Trip end |
| budget | text | Budget level |
| group_size | integer | Number of travelers |
| vibes | text[] | Selected trip vibes |
| must_include_place_ids | text[] | Pinned spots from saved |
| board_ids | text[] | Source boards |
| itinerary_data | jsonb | The generated schedule |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

RLS policies: Users can only CRUD their own itineraries (user_id = auth.uid()).

---

## Edge Function: `generate-itinerary`

A new backend function that:
1. Receives trip params (destination, dates, budget, group_size, vibes, must_include_place_ids)
2. Fetches "must include" place details from the `places` table
3. Calls Lovable AI (google/gemini-3-flash-preview) with a structured prompt to generate a day-by-day itinerary
4. Uses tool calling to return structured JSON output with time slots, activities, and alternative suggestions
5. Returns the itinerary as structured JSON

The prompt instructs the AI to:
- Place "must include" spots at optimal times
- Fill remaining slots with contextually relevant activities
- Generate 3 alternatives per slot for swapping
- Respect budget and group size constraints

---

## Edge Function: `swap-itinerary-activity`

A lighter function that:
1. Takes the current activity context (time, day, location, vibes)
2. Generates 3-4 alternative suggestions using AI
3. Returns alternatives with name, description, category, and reasoning

---

## New Files

| File | Purpose |
|------|---------|
| `src/components/ItineraryPage.tsx` | Main page with form + results |
| `src/components/itinerary/TripSetupForm.tsx` | The setup form with all inputs |
| `src/components/itinerary/BoardPicker.tsx` | Select boards and spots to include |
| `src/components/itinerary/ItineraryView.tsx` | Day-by-day timeline display |
| `src/components/itinerary/DaySection.tsx` | Single day with time slots |
| `src/components/itinerary/ActivityCard.tsx` | Individual activity with swap/reorder |
| `src/components/itinerary/SwapSheet.tsx` | Bottom sheet showing alternatives |
| `src/hooks/useItinerary.tsx` | Hook for generating/saving/loading itineraries |
| `supabase/functions/generate-itinerary/index.ts` | AI itinerary generation |
| `supabase/functions/swap-itinerary-activity/index.ts` | AI swap suggestions |

---

## Modified Files

| File | Change |
|------|--------|
| `src/components/BottomNav.tsx` | Add "itinerary" tab with CalendarDays icon, update type union |
| `src/pages/Index.tsx` | Add "itinerary" to activeTab type, render ItineraryPage |
| `supabase/config.toml` | Add verify_jwt settings for new edge functions |

---

## Implementation Order

1. Database migration (itineraries table + RLS)
2. BottomNav + Index.tsx navigation updates
3. ItineraryPage shell with TripSetupForm
4. BoardPicker component (reuses existing board/saved data)
5. `generate-itinerary` edge function
6. ItineraryView + DaySection + ActivityCard
7. `swap-itinerary-activity` edge function + SwapSheet
8. useItinerary hook for save/load from database
