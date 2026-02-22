

## Fix: Move Menu Hidden Under Card Text

**Problem**: The "Move to" dropdown menu is rendered inside the hero image container which has `overflow-hidden`, causing the menu to be clipped and hidden behind the card's text area.

**Solution**: Remove `overflow-hidden` from the root card `div` and keep it only on the image container. Then move the `moveMenuRef` wrapper and the dropdown outside of the image `overflow-hidden` container, or simply change the dropdown to render with `position: fixed` so it escapes all overflow clipping.

The simplest and most robust fix: change the root card `div` from `overflow-hidden` to `overflow-visible`, and keep `overflow-hidden` only on the image `div`. The dropdown menu's `z-50` will then properly overlay the text area below.

### File: `src/components/itinerary/ActivityCard.tsx`

1. **Line 90**: Remove `overflow-hidden` from the root card `div`'s className (the rounded corners will be preserved by the image container's own `overflow-hidden`).
2. **Line 126**: The dropdown already has `z-50` and `bg-popover` -- no changes needed there.

This single change lets the absolutely-positioned dropdown escape the image area and render on top of the text content below.

### Technical Detail

- Root `div` (line 90): change `rounded-xl overflow-hidden` to `rounded-xl overflow-clip` or simply remove `overflow-hidden`. To preserve the rounded corners on the card, we use `overflow-clip` only on the image area (which already has its own `overflow-hidden`).
- The dropdown already has proper z-index (`z-50`) and solid background (`bg-popover`), so once the overflow clipping is removed from the parent, it will display correctly.

