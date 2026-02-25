

## Add Back Button to Onboarding Flow

The `EntryScreen` component has 3 steps: `welcome` → `location` → `mood`. Currently there's no way to go back from `location` to `welcome` or from `mood` to `location`.

### Changes

**File: `src/components/EntryScreen.tsx`**

1. **Location step (lines 349-372)** — Add a Back button before the Next button that returns to the `welcome` step:
   - Add a flex row with Back + Next buttons (similar pattern already used in `OnboardingWizard.tsx`)
   - Back button calls `setStep("welcome")`
   - Update step dot indicator: dot 2 is active

2. **Mood step (lines 221-242)** — Add a Back button that returns to `location`:
   - Below the `MoodInput` component, add a Back button that calls `setStep("location")`
   - Update step dot indicator: dot 3 is active
   - The mood step currently has no step dots or navigation — add them for consistency

**File: `src/components/MoodInput.tsx`**

3. Add an optional `onBack` prop so the parent can wire up back navigation. Add a Back button in the button row next to "Show me the goods".

### Layout Details

- Location step: Replace the single "Next" button with a row of `[Back] [Next]`
- Mood step: Add step dots + a `[Back]` button alongside existing controls
- Back buttons use `variant="outline"` styling, matching the existing pattern from `OnboardingWizard`
- Welcome step has no Back button (it's the first step)

