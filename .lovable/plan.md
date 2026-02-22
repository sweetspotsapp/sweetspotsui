

## Fix: Image Blocking Drag-and-Drop

The `<img>` tag inside the activity card has native browser drag behavior -- when you click/touch on an image and drag, the browser tries to drag the image itself instead of letting pragmatic-drag-and-drop handle the card drag. This is a well-known browser quirk.

### Fix

**`src/components/itinerary/ActivityCard.tsx`** (line 83-87)

Add `draggable="false"` and `style={{ pointerEvents: isEditing ? 'none' : 'auto' }}` to the `<img>` element:

- `draggable="false"` prevents the browser's native image drag from intercepting
- In edit mode, `pointerEvents: 'none'` on the image ensures all pointer events pass through to the parent card (the drag element), so the drag initiates correctly regardless of where you click

The image click-to-navigate behavior is already disabled in edit mode (the `handleCardClick` guard checks `!isEditing`), so disabling pointer events on the image in edit mode has no side effect.

### Technical Detail

This is a single-line change on the `<img>` tag -- no architectural changes needed.

