

## Fix: Prevent HomePage from reloading on tab navigation

### Root Cause

In `Index.tsx` (line 127), `HomePage` is conditionally rendered:
```tsx
{activeTab === "home" && <HomePage />}
```

When the user switches to "Saved" or "Trip" tab, `HomePage` **fully unmounts**. When they switch back, it **remounts from scratch** -- creating new refs, re-running effects, and calling the unified-search API again despite having cached data.

### Solution

**Keep all tab content mounted but visually hidden** using CSS `display: none` instead of conditional rendering. This means `HomePage` stays alive in the DOM across tab switches, preserving all its state (refs, search results, etc.) without any API calls.

### Changes

**File: `src/pages/Index.tsx`**

Replace the conditional rendering block:
```tsx
{activeTab === "home" && <HomePage />}
{activeTab === "saved" && <SavedPage />}
{activeTab === "trip" && <TripPage />}
{activeTab === "profile" && <ProfilePage />}
```

With CSS-hidden tabs that stay mounted:
```tsx
<div style={{ display: activeTab === "home" ? "block" : "none" }}>
  <HomePage onNavigateToProfile={() => setActiveTab("profile")} />
</div>
<div style={{ display: activeTab === "saved" ? "block" : "none" }}>
  <SavedPage onNavigateToProfile={() => setActiveTab("profile")} />
</div>
<div style={{ display: activeTab === "trip" ? "block" : "none" }}>
  <TripPage resumeTripId={resumeTripId} onResumed={() => setResumeTripId(null)} />
</div>
<div style={{ display: activeTab === "profile" ? "block" : "none" }}>
  <ProfilePage onNavigateToSaved={() => setActiveTab("saved")} />
</div>
```

### Why this works

- `HomePage` mounts once and stays mounted -- no remount, no re-fetching
- All local state (search results, refs, filters) survives tab switches
- The unified-search API is only called when the user explicitly changes location or mood/vibe prompt
- Other tabs (Saved, Trip, Profile) also benefit from not remounting

### Trade-off

All four tab components stay in the DOM simultaneously, which uses slightly more memory. This is negligible for this app and is the standard pattern for tab-based mobile navigation (similar to how native apps keep tabs alive).

