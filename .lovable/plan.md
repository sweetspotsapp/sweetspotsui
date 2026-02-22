

## Fix: Destination Field Overlap and Stale Form Data

### Issue 1: Destination Icon/Text Overlap
The Input element has conflicting padding classes: `pl-11` and `px-4`. The `px-4` shorthand overrides the left padding, causing text to render behind the MapPin icon.

**Fix:** Change `px-4` to `pr-4` so the left padding (`pl-11`) is preserved.

**File:** `src/components/itinerary/CreateItineraryModal.tsx` (line 349)

---

### Issue 2: Form Fields Not Resetting for New Itinerary
When opening the modal without `initialParams` (i.e., creating a new itinerary), the `useEffect` on lines 69-85 only resets fields when `initialParams` is truthy. This means all previous values remain in the form.

**Fix:** Add an `else` branch that resets all fields to their defaults when `initialParams` is null/undefined.

**File:** `src/components/itinerary/CreateItineraryModal.tsx` (lines 69-85)

Fields to reset:
- name to ""
- destination to ""
- startDate to undefined
- endDate to undefined
- hasEndDate to false
- vibes to []
- customVibe to ""
- budget to "$$"
- totalBudget to ""
- useTotalBudget to false
- budgetCurrency to "USD"
- budgetIsPerPerson to true
- groupSize to 2
- mustIncludePlaceIds to []
- boardIds to []

### Also fix in TripSetupForm.tsx
Apply both fixes (padding and form reset) to `src/components/itinerary/TripSetupForm.tsx` if the same patterns exist there.

