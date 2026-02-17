

## Add "Explore" CTA Buttons to Profile Sections

Turn each profile section into a discovery launchpad by adding contextual search buttons that navigate users to the home page with a pre-filled, relevant search query.

### What Changes

**3 sections get an "Explore" button:**

1. **Vibe DNA section** -- Below the vibe bars, add a button like "Explore [top vibe] spots near you" (e.g., "Explore Foodie spots near you"). Tapping navigates to home and triggers a search for that vibe.

2. **Personality Traits section** -- Each trait card gets a small arrow/button. Tapping a trait like "Flavor Chaser" navigates to home with search query "best spots for a flavor chaser".

3. **Character Match section** -- After showing the match, add an "Explore spots [character] would love" button that searches based on the character's vibe.

### How It Works

```text
User taps "Explore Foodie spots" on Profile
  --> navigates to "/" 
  --> passes search query via URL params or app context
  --> HomePage auto-triggers unified search with that query
```

### Technical Details

**`src/components/ProfilePage.tsx`**
- Import `useNavigate` from react-router-dom
- Add an `onExploreVibe` handler that navigates to `/?search=rooftop+bars+foodie+vibes` (using the top vibe label)
- Add a styled button below the Vibe DNA bars: "Explore {topVibe} spots near you" with a Search icon and ChevronRight
- Add a tappable area on each personality trait card that navigates with a trait-specific query
- Add an "Explore spots {character} would love" button in the character match section

**`src/components/HomePage.tsx`**
- On mount, read `search` param from URL (`useSearchParams`)
- If present, auto-populate the search input and trigger the unified search
- Clear the URL param after consuming it so back-navigation doesn't re-trigger

**`src/pages/Index.tsx`** (if needed)
- Ensure the tab switches to "home" when arriving with a search param

### Button Design
- Rounded pill style, subtle background (`bg-primary/10`)
- Icon on the left (Search or Sparkles), ChevronRight on the right
- Text like "Explore Foodie spots near you" or "Find spots for Night Owls"
- Smooth hover/tap animation

### No backend changes needed
All data (vibe labels, trait names, character names) is already available client-side. The search query is simply passed as a URL parameter.

