

## Put Filter, Location, and Search on One Line (Desktop)

### Current Layout
The desktop header has two rows:
1. **Row 1** (line 875): Filter button on left, empty spacer in middle, empty spacer on right
2. **Row 2** (line 925): Location picker pill + search input

### Change

**File: `src/components/HomePage.tsx`** (lines 874-972)

Merge everything into a single sticky header row on desktop (`lg:` breakpoint):

- **Mobile**: Keep the current two-row layout unchanged (filter top-left, logo+location center, search below)
- **Desktop**: Combine into one row: `[Filter button] [Location picker pill] [Search input (flex-1)]`
  - Move the filter button into the search bar container on desktop (hide it from the top row on `lg:`)
  - The search bar section already has the location picker — just add the filter button before it
  - Use `lg:flex lg:items-center lg:gap-3` to align all three inline

Concrete edits:

1. **Filter button** (lines 877-891): Add `lg:hidden` to hide it from the top nav row on desktop
2. **Search bar section** (lines 925-971): Add a duplicate filter button visible only on `lg:` screens (`hidden lg:flex`) before the location picker, inside the same flex row. This puts all three controls — filter, location, search — on one horizontal line on desktop.

