

# Settings: Change Email, Change Password, Remove Toggle, Wire Recommendations

## Changes

### 1. Settings.tsx — Add Change Email dialog
- Click the Email row → open a Dialog with a single "New email" input + Save button
- On save: call `supabase.auth.updateUser({ email: newEmail })`
- Show toast: "Check both your old and new email to confirm the change"

### 2. Settings.tsx — Add Change Password dialog
- Click the Password row → open a Dialog with "New password" + "Confirm password" inputs
- Validate match, min 6 chars
- On save: call `supabase.auth.updateUser({ password: newPassword })`
- Show success toast

### 3. Settings.tsx — Remove "New Places Nearby" toggle
- Delete the entire row (lines 274-286) and the preceding Separator
- Keep `newPlaces` in the interface/defaults so existing DB values don't break on load

### 4. Wire Personalized Recommendations toggle
- In `HomePage.tsx`, fetch the user's `notification_settings` from the profile (already fetched via `useProfileInfo` or a direct query)
- Before the recommend-for-you fetch, check if `recommendations` is `false` → skip the fetch
- Before rendering the "Spots You Might Like" section, check the same flag → hide if disabled

### Files to modify
- `src/pages/Settings.tsx` — add two Dialog components for email/password, remove "New Places Nearby" row
- `src/components/HomePage.tsx` — read `notification_settings.recommendations` from profile, conditionally skip fetch and hide section

### No database changes needed

