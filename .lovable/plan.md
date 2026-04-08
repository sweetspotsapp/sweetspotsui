

# Add Persistent "Import from Social" Prompt for Active Users

## Problem
The current import tip banner only shows for users with 1-3 saved spots, then disappears forever. Users with more spots never learn about the social import feature.

## Approach
Add a subtle, non-intrusive **"Add Spot" action card** as the last item in the board grid — styled like a board card but acting as a CTA. This keeps it aesthetic and contextual without being a banner that feels like an ad.

### Design
- A card in the board grid (same size as other board cards) placed **after all boards**
- Soft dashed border, muted background
- Icon: `+` or a link icon
- Two lines of copy: **"Add a Spot"** (title) and **"Search or paste a link from Instagram, TikTok, or Maps"** (subtitle)
- On tap: open a small bottom sheet or inline menu with two options: "Search Places" (→ Discover tab) and "Paste a Link" (→ ImportLinkDialog)
- Blends with the masonry grid naturally — doesn't feel like a banner or ad

### Also
- Remove the `savedPlaces.length <= 3` upper bound on the existing tip banner — keep it showing (dismissible) for all users until they dismiss it
- This way there are two touchpoints: the tip banner (dismissible, one-time) and the permanent grid card

### Files to modify
- `src/components/SavedPage.tsx` — add the CTA card after the board grid, widen tip banner threshold
- Possibly extract a small `AddSpotCard` component, or inline it in the grid

### No database changes needed.

