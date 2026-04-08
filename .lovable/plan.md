

# Fix Profile Picture Consistency + Avatar Opens Slide-Out Menu

## Problems Identified

1. **Profile pictures are inconsistent** because different components fetch the avatar from different sources:
   - `HomePage.tsx` (line 94): reads `user?.user_metadata?.avatar_url` (Google OAuth metadata — stale, never updated when user changes their avatar)
   - `ProfileSlideMenu.tsx` (line 37-46): queries `profiles` table for `avatar_url` (correct source)
   - `ProfilePage.tsx`: likely also queries `profiles` table but may have its own fetch

2. **Tapping the avatar on the Home page navigates to the Profile tab** — user wants it to open the slide-out menu (like image 3) instead.

## Solution

### 1. Centralize avatar source — always use `profiles` table
- In `HomePage.tsx`, replace `user?.user_metadata?.avatar_url` with a query to the `profiles` table (same as ProfileSlideMenu does), or better: create a small shared hook (`useProfileAvatar`) that fetches and caches `avatar_url` + `username` from `profiles` once, used by all components.

### 2. Avatar click on Home → open slide-out menu
- Add `ProfileSlideMenu` to `HomePage.tsx`
- Change the avatar button's `onClick` from `onNavigateToProfile` to toggling the slide-out menu open
- Pass `onNavigateToProfile` into the slide-out's "View Profile" action so users can still reach the full Profile tab from the menu

### Files to modify
- **Create**: `src/hooks/useProfileInfo.tsx` — shared hook returning `{ avatarUrl, username, loading }` from `profiles` table
- **Edit**: `src/components/HomePage.tsx` — use new hook, add slide-out menu, wire avatar click
- **Edit**: `src/components/ProfileSlideMenu.tsx` — use shared hook instead of local fetch
- **Edit**: `src/components/ProfilePage.tsx` — use shared hook for the header avatar (consistency)

### Technical detail
The hook will query `profiles` once on mount and subscribe to auth changes. All three surfaces (Home avatar, slide-out menu, Profile page header) will show the same image from the same source.

