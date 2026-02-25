

## Add Top Padding to Filter Chips

The active filter chips container at line 1016 currently has `px-4 lg:px-8 pb-3` but no top padding, causing them to sit too close to the element above.

### Change

**File: `src/components/HomePage.tsx` (line 1016)**

Add `pt-4` to the chips container className:

- **Before:** `px-4 lg:px-8 pb-3 flex gap-2 overflow-x-auto scrollbar-hide`
- **After:** `px-4 lg:px-8 pt-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide`

