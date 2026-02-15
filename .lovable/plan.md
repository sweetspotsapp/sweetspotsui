
# Add Map View Toggle to Homepage

## Overview
Add a "View on Map" toggle button to the homepage that lets users switch between the current list/card view and a full map view showing all discovered places as pins. This reuses the existing `BoardMapView` component already built for the Saved boards.

## What You'll See
- A small map icon button appears near the top of the homepage (below the search bar area)
- Tapping it switches the main content area to a full-screen map with pins for all search results
- Tapping a pin shows a mini info card with the place name, rating, and a "View Details" link
- A button to switch back to the list view
- Your location is shown as a blue dot on the map

## Technical Details

### 1. Add map view state to `HomePage.tsx`
- New `isMapView` boolean state
- A toggle button (Map/List icon) placed after the filter chips area in the sticky header

### 2. Reuse `BoardMapView` component
- The existing `BoardMapView` (in `src/components/saved/BoardMapView.tsx`) already handles:
  - Google Maps API key fetching and caching
  - Map rendering with markers, info windows, and bounds fitting
  - User location dot
- Convert `searchResults` (MockPlaceWithCoords) to the `RankedPlace` format expected by `BoardMapView`

### 3. Conditional rendering in main content
- When `isMapView` is true, render the map instead of the section rows
- The map container fills the available space (below header, above bottom nav)
- AI summary card and section rows are hidden in map mode

### 4. Files to modify
- **`src/components/HomePage.tsx`**: Add toggle state, map toggle button in header, conditional map rendering, and data conversion helper
- No new files needed -- reuses existing `BoardMapView`
