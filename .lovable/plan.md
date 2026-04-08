

## Problem

Right now, Pro and Free users see the exact same UI everywhere. The only difference is the search limit (5/day vs unlimited). There's no visual feedback that makes Pro feel premium.

## Plan: Make Pro Feel Premium

### 1. Add a Pro badge to the profile slide menu
In `src/components/ProfileSlideMenu.tsx`, show a small gold "PRO" badge next to the user's name when they're subscribed. Use `useSubscription` to check `isPro`. This immediately signals their status every time they open the menu.

### 2. Show a Pro badge in the Discover search bar area
In `src/components/DiscoverPage.tsx`, when `isPro` is true, display a small "PRO" pill next to the search counter (instead of "X searches left", show "Unlimited" with a sparkle icon). Free users keep seeing "3 of 5 searches left" — this contrast makes Pro feel worth it.

### 3. Remove the search limit counter for Pro users
Currently the search limit UI shows for everyone. For Pro users, replace it with a subtle "PRO · Unlimited" indicator — no nagging, just a clean premium signal.

### 4. Add a Pro indicator in the App Header
In `src/components/AppHeader.tsx`, show a tiny crown or sparkle icon next to "SweetSpots" for Pro users. Subtle but always visible.

### 5. Style the Subscription menu item in ProfileSlideMenu
For Pro users, the "Subscription" row should show a gold "PRO" badge as the trailing element instead of a plain chevron. For free users, show "Free" in muted text.

### 6. Add a "Pro member" banner on the Profile page
In `src/components/ProfilePage.tsx`, add a small "Pro Member" badge or banner near the profile hero for subscribed users.

### Files to modify
- `src/components/ProfileSlideMenu.tsx` — add Pro badge next to username + subscription row badge
- `src/components/DiscoverPage.tsx` — replace search counter with "PRO · Unlimited" for Pro users
- `src/components/AppHeader.tsx` — add subtle Pro indicator (crown icon)
- `src/components/profile/ProfileHero.tsx` — add Pro member badge
- `src/hooks/useSearchLimit.tsx` — no changes needed (already handles `isPro`)

### Visual approach
- Gold/amber accent color for Pro badges (`bg-amber-500/15 text-amber-600 border-amber-500/30`)
- Small crown (👑) or sparkle icons for Pro indicators
- Keep it subtle and premium, not flashy

