

# Critical Assessment: 8 Feature Suggestions

## Current State Summary
SweetSpots is a vibe-based travel discovery + itinerary builder. You have: Home (trip dashboard), Discover (search), Saved, Trip, Profile tabs. Trip templates exist in DB. Sharing works via SweetSpots ID/email. Free tier = 5 searches/day. No payments. No public pages.

---

## Feature-by-Feature Verdict

### 1. Stripe Integration (Subscription + Credits)
**Verdict: DO IT — High priority, directly enables revenue**

You already have the limit infrastructure (`useSearchLimit`, `FREE_DAILY_LIMIT = 5`). Stripe is natively supported in Lovable. This wires up real money to your existing freemium gates.

- Create a Pro plan ($5.99/mo) that unlocks unlimited searches + more trip generations
- Add trip credit packs as one-off purchases
- Pricing page at `/pricing`
- ~3-4 implementation steps using Lovable's Stripe tooling

### 2. Pricing Page
**Verdict: BUNDLE with #1 above — it's just the UI for Stripe**

Simple page showing Free vs Pro comparison. Links to Stripe checkout. Not a separate task.

### 3. Smart Trip Prefill from Saved Spots
**Verdict: DO IT — Medium priority, good UX**

You already have `useSavedPlaces`, `board_places`, and the trip creation modal accepts `must_include_place_ids`. The plumbing exists. Just need:
- Query saved spots by destination city (parse address field)
- Auto-populate `must_include_place_ids` when creating a trip for a city where user has saves
- ~1 step, mostly logic in CreateTripModal

### 4. "Build Trip" Nudge After 3+ Saves
**Verdict: ALREADY PARTIALLY EXISTS — just needs threshold adjustment**

You have the "Plan-It Nudge" on Home that triggers at 5+ saves in a city. Lower it to 3, or add a toast/banner after the 3rd save action. Minimal work.

### 5. Shareable Trip Cards with OG Images
**Verdict: SKIP FOR NOW — low ROI at current stage**

This requires server-side rendering or an edge function that generates OG images (using something like Satori/Vercel OG). It's cool but:
- You don't have public trip pages yet (see #6)
- No organic traffic to benefit from OG cards
- Complex to build properly
- Better after you have public pages + actual users sharing

### 6. Public Trip Pages (SEO-indexed)
**Verdict: DEFER — needs architectural thought**

Currently trips are behind auth (`auth.uid() = user_id` RLS). Making them public requires:
- A new `is_public` flag on trips table
- New RLS policy for anonymous SELECT on public trips
- A `/trip/:id` public route (currently doesn't exist)
- SSR/prerendering for SEO (Vite SPA = poor SEO without workarounds)
- The SPA architecture makes true SEO indexing hard without a prerender service

Not impossible, but the SEO part is a rabbit hole. Better to focus on core product first.

### 7. "Spots You Might Like" Recommendations on Home
**Verdict: DO IT — Medium priority, great engagement driver**

You have `place_interactions` table tracking saves/views, `find-similar-vibes` edge function, and user vibe profiles. The data is there. Implementation:
- Query user's saved place categories/vibes
- Call `find-similar-vibes` or a simple DB query for places with matching `filter_tags`
- Show 4-6 cards in a horizontal scroll on Home
- ~2 steps

### 8. Realtime Trip Sync + Conflict Resolution
**Verdict: SKIP — premature optimization**

Your memory notes say this is Sprint 4. You don't have collaborative editing yet, and shared trips are view-only. Building realtime sync before you have paying users collaborating is over-engineering. The `last-write-wins` model you've planned is fine, but there's no user demand yet.

---

## Recommended Priority Order

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 1 | **Stripe + Pricing Page** | Medium | Enables revenue |
| 2 | **"Spots You Might Like" on Home** | Small | Engagement + stickiness |
| 3 | **Smart Trip Prefill from Saves** | Small | Better conversion to trips |
| 4 | **Lower "Build Trip" nudge to 3 saves** | Tiny | Quick win |
| -- | OG images, public pages, realtime | -- | Defer until post-launch |

### What I'd build next
**Stripe + Pricing Page** first — it's the one that turns usage into revenue. Everything else is optimization. Want me to start with that?

