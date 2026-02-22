

## Drag-and-Drop Activity Reordering

Replace the up/down arrow buttons with touch-friendly hold-and-drag reordering for itinerary activities in edit mode. Activities can be dragged between time slots and between days.

### Approach

Use the **@dnd-kit** library (lightweight, touch-friendly, accessible, built for React) to enable drag-and-drop reordering. A drag handle icon will appear on each activity card in edit mode. Users can press and hold the handle, then drag the activity to reorder it -- within the same slot, across slots, or across days.

The up/down arrow buttons will be removed in favor of the drag handle, keeping the UI cleaner. The trash button for removing activities remains.

### Changes by File

**1. Install `@dnd-kit/core` and `@dnd-kit/sortable` and `@dnd-kit/utilities`**

These are the standard packages for sortable drag-and-drop in React.

**2. `src/components/itinerary/ItineraryView.tsx`**

- Wrap the days list in a `DndContext` provider (from @dnd-kit/core) when in edit mode
- Flatten all activities into a single sortable list with composite IDs like `"day-0_slot-1_act-2"`
- On `onDragEnd`, parse the source and destination IDs, remove the activity from its original position, and insert it at the new position
- Update the editing banner text to: "Hold and drag activities to rearrange your itinerary."
- Remove the `onGlobalMove` prop (no longer needed)

**3. `src/components/itinerary/DaySection.tsx`**

- Wrap each slot's activities list in a `SortableContext` (from @dnd-kit/sortable)
- Each activity item becomes a `useSortable` draggable, using composite IDs
- Add a droppable zone per slot so activities can be dropped between slots/days
- Remove `onMoveActivity`, `canMoveUp`, `canMoveDown`, `isFirstDay`, `isLastDay` props

**4. `src/components/itinerary/ActivityCard.tsx`**

- Add a drag handle (GripVertical icon from lucide) visible only in edit mode
- Remove the up/down ChevronUp/ChevronDown buttons
- Accept `dragHandleProps` (attributes + listeners from useSortable) to attach to the handle element
- The card gets a visual style change while being dragged (slight opacity, shadow lift)

**5. `src/components/ItineraryPage.tsx`**

- Remove `handleGlobalMove` function
- Remove `onGlobalMove` from the ItineraryView props
- Add a new `handleDragReorder(fromDayIdx, fromSlotIdx, fromActIdx, toDayIdx, toSlotIdx, toActIdx)` handler that:
  - Deep clones the itinerary
  - Removes the activity from the source position
  - Inserts it at the destination position
  - Updates state

### Technical Details

- **Composite IDs**: Each draggable activity gets an ID like `d0-s1-a2` encoding its day, slot, and activity index. On drag end, both active and over IDs are parsed to determine source and destination.
- **Touch support**: @dnd-kit has built-in touch sensor with a 250ms press delay to distinguish scrolling from dragging.
- **Drop indicators**: A visual placeholder line appears between activities to show where the dragged item will land.
- **Accessibility**: @dnd-kit provides keyboard support out of the box as a fallback.
- The existing add-place and remove buttons remain unchanged.

