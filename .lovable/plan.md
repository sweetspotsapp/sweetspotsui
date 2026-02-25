

## Desktop Layout Improvements for HomePage and CategorySeeAll

### Current State
- **HomePage** uses `max-w-[420px] lg:max-w-7xl` — mobile is capped at 420px, desktop goes full 7xl
- **TripPage** uses `max-w-md mx-auto lg:max-w-4xl` — consistent centered layout
- Location picker and mood/search bar are stacked vertically on all screens
- **CategorySeeAll** uses a 2-column Pinterest grid with no desktop adaptation

### Changes

#### 1. Combine Location + Search on Same Line (Desktop)

**File: `src/components/HomePage.tsx`** (lines ~910-970)

On desktop (`lg:` breakpoint), merge the location picker button and the mood search bar into a single horizontal row. The location picker sits on the left, and the search input fills the remaining space — all within one line.

- Move the desktop location button (currently in the header center area, lines 911-923) into the search bar section
- Wrap both in a `lg:flex lg:items-center lg:gap-3` container
- Keep mobile layout unchanged (location in header, search below)

#### 2. Adjust Content Area Width to Match Trip Page

**File: `src/components/HomePage.tsx`** (line 872)

Change the root container from `max-w-[420px] lg:max-w-7xl` to `max-w-[420px] lg:max-w-4xl` to match TripPage's `lg:max-w-4xl`. This creates a consistent, centered content width across pages.

Also update the desktop grid in `SectionRow` (line 176) from `grid-cols-4 xl:grid-cols-5` to `grid-cols-3 lg:grid-cols-4` to fit the narrower container, and adjust padding references (`lg:px-8`) accordingly.

#### 3. Desktop-Friendly CategorySeeAll Page

**File: `src/pages/CategorySeeAll.tsx`**

- Add `max-w-4xl mx-auto` wrapper to match the HomePage/TripPage width
- Change grid from `columns-2` to `columns-2 md:columns-3 lg:columns-4` for responsive column count
- Show place info below image on all screen sizes (remove `md:hidden` restriction)
- Always show the gradient overlay and info on desktop (not just on hover)
- Add proper padding for desktop: `p-3 lg:p-6`

### Technical Details

```text
Current layout widths:
  HomePage:  max-w-[420px] → lg:max-w-7xl  (very wide on desktop)
  TripPage:  max-w-md      → lg:max-w-4xl  (centered, comfortable)
  SeeAll:    no max-width                   (edge-to-edge)

After changes:
  HomePage:  max-w-[420px] → lg:max-w-4xl  (matches TripPage)
  TripPage:  max-w-md      → lg:max-w-4xl  (unchanged)
  SeeAll:    max-w-4xl mx-auto              (matches both)
```

Files to edit:
- `src/components/HomePage.tsx` — inline location+search on desktop, narrow content width
- `src/pages/CategorySeeAll.tsx` — responsive grid, max-width, always-visible info

