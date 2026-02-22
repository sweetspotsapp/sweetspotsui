
## Fix: Move Menu Clipped by Image Container

**Problem**: The "Move to" dropdown menu is rendered inside the hero image `div` which has `overflow-hidden`. This clips the dropdown regardless of z-index, so it gets cut off by the card's text area below.

**Solution**: Move the edit buttons (three-dot menu + delete button) and their dropdown **outside** the `overflow-hidden` image container. They will be positioned absolutely relative to the root card `div` instead, which has no overflow clipping. This way the dropdown can freely extend beyond the image area and overlay other cards.

### Changes in `src/components/itinerary/ActivityCard.tsx`

1. **Remove** the editing buttons block (lines 116-153) from inside the hero image `div`.
2. **Add** the same block as a sibling right after the hero image `div`, still inside the root card `div`. Position it with `absolute top-2 right-2` relative to the root card (which needs `relative` added).
3. Add `relative` to the root card `div` so the absolutely-positioned buttons reference it.
4. Keep `overflow-hidden` on the image div (needed for rounded corners on images) -- it just won't clip the dropdown anymore since the dropdown is outside it.

This is a structural move of the buttons, not a z-index hack -- it properly solves the clipping issue.
