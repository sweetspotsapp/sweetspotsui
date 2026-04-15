# SweetSpots — AI Agent Documentation

> AI-powered place discovery app. Tell us your mood, and we'll find places that match your vibe.

**Live:** https://www.findyoursweetspots.com

---

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite 5
- **Styling:** Tailwind CSS v3 + shadcn/ui
- **Backend:** Supabase (Lovable Cloud) — auth, PostgreSQL, edge functions, storage
- **APIs:** Google Places API (New), Google Maps, Gemini AI (via Lovable AI Gateway)
- **Payments:** Stripe (Pro subscription $5.99/mo)

---

## Architecture

### Frontend

Single-page app with **persistent tabbed layout**. Tabs stay mounted via `display: none` toggle to preserve scroll position, search results, and component state across navigation.

**5-tab navigation:** Home · Discover · Save · Trip · Profile

- `PersistentLayout.tsx` wraps the tabbed `Index` page; overlay routes (PlaceDetails, Settings, etc.) render on top
- State managed via React Context (`AppContext`, `FeedbackContext`) and React Query (5min stale, 30min GC)
- Responsive breakpoint at `1024px` (lg) — bottom nav on mobile, top nav on desktop
- Max content width: `max-w-7xl`

### Backend

All backend functionality runs through Supabase (Lovable Cloud):
- 24 Edge Functions (Deno) — mostly `verify_jwt = false` for guest access
- PostgreSQL with RLS on all tables
- 3 storage buckets

### Auth

- Guest access allowed — unauthenticated users can search, save, and create trips
- Email/password + Google OAuth sign-up
- Auth state via `useAuth` hook wrapping Supabase Auth
- Roles stored in `user_roles` table (not on profiles), checked via `has_role()` security definer function

---

## Database Schema

### Tables (14)

| Table | PK | Purpose |
|-------|-----|---------|
| `places` | `place_id` (text) | Cached place data from Google Places API + AI enrichment |
| `profiles` | `id` (uuid, refs auth.users) | User profiles, preferences, vibe settings |
| `saved_places` | `id` (uuid) | User's saved places (refs `places.place_id`) |
| `boards` | `id` (uuid) | Named collections/boards for organizing saves |
| `board_places` | `id` (uuid) | Many-to-many: boards ↔ places |
| `searches` | `id` (uuid) | Search history log |
| `trips` | `id` (uuid) | Generated trip itineraries with full trip_data JSON |
| `shared_trips` | `id` (uuid) | Trip sharing/collaboration records |
| `trip_templates` | `id` (uuid) | Pre-built trip templates for one-tap generation |
| `place_interactions` | `id` (uuid) | Behavioral tracking (save=3, click=1, unsave=-2) |
| `query_cache` | `cache_key` (text) | 7-day search result cache |
| `contact_submissions` | `id` (uuid) | Support form submissions |
| `search_feedback` | `id` (uuid) | User feedback on search quality |
| `user_roles` | `id` (uuid) | Role assignments (admin/moderator/user) |

### Key Functions

- `get_place_save_counts(place_ids text[])` — aggregate save counts for social proof
- `has_role(_user_id uuid, _role app_role)` — security definer for RLS role checks
- `generate_sweetspots_id()` — generates unique user-facing IDs
- `lookup_profile_by_sweetspots_id(lookup_id text)` — find users by SweetSpots ID
- `clean_expired_cache()` — purge stale query cache entries

### Enum

- `app_role`: `admin` | `moderator` | `user`

---

## Edge Functions

All functions use `Deno.serve`. Most have `verify_jwt = false` in `supabase/config.toml` for guest access.

