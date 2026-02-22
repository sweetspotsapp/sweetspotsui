

## Fix: Center the Location Picker Modal and Fix UI Overlapping

### Problems Identified
1. The modal is positioned as a bottom sheet (`fixed inset-x-0 bottom-0`) with `pb-20` padding, which looks off-center and awkward especially on larger screens
2. `overflow-hidden` on the modal container clips the autocomplete dropdown suggestions, causing the "weird UI overlapping" issue
3. The autocomplete dropdown renders inside the `overflow-hidden` container, so it gets cut off

### Changes

**File: `src/components/LocationPickerModal.tsx`**

1. **Center the modal vertically and horizontally** -- Replace the bottom-anchored positioning (`fixed inset-x-0 bottom-0 pb-20`) with a centered layout (`fixed inset-0 flex items-center justify-center`). Use `rounded-3xl` instead of `rounded-t-3xl` since it's no longer anchored to the bottom. Remove the drag handle bar since it's no longer a bottom sheet.

2. **Fix overflow clipping** -- Change `overflow-hidden` on the modal container to `overflow-visible` so the autocomplete dropdown can render outside the container boundaries without being clipped. Move `overflow-y-auto` only to the content area that needs scrolling.

3. **Remove the handle bar** -- Since the modal is now centered (not a swipeable bottom sheet), the top drag handle is unnecessary.

### Technical Details

- Modal outer wrapper: `fixed inset-0 z-50 flex items-center justify-center p-4` (centered with padding)
- Modal card: `bg-card rounded-3xl shadow-elevated w-full max-w-[420px] max-h-[80vh] flex flex-col` (remove `overflow-hidden`)
- Content area: keep `overflow-y-auto` only on the scrollable content div
- Autocomplete dropdown: already uses `absolute` + `z-20`, will now render correctly without being clipped
- Animation: change from `animate-fade-up` to `animate-fade-in` to match centered appearance

