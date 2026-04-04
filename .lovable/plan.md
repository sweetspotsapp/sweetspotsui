

# Make Quick-Tip Cards Clickable + Add Trip Templates to Homepage

## Problem
1. "Search by vibe" and "Plan a trip" cards in `WelcomeCTA` are plain `<div>`s — not clickable.
2. Homepage is empty for new/guest users beyond the CTA. It should show inspiring trip templates.

## Plan

### 1. Make quick-tip cards clickable (WelcomeCTA.tsx)
- Convert "Search by vibe" `<div>` to a `<button>` that calls `onDiscoverClick` (navigates to Discover tab).
- Add a new `onTripClick` prop. Convert "Plan a trip" `<div>` to a `<button>` that calls `onTripClick` (navigates to Trip tab).
- Add hover/tap styles (e.g. `hover:border-primary/40 active:scale-[0.98]`).

### 2. Add trip template section to HomePage
- Below WelcomeCTA (for new users) or below existing trips (for returning users), add a **"Popular Itineraries"** section showing curated trip templates.
- Templates will be hardcoded data (no API cost) with destination name, cover image (gradient placeholder), duration, and spot count — e.g. "3 Days in Tokyo", "Weekend in Bali", "5 Days in Paris".
- Each template card is tappable → navigates to Trip tab with the destination pre-filled (via `sessionStorage` like the existing Plan-It Nudge pattern).
- Cards styled as horizontal-scroll carousel with photo backgrounds, similar to existing trip cards but smaller.

### 3. Wire up navigation (HomePage.tsx + Index.tsx)
- Pass `onNavigateToTrip` through to `WelcomeCTA` as `onTripClick`.
- Ensure `onNavigateToDiscover` and `onNavigateToTrip` are both wired from `Index.tsx`.

### Files to modify
- `src/components/WelcomeCTA.tsx` — add `onTripClick` prop, make cards clickable, add template data + carousel section
- `src/components/HomePage.tsx` — pass `onNavigateToTrip` to WelcomeCTA, show templates for all user states

