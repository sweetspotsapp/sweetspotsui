

# Plan: Remove Onboarding + Refresh Homepage Copy

## What Changes

### 1. Delete onboarding files
- `src/components/EntryScreen.tsx`
- `src/components/MoodInput.tsx`
- `src/components/LoadingTransition.tsx`
- `src/hooks/useDiscoverySection.tsx`

### 2. Simplify `src/pages/Index.tsx`
- Remove the `AppState` type and `appState` state machine (`"onboarding" | "loading" | "main"`)
- Remove `handleOnboardingComplete`, `handleSkip`, and related logic
- Always render the main app directly (no onboarding gate)
- Remove imports for `EntryScreen`, `LoadingTransition`

### 3. Clean up `src/context/AppContext.tsx`
- Remove `userMood`, `setUserMood`, `userVibes` state
- Remove `hasCompletedOnboarding`, `completeOnboarding`, `resetOnboarding`
- Remove `onboardingData`, `setOnboardingData`, `sections`
- Remove the `OnboardingData` export and `SectionConfig`
- Keep everything else (saved places, categories, travel mode, auth dialog, free actions)

### 4. Update homepage copy in `src/components/HomePage.tsx`

Current copy is generic ("Hello, Explorer" / "No trips yet" / "Start by importing your favorite spots"). Replace with premium, identity-driven messaging:

**Header:** "Hello, {name}" stays — but add a tagline below:
> "Your next trip starts here"

**Empty state (no trips):**
> Heading: "Where to next?"
> Body: "Import the places you have been saving and we will turn them into a trip."

**Section label above trip cards:**
> "Your trips" (simple, clear)

### 5. Update any remaining references
- Remove `sweetspots_onboarding_done` and `sweetspots_skip_mode` localStorage/sessionStorage usage
- Fix any other components importing removed types (`OnboardingData`, etc.)

## Technical Details

| File | Action |
|---|---|
| `src/components/EntryScreen.tsx` | Delete |
| `src/components/MoodInput.tsx` | Delete |
| `src/components/LoadingTransition.tsx` | Delete |
| `src/hooks/useDiscoverySection.tsx` | Delete |
| `src/pages/Index.tsx` | Remove onboarding gate, simplify to always render main |
| `src/context/AppContext.tsx` | Remove ~80 lines of unused onboarding state |
| `src/components/HomePage.tsx` | Update copy to premium messaging |

Approximately 900 lines removed, 0 new files. Pure cleanup + copy refresh.

