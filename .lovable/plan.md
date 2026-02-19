
# Fix: Google Map Not Rendering on Homepage

## Problem
When you tap the Map toggle on the homepage, the map container appears but is completely empty (no map tiles or pins visible). The Google Maps API key loads successfully, the scripts load, but the map has **zero rendered height**.

## Root Cause
The `BoardMapView` component's inner wrapper uses `className="flex-1 relative"`, which only works inside a CSS flexbox parent. However, the parent container in `HomePage.tsx` is a regular block element with a fixed height (`h-[calc(100vh-280px)]`). Since `flex-1` has no effect without a flex parent, the map container collapses to 0 height, making the Google Map invisible.

## Solution
Change the inner wrapper divs in `BoardMapView` to use `h-full w-full` instead of `flex-1`, so they inherit the explicit height from the parent container.

## Technical Changes

**File: `src/components/saved/BoardMapView.tsx`**

1. In the `MapLoader` component's success render (the `<div ref={ref} className="flex-1 relative">` wrapper around `MapContent`), change `flex-1` to `h-full w-full`
2. In the loading/error state divs that use `flex-1 flex items-center justify-center`, also change `flex-1` to `h-full w-full` so they display properly too
3. In the main `BoardMapView` component's loading/error states, apply the same fix

This ensures the map container properly fills the parent's defined height regardless of whether the parent is a flex container or not. The fix is purely CSS class changes -- no logic changes needed.
