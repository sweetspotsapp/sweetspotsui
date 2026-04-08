

# Redesigning the Home Page + Adding a Search Tab

## The Problem
Right now, the Home tab **is** the search page. Every time users open the app, they land on a search-first experience. But SweetSpots' core value is **trip planning** — the search is a tool, not the destination.

## Industry Research & Best Practices

After analyzing top travel apps (Wanderlog, TripIt, Google Travel, Airbnb) and 2025/2026 UX trends, here's what works:

**What the best travel apps do on their home screen:**
- **Lead with the user's trips** — upcoming itineraries front and center (like TripIt, Wanderlog)
- **Show progress, not a blank slate** — "You have 3 saved spots in Tokyo" keeps people invested
- **Contextual inspiration** — not generic search, but smart nudges like "Your Bali trip is in 5 days — here are 3 spots you haven't added yet"
- **One-tap trip creation** — reduce friction to start planning
- **Social proof and momentum** — "12 travelers planned Tokyo trips this week"

**What doesn't work:**
- Search-first homepages have high bounce rates — users with no intent leave
- Generic discovery without context feels like a different app every time
- Too many options on the home screen causes decision paralysis

## Recommended Home Page Structure

```text
┌─────────────────────────────────┐
│  Hi Sarah 👋                    │
│  Your next adventure awaits     │
├─────────────────────────────────┤
│                                 │
│  ┌─ UPCOMING TRIP ────────────┐ │
│  │ 🎒 Bali in 5 days         │ │
│  │ 3 days · 8 activities     │ │
│  │ [View Itinerary]           │ │
│  └────────────────────────────┘ │
│                                 │
│  ── Quick Actions ──────────── │
│  [🗺 Plan a Trip] [🔍 Discover] │
│                                 │
│  ── Recently Saved ──────────  │
│  [card] [card] [card] →         │
│                                 │
│  ── Trip Ideas ──────────────  │
│  "Weekend in Tokyo"             │
│  "3 Days in Melbourne"          │
│  "Bali Hidden Gems"             │
│                                 │
│  ── Your Stats ──────────────  │
│  12 spots saved · 2 trips      │
│                                 │
└─────────────────────────────────┘
```

### Sections (adaptive based on user state):

| User State | What They See |
|---|---|
| **New user** (0 saves, 0 trips) | Welcome message + quick actions + trip templates + testimonials |
| **Active user** (has saves, no trips) | Quick actions + recently saved + "Ready to plan?" nudge + templates |
| **Engaged user** (has trips) | Upcoming trip card + recently saved + trip templates + stats |

## Navigation Changes

Current: **Home** · Saved · Trip · Profile (4 tabs)
New: **Home** · **Search** · Saved · Trip · Profile (5 tabs)

- Home = trip-focused dashboard (described above)
- Search = current HomePage search/discover functionality (magnifying glass icon)
- Saved, Trip, Profile = unchanged

## Technical Plan

### Step 1: Create the Search tab page
- Extract all search logic from `HomePage.tsx` into a new `DiscoverPage.tsx`
- This includes: search bar, hints, filters, results grid/map, AI summary, recent searches, debounce, upgrade modal
- Essentially move ~90% of current HomePage into DiscoverPage

### Step 2: Rebuild HomePage as trip-focused dashboard
- Greeting header with user name
- Upcoming trip card (reuse `useUpcomingTrip` hook)
- Quick action buttons: "Plan a Trip" → opens Trip tab, "Discover Spots" → opens Search tab
- Recently saved horizontal scroll (fetch from saved_places)
- Trip template cards (curated destination starters)
- User stats row (saves count, trips count)
- Adaptive sections based on user engagement level

### Step 3: Update navigation
- Add Search tab (magnifying glass icon) to `BottomNav.tsx` as the second tab
- Add `DiscoverPage` to `Index.tsx` tab rendering
- Update desktop nav to include the new tab

### Step 4: Wire up cross-tab navigation
- "Discover Spots" quick action on Home → switches to Search tab
- "Plan a Trip" quick action → switches to Trip tab
- Trip template cards → open Trip tab with pre-filled destination

### Files to create:
- `src/components/DiscoverPage.tsx` — search/discover (moved from HomePage)

### Files to modify:
- `src/components/HomePage.tsx` — complete rewrite as trip dashboard
- `src/components/BottomNav.tsx` — add Search tab
- `src/pages/Index.tsx` — add DiscoverPage rendering + tab state

