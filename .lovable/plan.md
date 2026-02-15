

# Import Places from Social Media Links

## Overview
Add a "Paste a Link" feature to the Saved page that lets you import places from Instagram, TikTok, or Google Maps URLs. You paste a link, the app extracts the place name using AI, looks it up, and adds it to your saved spots.

## How It Works (User Experience)

1. On the Saved page, a new "Import Link" button appears (link/plus icon) in the header area
2. Tapping it opens a simple dialog with a text input for pasting a URL
3. After pasting and tapping "Import", the app shows a loading state ("Finding place...")
4. Once found, it shows the place name and a confirm button to save it
5. If not found, a friendly error message appears

## Technical Details

### 1. New Edge Function: `import-from-link`
**Path:** `supabase/functions/import-from-link/index.ts`

This function handles the full pipeline:
- **Input:** A URL (Instagram, TikTok, Google Maps, or any link mentioning a place)
- **Step 1:** Fetch the page content. For Instagram/TikTok, use a simple fetch with appropriate headers to get the page HTML/meta tags (og:title, og:description). No Firecrawl needed for meta tag extraction -- a direct fetch with the right user-agent can grab Open Graph metadata.
- **Step 2:** Send the extracted text to Lovable AI (Gemini Flash) with a prompt like: "Extract the place name and city from this social media post. Return JSON: {place_name, city, confidence}"
- **Step 3:** Use the Google Maps Places API (already available via `GOOGLE_MAPS_API_KEY`) to search for the extracted place name + city
- **Step 4:** Return the matched place details (name, place_id, address, lat, lng, photo) or an error if no match

### 2. New Component: `ImportLinkDialog`
**Path:** `src/components/saved/ImportLinkDialog.tsx`

A dialog/sheet with:
- URL input field with paste button
- States: idle, loading ("Extracting place..."), found (shows place preview card with Save button), error
- Supported URL validation (Instagram, TikTok, Google Maps patterns, or any URL)
- On successful import: calls `toggleSave(place_id)` via AppContext, shows success toast, closes dialog

### 3. Modifications to `SavedPage.tsx`
- Add an "Import" button in the header (next to Settings icon)
- Render the `ImportLinkDialog` component with open/close state
- Wire up the save flow using existing `toggleSave` from AppContext

### 4. Place Caching
- When a place is found via Google Maps API, the edge function upserts it into the `places` table (same pattern used by `unified-search` and `discover_candidates`)
- This ensures the place has photos, categories, and other enrichment data for display

### Files to Create
- `supabase/functions/import-from-link/index.ts` -- Edge function for link extraction + place lookup
- `src/components/saved/ImportLinkDialog.tsx` -- UI dialog component

### Files to Modify
- `src/components/SavedPage.tsx` -- Add import button + dialog state
- `supabase/config.toml` -- Add `[functions.import-from-link]` with `verify_jwt = false`

### No New Dependencies Required
- Uses existing Google Maps API key, Lovable AI gateway, and Supabase client
- No Firecrawl connector needed (direct fetch for meta tags is sufficient)

