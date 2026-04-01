

## Change

**File: `src/components/SlideOutMenu.tsx` (line 90)**

Remove `rounded-lg` and change `max-h-[calc(100vh-108px)]` to `h-[calc(100vh-108px)]` for full height, and remove the rounded corners.

- **Before:** `w-[250px] shrink-0 sticky top-[108px] self-start max-h-[calc(100vh-108px)] flex flex-col border-r border-border bg-card rounded-lg`
- **After:** `w-[250px] shrink-0 sticky top-[108px] self-start h-[calc(100vh-108px)] flex flex-col border-r border-border bg-card`

