

# Add "Complete Trip" Inside Trip View + Better Activity Copywriting

## Problem
1. Users can only complete a trip from the trip list page — not from inside the trip view itself
2. Activity status says "Completed" which feels too formal/corporate for a travel app

## Changes

### 1. Add "Complete Trip" button inside TripView

When a trip is in **live mode**, add a "Wrap Up Trip" button at the bottom of the trip view (after all day sections). This gives users a way to finish the trip without going back to the list.

**Location**: Bottom of `TripView.tsx`, after the day sections loop

```text
┌─────────────────────────────────┐
│  Day 3 activities...            │
│  ...                            │
├─────────────────────────────────┤
│                                 │
│   🎉 Ready to wrap up?         │
│   ┌───────────────────────┐     │
│   │   Finish This Trip ✓  │     │
│   └───────────────────────┘     │
│                                 │
└─────────────────────────────────┘
```

- Button appears only in live mode, below the last day
- Tapping shows a confirmation (small inline prompt, not a modal)
- On confirm, calls `completeTrip(tripId)` and navigates back to trip list

**Props needed**: Add `onCompleteTrip?: () => void` to `TripViewProps`

### 2. Better Activity Status Copywriting

Replace corporate-sounding labels with travel-friendly ones:

| Current | New |
|---------|-----|
| "Completed" | "Been there ✓" |
| "Done" button | "Been here ✓" |
| "Skip" button | "Skip" (keep) |
| "Cancel" button | "Not going" |
| "All done for today!" | "What a day! 🎉" |

**File**: `ActivityCard.tsx` lines 251-253 (status display) and lines 258-274 (action buttons)
**File**: `TripView.tsx` line 295 (daily completion message)

### 3. Wire up in TripPage

Pass `completeTrip` through to `TripView` as `onCompleteTrip`.

**File**: `TripPage.tsx` — add the prop when rendering `TripView`

### Files to Change
| File | Change |
|------|--------|
| `src/components/trip/TripView.tsx` | Add `onCompleteTrip` prop, render "Finish Trip" section at bottom |
| `src/components/trip/ActivityCard.tsx` | Update copywriting for status labels and buttons |
| `src/components/TripPage.tsx` | Pass `completeTrip` to `TripView` |

### No database changes needed
The `status` column and `completeTrip` function already exist.

