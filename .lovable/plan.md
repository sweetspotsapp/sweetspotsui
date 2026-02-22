

## Inline Destination Autocomplete

Replace the destination button (which opens a separate LocationPickerModal) with an inline text input that shows autocomplete suggestions directly within the itinerary creation modal.

### Changes

**File: `src/components/itinerary/CreateItineraryModal.tsx`**

1. Remove the `LocationPickerModal` import and its rendering at the bottom of the component.
2. Remove the `showLocationPicker` state variable.
3. Remove the `onOpenLocationPicker` prop passed to `Step1Content`.
4. In `Step1Content`, replace the destination button with:
   - An inline text input field (same styling as the Trip Name input) with a MapPin icon.
   - Use the `usePlaceAutocomplete` hook with the destination input value.
   - Show autocomplete predictions in a dropdown list directly below the input (positioned with `absolute`, matching the style from `LocationPickerModal`).
   - When a prediction is selected, set the destination value and close the dropdown.
   - Include a "Nearby places" option at the bottom of the dropdown using the Navigation icon.
5. Update `Step1Props` interface: remove `onOpenLocationPicker`, add `setDestination` usage for direct typing.

**File: `src/components/itinerary/TripSetupForm.tsx`**

Apply the same changes:
1. Remove the `LocationPickerModal` import and rendering.
2. Remove `showLocationPicker` state.
3. Replace the destination button with an inline autocomplete input using `usePlaceAutocomplete`.
4. Show predictions dropdown inline below the input field.
5. Include "Nearby places" option.

### Technical Details

- Import `usePlaceAutocomplete` from `@/hooks/usePlaceAutocomplete` in both files.
- Add a local `showSuggestions` state to control dropdown visibility.
- The predictions dropdown uses `absolute` positioning with `z-20`, rounded corners, and shadow matching existing UI patterns.
- Clicking outside or selecting a prediction closes the dropdown.
- The input field matches existing form field styling (rounded-xl, bg-card, border-border).
- No new dependencies required -- reuses the existing `usePlaceAutocomplete` hook.

