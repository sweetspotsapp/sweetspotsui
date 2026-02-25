

## Current State

The two-column layout is already partially implemented. However, the **LoginReminderBanner** (line 992) and the **active filter chips** (lines 976-989) sit **outside** the `lg:flex` container, causing them to span the full width above the sidebar on desktop. This breaks the visual two-column structure - the banner stretches across both columns.

```text
Current:
┌─────────────────────────────────┐
│  [Login Banner - full width]    │  ← outside flex
├────────────┬────────────────────┤
│  Filters   │  Content           │  ← inside flex
└────────────┴────────────────────┘

Desired:
┌────────────┬────────────────────┐
│  Filters   │  [Login Banner]    │
│            │  [Filter Chips]    │
│            │  [Content cards]   │
└────────────┴────────────────────┘
```

## Changes

### File: `src/components/HomePage.tsx`

1. **Move LoginReminderBanner** (line 992) inside the `<main>` tag, at the top of the main content column, so it only spans the right column on desktop.

2. **Move active filter chips** (lines 976-989) inside the `<main>` tag as well, below the banner and above the content, so they appear in the right column only on desktop.

3. This means the `lg:flex` container starts immediately after the sticky header, with nothing between the header and the two-column layout.

### No changes needed to:
- `SlideOutMenu.tsx` - already has `alwaysOpen` mode working correctly
- Mobile layout - unchanged, banner and chips still appear naturally in the flow

