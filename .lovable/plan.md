

# Make Profile Page Accessible via Its Own Route

## The Problem
You have a rich ProfilePage component (vibe DNA, personality traits, character match, search history, cover photos, avatar) but it's orphaned — no route points to it. Clicking your profile card in the slide menu dumps you into the Settings page, which feels disconnected.

## What Travel Apps Do
Apps like Roamy, Wanderlog, and AllTrails all have a dedicated **profile screen** separate from settings. It serves as your "travel identity" — showing your stats, activity, personality, and social presence. Settings is purely functional (email, password, toggles).

## The Plan

### 1. Add `/profile` route
Register a new route in `App.tsx` that renders the existing `ProfilePage` component. No new component needed — it already has everything: vibe DNA breakdown, personality traits, character match, search/places history, cover/avatar editing, interaction stats.

### 2. Update slide menu navigation
Change `handleViewProfile` in `ProfileSlideMenu.tsx` to navigate to `/profile` instead of `/settings`. The Settings menu item already has its own row — so both are accessible independently.

### 3. Add a "Settings" link on the Profile page
Add a small gear icon or "Settings" link at the top of ProfilePage so users can easily jump to Settings from their profile (instead of going back to the menu).

### Files to modify
- `src/App.tsx` — add `/profile` route pointing to `ProfilePage`
- `src/components/ProfileSlideMenu.tsx` — change `handleViewProfile` fallback from `/settings` to `/profile`
- `src/components/ProfilePage.tsx` — minor: ensure it works as a standalone route (it currently receives `onNavigateToSaved` prop which can be optional)

### No database changes needed.

