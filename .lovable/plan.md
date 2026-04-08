

## Make heart button circles smaller

All three card components (`PlaceCardCompact`, `PlaceCard`, `TopPickCard`) currently use `w-8 h-8` (32px) circles with `w-4 h-4` icons. We'll shrink them to `w-6 h-6` (24px) circles with `w-3.5 h-3.5` icons.

### Changes

**1. `src/components/PlaceCardCompact.tsx` (line ~160)**
- Circle: `w-8 h-8` → `w-6 h-6`
- Icon: `w-4 h-4` → `w-3.5 h-3.5`

**2. `src/components/PlaceCard.tsx` (line ~102)**
- Circle: `w-8 h-8` → `w-6 h-6`
- Icon: `w-4 h-4` → `w-3.5 h-3.5`

**3. `src/components/TopPickCard.tsx` (line ~129)**
- Circle: `w-8 h-8` → `w-6 h-6`
- Icon: `w-4 h-4` → `w-3.5 h-3.5`

