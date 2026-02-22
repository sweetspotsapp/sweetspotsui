

## Fix: Replace deprecated `google.maps.Marker` with custom `OverlayViewF` markers

### Problem
Both `BoardMapView.tsx` and `TripMapView.tsx` use `Marker`/`MarkerF` from `@react-google-maps/api`, which internally uses the deprecated `google.maps.Marker` API.

### Solution
Replace all `Marker`/`MarkerF` usage with `OverlayViewF` from the same library, rendering custom styled div elements as markers. This avoids the deprecated API entirely without switching libraries.

### Technical Details

**File: `src/components/trip/TripMapView.tsx`**
- Replace `import { Marker, InfoWindow }` with `import { OverlayViewF, InfoWindowF }`
- Replace each `<Marker>` with an `<OverlayViewF>` containing a styled div that shows the numbered circle with category color
- Replace `<InfoWindow>` with `<InfoWindowF>` for consistency
- The custom marker div will be a colored circle with a number label, matching the current appearance

**File: `src/components/saved/BoardMapView.tsx`**
- Replace `import { MarkerF, InfoWindowF }` with `import { OverlayViewF, InfoWindowF }`
- Replace the user location `<MarkerF>` with an `<OverlayViewF>` containing a blue pulsing dot div
- Replace the place `<MarkerF>` markers with `<OverlayViewF>` containing rose-colored circle divs
- Keep `InfoWindowF` as-is (it doesn't use deprecated Marker)

**Custom marker styling:**
- Each marker will be a div with `border-radius: 50%`, appropriate background color, white border, and centered text
- The `OverlayViewF` uses `mapPaneName="floatPane"` and `position` prop to place markers
- A `getPixelPositionOffset` function centers the marker on its coordinate
- Click handlers move from `<MarkerF onClick>` to the inner div's `onClick`

