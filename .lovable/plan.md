

## 1. Disable Text Selection in Edit Mode

Add `select-none` (CSS `user-select: none`) to the `ActivityCard` root `div` when `isEditing` is true. This prevents accidental text highlighting when users try to hold and drag.

**File: `src/components/itinerary/ActivityCard.tsx`**
- Add `isEditing && "select-none"` to the root div's `cn()` class list.

## 2. Add "..." Menu Button for Move-to-Day

Add a `MoreVertical` ("...") button on each activity card in edit mode. Tapping it opens a small popover/dropdown listing all days in the itinerary. Selecting a day moves the activity to that day's first slot.

### Changes needed:

**File: `src/components/itinerary/ActivityCard.tsx`**
- Add new props: `onMoveToDay?: (targetDayIndex: number) => void` and `availableDays?: Array<{ dayIndex: number; label: string }>`.
- Import `MoreVertical` from lucide-react.
- In edit mode, render a `MoreVertical` button next to the delete (Trash2) button in the top-right overlay.
- On click, show a small dropdown menu (using a simple local state toggle) listing each day. Tapping a day calls `onMoveToDay(targetDayIndex)` and closes the menu.
- The current day is shown but disabled/greyed out so the user knows which day the activity is already on.

**File: `src/components/itinerary/DaySection.tsx`**
- Add new prop to `DaySectionProps`: `onMoveToDay?: (dayIndex: number, slotIndex: number, activityIndex: number, targetDayIndex: number) => void` and `totalDays: ItineraryDay[]`.
- Pass `onMoveToDay` and `availableDays` (built from `totalDays`) down through `DraggableActivityCard` to `ActivityCard`.

**File: `src/components/itinerary/ItineraryView.tsx`**
- Add a new `handleMoveToDay` callback that reuses `onDragReorder` -- it removes the activity from its current position and inserts it at the end of the target day's first slot.
- Pass `onMoveToDay` and `totalDays={itinerary.days}` to each `DaySection`.

### Technical Details

- The "..." menu will be a simple absolutely-positioned dropdown (no external library needed) that appears on click, with a click-outside handler to dismiss.
- Moving to another day will call `onDragReorder(fromDay, fromSlot, fromAct, targetDay, 0, targetSlotActivitiesLength)` to append the activity to the first slot of the target day.
- `e.stopPropagation()` on the "..." button prevents triggering drag.

### Files Modified
- `src/components/itinerary/ActivityCard.tsx` -- select-none + "..." move-to-day menu
- `src/components/itinerary/DaySection.tsx` -- pass new props through
- `src/components/itinerary/ItineraryView.tsx` -- handleMoveToDay callback + pass totalDays
