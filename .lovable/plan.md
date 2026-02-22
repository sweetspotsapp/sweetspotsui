

## Rename "Itinerary" to "Trip" (User-Facing Text Only)

This is a text-only change across multiple files. No file renames, no variable renames -- just updating the labels and strings users see in the UI.

### Changes by File

**1. `src/components/BottomNav.tsx`**
- Bottom nav label: "Itinerary" --> "Trip"

**2. `src/components/ItineraryPage.tsx`**
- Empty state heading: "No itineraries yet" --> "No trips yet"
- Empty state subtext: "AI-powered itineraries" --> "AI-powered trip plans"
- Empty state button: "Create Your First Itinerary" --> "Create Your First Trip"
- New button: "New Itinerary" --> "New Trip"

**3. `src/hooks/useItinerary.tsx`**
- Toast messages:
  - "Itinerary updated" --> "Trip updated"
  - "Itinerary saved locally" --> "Trip saved locally"
  - "Itinerary saved" --> "Trip saved"
  - "Could not save itinerary." --> "Could not save trip."
  - "Itinerary deleted" --> "Trip deleted"
  - "Could not generate your itinerary." --> "Could not generate your trip."

**4. `src/components/itinerary/GeneratingOverlay.tsx`**
- Loading text: "Generating your itinerary..." --> "Generating your trip..."

**5. `src/components/itinerary/ItineraryView.tsx`**
- Editing mode banner: "...rearrange your itinerary." --> "...rearrange your trip."

**6. `src/components/itinerary/BrowseForItinerary.tsx`**
- Button text: "Add X Spots to Itinerary" --> "Add X Spots to Trip"

**7. `src/components/itinerary/TripSetupForm.tsx`**
- Generate button text: "Generate Itinerary" --> "Generate Trip"

### What stays unchanged
- All file names (e.g. `ItineraryPage.tsx`, `useItinerary.tsx`)
- All variable/type/interface names (e.g. `ItineraryData`, `savedItineraries`)
- All route paths (e.g. `/itinerary`)
- Internal tab ID value (`"itinerary"`)
- Database table name (`itineraries`)

### Technical Details

| File | Type of change |
|------|---------------|
| `src/components/BottomNav.tsx` | 1 label string |
| `src/components/ItineraryPage.tsx` | 4 UI strings |
| `src/hooks/useItinerary.tsx` | 6 toast message strings |
| `src/components/itinerary/GeneratingOverlay.tsx` | 1 loading string |
| `src/components/itinerary/ItineraryView.tsx` | 1 banner string |
| `src/components/itinerary/BrowseForItinerary.tsx` | 1 button string |
| `src/components/itinerary/TripSetupForm.tsx` | 1 button string |
