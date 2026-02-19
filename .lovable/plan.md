

# Fix Flickering on Step Transition

## Problem
When clicking "Continue as guest", the location screen elements all start at `opacity-0` and then animate in with staggered delays (`delay-200`, `delay-300`). This causes a visible flicker where the screen briefly appears blank before content fades in.

## Solution
Remove the `opacity-0 animate-fade-up` animation classes from the location step (and optionally the mood step) so content renders instantly when transitioning between steps. The fade-up animations make sense on the initial welcome screen (first thing users see), but feel jarring on subsequent steps where users expect an immediate transition.

## Technical Changes

**File: `src/components/EntryScreen.tsx`**

1. **Location step (lines 261-263, 265, 363):** Remove `opacity-0 animate-fade-up` and delay classes from the three wrapper divs in the location step
2. **Mood step (lines 239, 242, 250):** Similarly remove fade-up animations from the mood step wrappers

This keeps the welcome screen's entrance animations intact while making step-to-step transitions instant and flicker-free.
