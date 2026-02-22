

## Cross-Day Activity Reordering

Currently, the up/down arrows only move activities within the same time slot. This plan enables moving activities freely between slots and between days.

### Approach

Replace the current within-slot reorder with a **global move** system. Each activity gets up/down arrows that move it through a flattened list of all activities across all days and slots. Moving past the first item in a slot moves the activity to the previous slot (or previous day's last slot). Moving past the last item moves it to the next slot (or next day's first slot).

### Changes

**1. ItineraryView.tsx** -- Replace `onReorder` with a new `onGlobalMove` handler

- Add a `handleGlobalMove(dayIndex, slotIndex, activityIndex, direction: 'up' | 'down')` function that:
  - Removes the activity from its current position
  - If moving up from position 0 in a slot: moves to end of previous slot (same day), or end of last slot of previous day
  - If moving down from last position in a slot: moves to start of next slot (same day), or start of first slot of next day
  - Otherwise: swaps within the same slot
- Pass this handler down to DaySection instead of `onDragReorder`
- Update the editing banner text to: "Use the arrows to rearrange activities across your itinerary."

**2. DaySection.tsx** -- Update props and arrow logic

- Change `onDragReorder` prop to `onMoveActivity: (dayIndex: number, slotIndex: number, activityIndex: number, direction: 'up' | 'down') => void`
- Remove local `handleMoveUp` / `handleMoveDown` functions
- Update `canMoveUp` / `canMoveDown` on ActivityCard:
  - `canMoveUp`: false only if this is the first activity of the first slot of the first day
  - `canMoveDown`: false only if this is the last activity of the last slot of the last day
- Pass `totalDays`, `dayIndex`, `slotIndex`, `activityIndex` context to determine boundaries

**3. ItineraryView.tsx** -- Pass total day count info to DaySection

- Pass `isFirstDay` and `isLastDay` props to each DaySection so it can compute arrow boundaries

**4. ItineraryPage.tsx** -- Update `handleReorder` signature

- Replace the old `handleReorder(dayIndex, slotIndex, fromIdx, toIdx)` with the new `handleGlobalMove(dayIndex, slotIndex, activityIndex, direction)` that mutates the itinerary data directly (remove from source, insert at target)

### Technical Details

The global move logic in ItineraryPage.tsx (or ItineraryView.tsx):

```text
function handleGlobalMove(dayIdx, slotIdx, actIdx, direction):
  1. Remove activity from days[dayIdx].slots[slotIdx].activities[actIdx]
  2. Compute target:
     - UP: if actIdx > 0 -> same slot, actIdx - 1
            else if slotIdx > 0 -> previous slot, end
            else if dayIdx > 0 -> previous day, last slot, end
            else -> no-op
     - DOWN: if actIdx < last -> same slot, actIdx + 1
             else if slotIdx < lastSlot -> next slot, position 0
             else if dayIdx < lastDay -> next day, first slot, position 0
             else -> no-op
  3. Insert activity at target position
  4. Clean up empty slots (optional -- keep slots even if empty)
  5. Update itinerary state
```

No new dependencies, no database changes, no new files needed.
