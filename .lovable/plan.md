

## Add and Remove Activities in Itinerary Edit Mode

Enable users to add new places and remove existing ones from their itinerary while in edit mode.

### Remove Activity

Add a delete/trash button to each `ActivityCard` when in edit mode (alongside the existing up/down arrows). Clicking it removes the activity from the itinerary data.

### Add Activity

Add an "Add place" button at the end of each time slot (visible only in edit mode). Tapping it opens a small inline search input (similar to the destination autocomplete) that uses the existing `usePlaceAutocomplete` hook to search for places. Selecting a place inserts a new activity into that slot.

---

### Changes by File

**1. `src/components/itinerary/ActivityCard.tsx`**
- Add `onRemove` optional prop and `Trash2` icon import.
- In edit mode, render a delete button (red trash icon) next to the up/down arrows on the card image overlay.
- Clicking it calls `onRemove()`.

**2. `src/components/itinerary/DaySection.tsx`**
- Add `onRemoveActivity` and `onAddActivity` props.
- Pass `onRemove` to each `ActivityCard`, wired to `onRemoveActivity(dayIndex, slotIndex, activityIndex)`.
- After the activities list in each slot (when `isEditing`), render an "Add place" button.
- When tapped, show an inline search input with autocomplete dropdown (using `usePlaceAutocomplete`).
- On selection, call `onAddActivity(dayIndex, slotIndex, { name, placeId, category, description })`.

**3. `src/components/itinerary/ItineraryView.tsx`**
- Add `onRemoveActivity` and `onAddActivity` props.
- Pass them through to each `DaySection`.
- Update the editing banner text to mention add/remove capability.

**4. `src/components/ItineraryPage.tsx`**
- Add `handleRemoveActivity(dayIdx, slotIdx, actIdx)`:
  - Deep clone itinerary, splice out the activity, update state.
- Add `handleAddActivity(dayIdx, slotIdx, newActivity)`:
  - Deep clone itinerary, push new activity to the slot, update state.
- Pass both handlers to `ItineraryView`.

### Technical Details

- The "Add place" inline search reuses `usePlaceAutocomplete` with a local state toggle per slot.
- New activities are added with default values: `{ name, description: "", category: "place", placeId }`.
- Remove simply splices the activity from the slot's activities array.
- No database or schema changes needed -- the itinerary data is saved as JSON.
- The add-place input appears inline below the last activity in a slot, with the same autocomplete dropdown pattern used in the destination field.

