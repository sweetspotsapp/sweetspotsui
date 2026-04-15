

# Plan: Create AGENTS.md and CLAUDE.md Project Documentation

## What

Create two documentation files at the project root:
1. **AGENTS.md** — comprehensive project documentation for AI agents
2. **CLAUDE.md** — short file that points to AGENTS.md

## AGENTS.md Content Structure

### 1. Project Overview
- SweetSpots: AI-powered place discovery app ("tell us your mood, find matching places")
- Live URL: findyoursweetspots.com
- Tech stack: React 18 + TypeScript + Vite, Tailwind CSS + shadcn/ui, Supabase (auth, DB, edge functions, storage), Google Places API + Gemini AI

### 2. Architecture
- **Frontend**: SPA with persistent layout (tabs stay mounted via `display: none` toggle). 5-tab navigation: Home, Discover, Save, Trip, Profile
- **Backend**: Supabase (Lovable Cloud) — 24 edge functions, RLS-enabled tables, 3 storage buckets
- **Routing**: `PersistentLayout` wraps tabbed views; overlays (PlaceDetails, Settings, etc.) are lazy-loaded routes
- **State**: React Context (`AppContext`, `FeedbackContext`), React Query (5min stale, 30min GC), `AuthProvider`

### 3. Database Schema (12 tables)
- `places` (place_id PK), `profiles`, `saved_places`, `boards`, `board_places`, `searches`, `trips`, `shared_trips`, `trip_templates`, `place_interactions`, `query_cache`, `contact_submissions`, `search_feedback`, `user_roles`
- Key functions: `get_place_save_counts`, `has_role`, `generate_sweetspots_id`, `lookup_profile_by_sweetspots_id`
- Enum: `app_role` (admin, moderator, user)

### 4. Edge Functions Reference
List all 24 functions with one-line purpose. Note which have `verify_jwt = false`.

### 5. Storage Buckets
- `place-photos` — flat `{placeId}.jpg` structure
- `avatars` — user profile images
- `trip-documents` — private, RLS-protected trip attachments (10MB limit)

### 6. Key Patterns & Conventions
- Dark theme, flat/solid-fill aesthetic, `rounded-2xl`, `bg-muted/50`, no gradients/emojis/borders
- Brand color: orange. Pro identity: amber-500/600
- Guest access allowed (no auth required for search/save/trip)
- Google-First API pipeline with AI fallback
- Photo loading: storage-first strategy, 429 → 1x1 transparent fallback
- Search scoring: 50% AI, 25% distance, 10% profile, 10% quality, 5% behavioral
- Monetization: Free (5 searches/day, 3 trips/month), Pro ($5.99/mo unlimited)

### 7. Important Files
- `src/App.tsx` — root routing
- `src/components/PersistentLayout.tsx` — tab persistence
- `src/context/AppContext.tsx` — global state
- `src/hooks/useAuth.tsx` — authentication
- `src/integrations/supabase/client.ts` — DO NOT EDIT (auto-generated)
- `src/integrations/supabase/types.ts` — DO NOT EDIT (auto-generated)
- `supabase/config.toml` — edge function JWT config

### 8. Do NOT
- Edit `client.ts`, `types.ts`, or `.env` (auto-generated)
- Re-add removed features: 'Our Take' AI summaries, 'Scoped area' badges, Import Banner on Home
- Use gradients, decorative emojis, or borders
- Use non-English text

## CLAUDE.md
Single line: `See [AGENTS.md](./AGENTS.md) for full project documentation.`

## Files Changed
| File | Action |
|------|--------|
| `AGENTS.md` | Create |
| `CLAUDE.md` | Create |

