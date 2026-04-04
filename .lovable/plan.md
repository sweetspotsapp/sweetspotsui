

# Plan: Adaptive Homepage + Discovery-First Hybrid

## What We're Building

The homepage becomes **adaptive** — it changes based on the user's activity level:

- **New users (0 saved spots)**: See trip templates + prominent import CTA banner
- **Active users (1-4 saved spots)**: See a mix of their recently saved spots + templates
- **Engaged users (5+ spots in one city)**: See a personal dashboard with a "Plan it" nudge banner (like the mockup), recently saved items, and import CTA at the top

The Discover tab stays separate for active vibe-based searching.

---

## Technical Approach

### Step 1: Add saved-spot awareness to HomePage

**File: `src/components/HomePage.tsx`**

- Import `useSavedPlaces` and `useBoards` hooks to fetch saved place counts
- Add a query to count saved places grouped by city/destination
- Determine user tier: `new` (0 saves), `active` (1-4), `engaged` (5+)

### Step 2: Build the adaptive sections

**New components to create:**

1. **`src/components/home/ImportBanner.tsx`** — Prominent top-level banner: "Save spots from TikTok, Instagram, or Google Maps." Styled card with platform icons, replaces the hidden-behind-FAB import flow for visibility. Always shown for new/active users, shown smaller for engaged users.

2. **`src/components/home/PlanItNudge.tsx`** — Contextual CTA card: "You have 12 spots saved in Tokyo — Ready to plan your trip?" with a "Plan it" button that navigates to Trip tab with that city pre-filled. Only shown for engaged users (5+ spots in one city).

3. **`src/components/home/RecentlySavedSection.tsx`** — Horizontal scrollable row of recently saved place cards (photo, name, rating). Shown for active and engaged users. Tapping a card opens PlaceDetails.

### Step 3: Compose the adaptive layout

**File: `src/components/HomePage.tsx`** — Restructure the render:

```text
┌─────────────────────────────┐
│  Avatar + Greeting + Menu   │  (always)
├─────────────────────────────┤
│  Import Banner (large)      │  (new/active users)
│  — or —                     │
│  Plan-It Nudge              │  (engaged users, 5+ in a city)
├─────────────────────────────┤
│  Recently Saved (horizontal)│  (active/engaged users)
├─────────────────────────────┤
│  Trip Templates (cards)     │  (always, fewer for engaged)
└─────────────────────────────┘
```

### Step 4: Wire up "Plan it" action

- When user taps "Plan it" on the nudge, navigate to Trip tab with the city pre-filled as the destination
- Pass the city name via `onNavigateToTrip` callback or session storage

### Step 5: Import banner links to existing ImportActionCard

- Tapping the import banner opens the existing `ImportActionCard` bottom sheet (already built)
- No new import logic needed — just a visual entry point

---

## Files Changed

| File | Change |
|---|---|
| `src/components/home/ImportBanner.tsx` | New — styled import CTA banner |
| `src/components/home/PlanItNudge.tsx` | New — contextual "Plan your trip" card |
| `src/components/home/RecentlySavedSection.tsx` | New — horizontal saved-places row |
| `src/components/HomePage.tsx` | Refactor to adaptive layout based on save count |
| `src/pages/Index.tsx` | Pass `onImportPress` to HomePage |

No database changes needed — all data already available via existing hooks.

