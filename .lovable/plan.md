

## Fix: Arrow button should navigate to next step after location is confirmed

### Problem
On the location step of onboarding, after searching and selecting a place from the dropdown, the arrow button inside the input field only calls `handleConfirmCity()` which re-sets `exploreLocation` -- but never advances to the next step ("mood"). The user expects tapping the arrow to proceed.

### Solution
Change the arrow button's `onClick` handler so that:
- If the location is **not yet confirmed**, it confirms the city (current behavior)
- If the location is **already confirmed**, it advances to the mood step

### Technical Details

**File: `src/components/EntryScreen.tsx`**

Update the arrow button's `onClick` (around line 281) from:

```typescript
onClick={handleConfirmCity}
```

to:

```typescript
onClick={isLocationConfirmed ? handleLocationNext : handleConfirmCity}
```

This is a one-line change. When `isLocationConfirmed` is `true` (meaning `exploreLocation` matches `locationInput`), clicking the arrow calls `handleLocationNext()` which sets `step` to `"mood"`. Otherwise it confirms the city as before.

