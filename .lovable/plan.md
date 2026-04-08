

# Upgrade Map to Roamy-Quality Design

## What Roamy Uses
Roamy almost certainly uses **Mapbox GL JS** — it's the industry standard for travel apps that need beautiful, highly customizable maps. Mapbox lets you design completely custom map styles in **Mapbox Studio** (colors, fonts, terrain, labels, 3D buildings) — which is why their maps look so polished compared to default Google Maps.

## Our Options

| Approach | Effort | Result |
|----------|--------|--------|
| **A. Custom Google Maps styling** | Low | Good — muted tones, hidden POIs, brand colors. Limited by Google's style options. |
| **B. Switch to Mapbox GL JS** | Medium | Great — full visual control, smooth animations, 3D terrain, vector tiles. Free tier: 50k loads/month. |

**Recommendation: Option A first, Option B later.** We already have Google Maps wired up with API key infrastructure. We can make it look 80% as good as Roamy by applying a polished custom style JSON. Switching to Mapbox is a bigger lift (new dependency, new API key, rewrite map components) — worth doing later if maps become a core feature.

## Plan: Apply Premium Google Maps Styling

### 1. Create a custom map style
Add a comprehensive style JSON to `BoardMapView.tsx` (and `TripMapView.tsx`) that:
- Softens land/water colors to warm neutrals (cream, soft blue)
- Hides default POI icons and labels (we show our own markers)
- Mutes road colors to light gray
- Keeps transit/highway labels subtle
- Uses a palette that matches SweetSpots branding

### 2. Upgrade map markers
Replace the plain red circles with **branded pill markers** showing:
- Place name as a label (like Roamy does)
- Or a category icon inside a styled pin
- Selected state with an expanded card preview
- Smooth transitions on selection

### 3. Improve the MapPage
Replace the "Coming Soon" placeholder on the Map tab with an actual full-screen map showing all saved places across all boards — making it a global map view.

### Files to modify
- `src/components/saved/BoardMapView.tsx` — apply custom style JSON, upgrade markers
- `src/components/trip/TripMapView.tsx` — same style for consistency
- `src/components/MapPage.tsx` — replace placeholder with real map

### No database changes needed.

