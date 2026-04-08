

## Problem

The Pro card's "Manage billing" and "Cancel subscription" section is crammed inside the card border, looking cluttered and cheap. It needs to be pulled out and redesigned.

## Plan

### Redesign the Pro management section in `src/pages/Pricing.tsx`

Move the billing management actions **outside and below** the Pro card, as a separate, clean section that only appears for Pro users. Remove it from inside the card border.

**New layout for Pro users:**
- The Pro card stays clean — just features list + "Manage plan" CTA button (opens portal)
- Below the plans grid, add a subtle "Subscription" section with:
  - A clean row showing "You're on Pro" with the renewal date
  - A text link "Manage billing" that opens the Stripe portal
  - A subtle "Cancel subscription" text link in muted/destructive color
- This section uses simple text links, no bordered box, no card — just clean typography with generous spacing
- Non-Pro users don't see this section at all

### Changes to make
- Remove lines 177-195 (the bordered billing box inside the Pro card)
- Add a new section between the plans grid and the FAQ footer
- Style it minimally: centered text, small font, link-style buttons