| Function | Purpose |
|----------|---------|
| `unified-search` | Main search pipeline — AI keyword translation → Google Places → scoring/ranking |
| `discover_candidates` | Discovery feed candidates |
| `rank_with_travel_time` | Re-rank results by travel time |
| `suggest-places` | Board-based place suggestions (centroid + vibe query) |
| `recommend-for-you` | Personalized home recommendations from saved places |
| `enrich-places` | Fetch additional photos/details from Google Places |
| `place-photo` | Proxy for Google Place Photos (storage-first caching) |
| `place-autocomplete` | Proxy for Google Places Autocomplete (`(regions)` filter) |
| `street-view` | Google Street View metadata/imagery proxy |
| `get-maps-key` | Securely serve Google Maps API key to frontend |
| `compute-routes` | Google Routes API proxy for travel time/distance |
| `batch-geocode` | Batch geocoding for trip activities |
| `generate-trip` | AI trip itinerary generation (Gemini) |
| `swap-trip-activity` | Replace a single trip activity via AI |
| `trip-weather` | OpenWeatherMap 7-day forecast |
| `summarize-prompt` | Parse natural language into structured trip params |
| `import-from-link` | Import places from Instagram/TikTok/Google Maps URLs |
| `character-match` | AI personality/character matching |
| `find-user-by-email` | Look up user for trip sharing |
| `notify-trip-shared` | Send trip share notifications |
| `check-subscription` | Verify Stripe Pro subscription status |
| `create-checkout` | Create Stripe checkout session |
| `customer-portal` | Stripe customer billing portal |
| `admin-revenue` | Admin dashboard revenue metrics |

---

## Storage Buckets

| Bucket | Access | Structure |
|--------|--------|-----------|
| `place-photos` | Public | Flat `{placeId}.jpg` — cached Google Place photos |
| `avatars` | Public | User profile images |
| `trip-documents` | Private (RLS) | Trip attachments, 10MB limit, 1hr signed URLs |

---

## Key Patterns & Conventions

### Design System

- **Theme:** Dark mode, flat/solid-fill aesthetic
- **Shapes:** `rounded-2xl`, `bg-muted/50` backgrounds
- **No:** gradients, decorative emojis, borders, outlines
- **Brand color:** Orange (active states, navigation)
- **Pro identity:** `amber-500` / `amber-600`
- **Language:** English only — all UI text must be in English
- **Semantic tokens:** Always use CSS variables from `index.css` and `tailwind.config.ts` — never hardcode colors

### Search Pipeline

1. User enters mood/vibe text
2. AI translates to search keywords (skip if ≤2 words)
3. Google Places Text Search (New) with location bias
4. Score: 50% AI relevance, 25% distance, 10% profile match, 10% quality, 5% behavioral
5. Cache results for 7 days in `query_cache`
6. Max 30 results per search

### Photo Loading

Storage-first strategy: check Supabase bucket → fall back to Google Place Photos API → on 429, return 1x1 transparent PNG fallback.

### Monetization

- **Free:** 5 searches/day, 3 trips/month
- **Pro ($5.99/mo):** Unlimited searches and trips
- Limits enforced via `useSearchLimit` and `useTripLimit` hooks
- Upgrade prompts via `UpgradeModal` component

---

## Important Files

| File | Role |
|------|------|
| `src/App.tsx` | Root routing and providers |
| `src/pages/Index.tsx` | Main tabbed interface |
| `src/components/PersistentLayout.tsx` | Tab persistence via display toggle |
| `src/context/AppContext.tsx` | Global app state (location, tab, search) |
| `src/context/FeedbackContext.tsx` | Feedback widget state |
| `src/hooks/useAuth.tsx` | Auth provider and hook |
| `src/hooks/useSearch.tsx` | Search logic and state |
| `src/hooks/useBoards.tsx` | Board CRUD operations |
| `src/hooks/useTrip.tsx` | Trip management |
| `src/hooks/useSavedPlaces.tsx` | Save/unsave logic |
| `src/hooks/useVibeDNA.tsx` | Vibe DNA personality calculation |
| `src/lib/placeUtils.ts` | Place data utilities |
| `src/lib/photoLoader.ts` | Photo URL resolution |
| `supabase/config.toml` | Edge function JWT settings |

---

## Do NOT

- **Edit auto-generated files:** `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`
- **Re-add removed features:** 'Our Take' AI summaries, 'Scoped area' badges, Import Banner/floating '+' on Home tab
- **Use:** gradients, decorative emojis, borders/outlines, non-English text
- **Store roles on profiles table** — always use `user_roles` table
- **Use anonymous sign-ups** — always use email/password or Google OAuth
- **Hardcode colors in components** — use semantic design tokens

---

## Testing Notes

- To test the home page: if you land on the onboarding screen, click "Continue as guest"
- Select a place and click next, then input vibes to proceed
- Guest users can access all main features without signing in
