
# Map View for Saved Places Board

## Overview
Add a "View on Map" toggle to the Board View screen that displays all saved places as markers on an interactive Google Map. Users can see the geographic distribution of their saved spots and tap markers to view place details.

## What We Have Already
- **Google Maps API Key**: Already configured in the backend secrets
- **`@react-google-maps/api`**: Already installed (v2.20.8)
- **`get-maps-key` edge function**: Returns the API key securely to the frontend
- **Place coordinates**: All places have `lat` and `lng` stored in the database

## Implementation Steps

### 1. Create a Map View Component
Create `src/components/saved/BoardMapView.tsx` that:
- Uses `@react-google-maps/api` with `useJsApiLoader` hook
- Fetches the API key from `get-maps-key` edge function
- Renders a Google Map with markers for each saved place
- Shows place name and rating in an info window when a marker is tapped
- Auto-fits the map bounds to show all markers

### 2. Update BoardView Component
Modify `src/components/saved/BoardView.tsx` to:
- Add a map/list toggle button in the header or filter bar
- Conditionally render either the grid view or the new map view
- Pass the sorted/filtered places to the map component

### 3. Map Features
- **Markers**: Custom markers showing place photos or category icons
- **Info Windows**: Popup showing place name, rating, and "View Details" button
- **Clustering**: Group nearby markers when zoomed out (optional enhancement)
- **User Location**: Show user's current location if available

## Technical Details

### API Requirements
| API | Status | Purpose |
|-----|--------|---------|
| Google Maps JavaScript API | Already configured | Display interactive map |
| `get-maps-key` edge function | Already exists | Securely provide API key |

### Data Flow
```text
BoardView
    |
    +--> [Map Toggle Button]
    |
    +--> BoardMapView
              |
              +--> Fetch API key from get-maps-key
              |
              +--> GoogleMap component
                        |
                        +--> Markers for each place
                        |
                        +--> InfoWindow on click
```

### Component Props (BoardMapView)
```typescript
interface BoardMapViewProps {
  places: RankedPlace[];
  userLocation: { lat: number; lng: number } | null;
  onPlaceClick: (place: RankedPlace) => void;
}
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/saved/BoardMapView.tsx` | Create | New map component |
| `src/components/saved/BoardView.tsx` | Modify | Add toggle and map view state |

## UI Design
- Add a small "Map" icon button next to the existing filter button
- When map is active, show the map fullscreen with a floating "List" button to return
- Markers should be visually distinct (primary color with white border)
- Info windows should match the app's design language
