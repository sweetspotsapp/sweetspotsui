
# Fix: Save to Board Dialog Overlapping Bottom Navigation

## Problem
The "Save to Board" dialog's footer buttons (e.g., "Save to 1 board") sit flush at the bottom of the screen and are covered by the persistent BottomNav bar, making them untappable.

## Solution
Add bottom padding to the dialog's footer area so buttons remain visible and tappable above the navigation bar.

## Technical Details

### File: `src/components/saved/SaveToBoardDialog.tsx`
- Add `pb-20` (or `safe-area-bottom` equivalent) to the footer `div` at line 329, changing `p-4` to `px-4 pt-4 pb-20`
- This ensures the action buttons ("Save to X boards", "Remove from saved") clear the fixed BottomNav

This is a one-line CSS class change -- no logic changes needed.
