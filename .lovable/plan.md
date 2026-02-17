

## Calm Entry Screen — "The Hype Friend"

A warm, inviting mood-collection screen that appears **before** the onboarding wizard.

### Screen Design

- **Headline**: "Let's find your sweet spot" (with a honey emoji accent)
- **Subtext**: "Tell us what you're craving and we'll do the rest"
- **Input placeholder**: "Rooftop drinks, cozy cafes, street tacos…"
- **Button**: "Show me the goods" (with arrow icon)
- **Skip link**: "Just browsing" (skips to onboarding wizard)

### Visual Style

- Centered layout with generous vertical spacing
- SweetSpots logo at the top
- Subtle gradient or warm background tint
- Large, friendly typography
- Smooth fade-in animations on load (staggered: logo, headline, subtext, input)
- Rounded input field with focus glow effect

### Technical Changes

**`src/components/EntryScreen.tsx`** — Full rewrite
- Add a `moodCollected` state to toggle between the new mood screen and the existing `OnboardingWizard`
- When user submits a mood, store it and transition to the onboarding wizard
- "Just browsing" skips straight to the onboarding wizard with empty mood
- Use CSS keyframe animations for the staggered fade-in

**`src/components/MoodInput.tsx`** — Minor updates
- Update placeholder text to match the new copy
- Change button label from "Let's go" to "Show me the goods"
- Update skip button text from "Skip to home" to "Just browsing"

**`src/index.css`** — Add fade-in keyframes
- Add `animate-fade-in-up` keyframe for the staggered entrance animation

### Flow

```text
Entry Screen (mood input)
  |
  |-- submits mood --> Onboarding Wizard --> Home (with mood context)
  |-- "Just browsing" --> Onboarding Wizard --> Home
```

No database or backend changes needed — the mood string is passed through existing props.

