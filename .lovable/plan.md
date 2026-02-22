

## Improve Drag-and-Drop UX for Itinerary Activities

The current implementation has several issues that make DnD feel buggy: no edge detection (items always drop "on" instead of "before/after"), index-based React keys cause re-render confusion, no auto-scroll during drag, and minimal visual feedback. Here's the fix:

### 1. Install `@atlaskit/pragmatic-drag-and-drop-hitbox`

This optional package provides `attachClosestEdge` and `extractClosestEdge` utilities, which determine whether the user is hovering closer to the **top** or **bottom** edge of a drop target. This is essential for sortable list behavior -- it tells us whether to insert the dragged item above or below the target.

### 2. Rewrite `DraggableActivityCard` in `DaySection.tsx`

- Use `attachClosestEdge` in the drop target's `getData` with `allowedEdges: ['top', 'bottom']` and `getIsSticky: () => true` so the drop indicator doesn't flicker.
- Track `closestEdge` state ('top' | 'bottom' | null) instead of a simple `isOver` boolean.
- Render a colored line indicator at the **top** or **bottom** of the card depending on the edge, so users see exactly where the activity will land.
- Use a stable unique key per activity (generate an `_id` field using `crypto.randomUUID()` when one doesn't exist) instead of array index.

### 3. Rewrite `DroppableSlot` in `DaySection.tsx`

- Also use `attachClosestEdge` so dropping into an empty slot shows proper feedback.
- Show a "Drop here" placeholder when a slot has no activities and something is being dragged over it.

### 4. Update `ItineraryView.tsx` monitor

- In the `monitorForElements` `onDrop` handler, use `extractClosestEdge` from the destination data to decide whether to insert before or after the target activity.
- If `closestEdge === 'bottom'`, insert after the target index; if `'top'`, insert before.
- Add `autoScrollForElements` from the core package for automatic scrolling when dragging near viewport edges.

### 5. Update `handleDragReorder` in `ItineraryPage.tsx`

- Accept an additional `edge: 'top' | 'bottom'` parameter to correctly calculate the insertion index (before vs after the target).

### 6. Improve `ActivityCard.tsx` drag styling

- When `isDragging` is true, reduce opacity more noticeably and add a dashed border to show the "ghost" placeholder.
- The drag handle cursor changes to `grabbing` while active.

### 7. Assign stable IDs to activities

- When itinerary data is loaded or generated, assign a `_dragId` (using `crypto.randomUUID()`) to each activity that doesn't have one. This ensures React keys are stable across re-renders after reordering.

---

### Technical Summary

**New dependency:** `@atlaskit/pragmatic-drag-and-drop-hitbox`

**Files modified:**
- `src/components/itinerary/DaySection.tsx` -- closestEdge detection, drop indicators, stable keys
- `src/components/itinerary/ItineraryView.tsx` -- extractClosestEdge in monitor, auto-scroll, assign _dragIds
- `src/components/itinerary/ActivityCard.tsx` -- improved drag ghost styling
- `src/components/ItineraryPage.tsx` -- edge-aware insertion logic

