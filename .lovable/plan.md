

## Make Entire Card Draggable (Remove Grip Handle)

Remove the separate `GripVertical` drag handle button from the activity card and instead make the **entire card** the drag element. Users will hold anywhere on the card to initiate dragging in edit mode.

### Changes

**1. `src/components/itinerary/ActivityCard.tsx`**
- Remove the `dragHandleProps` prop entirely (no more separate handle ref).
- Remove the `GripVertical` button from the edit-mode overlay.
- Keep the `Trash2` delete button.
- Keep the `isDragging` prop for visual feedback.
- Remove `GripVertical` from the lucide imports.

**2. `src/components/itinerary/DaySection.tsx`**
- In `DraggableActivityCard`, remove the separate `handleRef` for the drag handle.
- Instead, pass the entire card `ref` as both the `element` **and** the `dragHandle` to `draggable()` -- or simply omit `dragHandle` so the whole element is draggable.
- Remove `dragHandleProps` from the `ActivityCard` render.
- Everything else (drop targets, edge detection, indicators) stays the same.

### Result
- No more grip icon button on activity cards in edit mode.
- Users hold anywhere on the card to drag.
- The delete button still works (its `stopPropagation` prevents accidental drags).
- Drop indicators and edge detection remain unchanged.
