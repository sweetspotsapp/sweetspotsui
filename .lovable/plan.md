

## Always-Visible Filter Sidebar on Desktop

### Current State
- Filter button in the header opens a `SlideOutMenu` as an overlay (slide-in panel with backdrop)
- On desktop, the filter button sits inline with location picker and search bar
- `SlideOutMenu` uses fixed positioning with backdrop overlay

### Changes

#### 1. Update Layout to Sidebar + Content (Desktop)

**File: `src/components/HomePage.tsx`**

- Change the root container to use a two-column layout on desktop: `lg:flex lg:max-w-5xl` (widen slightly to accommodate sidebar + content)
- Remove the desktop inline filter button (lines 927-943) entirely
- Remove `lg:hidden` from the mobile filter button — keep it mobile-only as-is
- Wrap `SlideOutMenu` usage: on desktop, render the filter panel as a static sidebar (always visible, no overlay); on mobile, keep the existing slide-out behavior
- Move the `<main>` content into a `flex-1` column so it sits beside the sidebar

Layout on desktop:
```text
┌──────────────────────────────────────────────┐
│  [Location] [Search bar ............]        │  ← header (no filter button)
├────────────┬─────────────────────────────────┤
│  Filters   │  Content (cards, sections)      │
│  (always   │                                 │
│   visible) │                                 │
│            │                                 │
└────────────┴─────────────────────────────────┘
```

#### 2. Add "Always Open" Mode to SlideOutMenu

**File: `src/components/SlideOutMenu.tsx`**

- Add an `alwaysOpen` prop (boolean, default false)
- When `alwaysOpen` is true:
  - Don't render the backdrop overlay
  - Remove fixed positioning — use `relative` or `sticky` instead
  - Remove the close button (X) from the header
  - Remove the "Done" button from the footer
  - Use `sticky top-[header-height]` so it scrolls with content but stays visible
  - Keep all filter sections, distance slider, clear-all, and live count

#### 3. Dual Rendering in HomePage

**File: `src/components/HomePage.tsx`**

- Render two versions of `SlideOutMenu`:
  1. **Mobile** (`lg:hidden`): existing slide-out overlay, triggered by the hamburger filter button
  2. **Desktop** (`hidden lg:block`): always-visible sidebar with `alwaysOpen={true}`, rendered as the left column of a flex layout
- Remove desktop filter button from the search bar row
- Adjust content max-width: the sidebar takes ~250px, main content fills the rest

#### Files to Edit
- `src/components/SlideOutMenu.tsx` — add `alwaysOpen` prop with layout changes
- `src/components/HomePage.tsx` — two-column flex layout, dual filter rendering, remove desktop filter button

