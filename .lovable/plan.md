
# Welcome/Intro Screen Before Onboarding

## What Changes

Add a new "welcome" step as the first screen in the `EntryScreen` component. The flow becomes:

1. **Welcome (NEW)** -- Introduction with value proposition + Login/Register buttons + "Continue as guest"
2. **Location** -- Where should we look?
3. **Mood** -- What are you in the mood for?

## Welcome Screen Design

- SweetSpots logo at top
- Headline: "Welcome to SweetSpots" (or similar engaging copy)
- 2-3 short value proposition bullets (e.g., "Discover places that match your vibe", "Get personalized recommendations", "Save and share your favorites")
- "Continue with Google" button (primary)
- "Sign up with email" / "Sign in" buttons
- "Continue as guest" link at the bottom (skips auth, proceeds to location step)
- Step dots: 3 dots now (welcome / location / mood), first one active

## Technical Details

**File: `src/components/EntryScreen.tsx`**

- Add `"welcome"` to the step union type: `useState<"welcome" | "location" | "mood">("welcome")`
- Add a new conditional render block for `step === "welcome"` that shows:
  - Logo, headline, value prop copy
  - Google sign-in button (reusing `signInWithGoogle` from `useAuth`)
  - Email auth via opening the existing `AuthDialog` component (import it)
  - A "Continue as guest" button that sets step to `"location"`
- On successful auth (Google redirect or dialog success), proceed to `"location"` step
- Update step indicator dots from 2 to 3 across all steps
- The `onSkip` ("Skip to home") link remains available on the welcome screen as well

**No new files needed** -- the existing `AuthDialog` component handles email sign-up/sign-in and will be opened as a dialog from the welcome screen.
