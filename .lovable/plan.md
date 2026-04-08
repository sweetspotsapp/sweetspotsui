

# Better Empty State + Discovery Guidance for Saved Spots

## What Roamy Does Well
Roamy's core pitch is: "Turn your saved TikTok & Instagram posts into real trips." They make the import-from-social flow the **hero action** — not buried behind a small icon. Their empty state is essentially an onboarding funnel: paste a link or connect your socials, and the app immediately shows value.

## The Problem
SweetSpots currently has:
- A generic empty state ("No boards yet" + "Explore Places" button)
- The import link feature hidden behind a tiny chain-link icon in the header
- No guidance on the two main paths: **search to discover** or **import from social**
- Logged-out state is equally generic

## Plan

### 1. Redesign the Empty State (`EmptyState.tsx`)
Replace the current single-CTA empty state with a **two-path onboarding card layout**:

**Path A — "Discover on SweetSpots"**
- Icon: Search/Compass
- Copy: "Search by vibe — find hidden gems, cozy cafes, rooftop bars near you"
- CTA button: "Start Exploring" → navigates to Discover tab

**Path B — "Import from Social Media"**
- Icon: Link/Instagram-style
- Copy: "Paste a link from Instagram, TikTok, or Google Maps to save any spot"
- CTA button: "Paste a Link" → opens the ImportLinkDialog directly
- Show supported platform pills (Instagram, TikTok, Google Maps) as small badges

Both cards stacked vertically with a divider "or" between them. Clean, visual, action-oriented.

### 2. Add a Persistent Import Banner (when boards exist but few saves)
When the user has 1-3 saved places, show a subtle **dismissible tip banner** at the top of the board grid:
- "Tip: Paste an Instagram or TikTok link to quickly save spots you've been eyeing"
- Small "Paste Link" action button inline
- Dismissible (store in localStorage)

### 3. Update Logged-Out Empty State
Same two-path design but with auth gating — both CTAs prompt sign-up/login first.

### 4. Make the Import Icon More Discoverable
- Add a label "Import" below the link icon in the header, or change it to a **floating action button (FAB)** with "+" that offers two options: "New Board" and "Import Link"

### Files to Modify
- `src/components/saved/EmptyState.tsx` — full redesign with two-path layout
- `src/components/SavedPage.tsx` — add tip banner for low-save-count users, wire import dialog from empty state, potentially replace header icon with FAB
- No database changes needed

### Technical Notes
- ImportLinkDialog already exists and works — just needs to be triggerable from the empty state
- Platform badge icons can use simple text pills (no need for actual brand logos to avoid trademark issues)
- Dismissal state stored in `localStorage` key like `sweetspots_import_tip_dismissed`

