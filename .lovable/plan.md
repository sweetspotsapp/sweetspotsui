

# SweetSpots — Full App Audit & Best Practice Analysis

---

## 1. What SweetSpots Is

SweetSpots is a **vibe-based travel discovery and trip planning app**. Instead of traditional keyword search, users describe their mood ("cozy coffee shop with good vibes") and get AI-curated place recommendations. The app covers the full traveler lifecycle: discover → save → organize → plan trips.

**Core value proposition**: "Find places that feel right" — emotion-driven discovery vs. Yelp/Google's utility-driven search.

---

## 2. Feature Inventory & Status

| Feature | Status | Notes |
|---------|--------|-------|
| **Onboarding** (location + mood wizard) | Working | 3-step: welcome → location → mood. Guest mode available |
| **Vibe-based search** (Discover tab) | Working | AI-powered via `unified-search` edge function, Google Places backend |
| **Place details** | Working | Rich: photos, reviews, insider tips, signature items, popular times, street view |
| **Save to boards** | Working | Board CRUD, save/unsave, import from social media links |
| **Trip planning** | Working | AI-generated multi-day itineraries via `generate-trip`, swap activities |
| **Trip sharing** | Working | Invite by email, pending invites, shared trip access |
| **Profile / Vibe DNA** | Working | Personality analysis from saved places, character match |
| **Personalized recommendations** | Working | `recommend-for-you` edge function, based on saved places |
| **Subscription (Pro)** | Working | Stripe integration, $5.99/mo, search limits for free tier (5/day) |
| **Settings** | Working | Change email/password, notification toggles, subscription management |
| **Map view** | Working | Mapbox-powered, shows all saved places |
| **Import from social** | Working | Paste TikTok/Instagram/Google Maps links → extract places |
| **Trip templates** | Working | Pre-built itineraries (Tokyo, Bali, Melbourne, Bangkok) |

---

## 3. User Flows Analysis

**Flow 1: New User → First Discovery**
Welcome → Pick location → Enter mood → Loading → Home (with quick actions) → Discover tab → Search → View place → Save

**Flow 2: Returning User → Trip Planning**
Home (upcoming trip card, recently saved) → Trip tab → Create trip → AI generates itinerary → Edit/swap activities → Share

**Flow 3: Social Import**
Saved tab → Add a Spot → Paste link → AI extracts place → Save to board

All flows are well-connected. The guest-to-auth transition is smooth with `LoginReminderBanner` prompts.

---

## 4. What's Working Well (Keep)

1. **Vibe-based search differentiator** — genuinely unique UX, not a Yelp clone
2. **Persistent tab navigation** — CSS display toggle prevents re-renders, preserves scroll/state
3. **ErrorBoundary on every tab** — graceful degradation
4. **Caching layer** in `unified-search` (database-backed `query_cache` with TTL)
5. **Freemium model** — 5 free searches/day, Pro unlocks unlimited
6. **Social import** — real differentiator for user acquisition
7. **Rich place details** — insider tips, signature items, popular times, street view
8. **Board organization** — clean board CRUD with color coding
9. **Profile / Vibe DNA** — engagement driver, shareable identity
10. **Trip sharing with invites** — collaborative feature with proper RLS

---

## 5. What Needs Improvement

### A. Security Issues (Critical)

1. **Hardcoded admin user IDs** in `useSearchLimit.tsx` (line 6). This is a client-side admin check — easily bypassed. Should use a server-side `user_roles` table.
2. **All edge functions have `verify_jwt = false`** — functions like `generate-trip`, `recommend-for-you`, `check-subscription` should validate JWT in code. Some do, but this should be audited function by function.
3. **No rate limiting on edge functions** — `unified-search` costs $0.08/call (Google API). A bad actor could burn through your API budget.
4. **`find-user-by-email` has `verify_jwt = false`** — potential user enumeration vulnerability.

### B. Performance Issues

5. **`window.location.href` for navigation** (HomePage lines 231, 271) — causes full page reload instead of React Router navigation. Should use `navigate()` from `useNavigate()`.
6. **`useLocation` hook auto-requests GPS on every mount** — this fires on every component that uses it, which is wasteful. Should be lifted to a provider.
7. **No image lazy loading strategy** — place photos load eagerly in horizontal scrollers.
8. **Trip templates fetch on every Home mount** — should be cached in React Query or fetched once.

### C. UX / Product Issues

9. **MapPage is NOT in the bottom nav** — it exists as a component but is orphaned. The 4-tab nav (Home, Discover, Saved, Trip) has no Map tab, yet the map is a key feature.
10. **No offline support / PWA** — the app has PWA meta tags in `index.html` but no service worker, no `vite-plugin-pwa`.
11. **No loading skeleton for Home page** — the page loads in stages (templates, saves, recommendations) but shows nothing during initial load.
12. **No deep linking** — `/?tab=discover` works but there's no `/discover`, `/saved`, `/trip` route — sharing specific tabs is awkward.
13. **OG image is Lovable's default** — `og:image` points to `lovable.dev/opengraph-image-p98pqg.png`. Needs custom branding.
14. **No 404 handling for `/place/:placeId`** — if a place doesn't exist in the DB, the page likely shows a broken state.

### D. Code Quality

15. **Large monolithic components** — `DiscoverPage.tsx` (760 lines), `TripPage.tsx` (807 lines), `PlaceDetails.tsx` (876 lines), `ProfilePage.tsx` (1105 lines). Should be decomposed.
16. **Mixed state management** — `AppContext` + local state + `useBoards` + `useTrip` + React Query. No clear pattern.
17. **No TypeScript strict mode** — `as any` casts throughout (e.g., `trip_templates as any`).
18. **No test coverage** — zero unit or integration tests.

### E. Monetization

19. **Search limit is client-side only** — `useSearchLimit` counts searches on the client. A user could bypass this by clearing localStorage or making direct API calls. The limit should be enforced server-side in the `unified-search` function.

---

## 6. Should You Go to App Store Now?

**Short answer: Not yet. Here's why:**

### Must-Have Before App Store
| Item | Why | Effort |
|------|-----|--------|
| Fix security issues (admin check, rate limiting) | App Store reviewers + real users | 2-3 days |
| Add PWA / service worker | Required for "Add to Home Screen" install prompt | 1 day |
| Custom OG images + branding | Professional appearance | 0.5 day |
| Server-side search limit enforcement | Prevent abuse | 1 day |
| Fix `window.location.href` navigation bugs | Broken UX on iOS | 0.5 day |
| Error handling for missing places | Crash prevention | 0.5 day |

### Nice-to-Have Before Launch
| Item | Why | Effort |
|------|-----|--------|
| Push notifications (FCM/APNs) | Retention driver | 3-5 days |
| Component decomposition | Maintainability | 2-3 days |
| Basic test suite | Confidence in shipping | 2-3 days |
| Analytics (Mixpanel/PostHog) | Understand user behavior | 1 day |

### Recommended Launch Path
```text
Week 1: Security fixes + PWA setup + server-side limits
Week 2: Polish (OG images, navigation fixes, error states)
Week 3: Beta launch as PWA (installable from browser)
Week 4: Collect feedback, iterate
Week 5-6: If traction warrants it, wrap in Capacitor for App Store
```

**PWA first, native later** is the industry best practice for your stage. You avoid App Store review delays, iterate faster, and validate product-market fit. Only invest in native (Capacitor) once you have 500+ active users and need push notifications or native APIs.

---

## 7. Summary Scorecard

| Category | Score | Notes |
|----------|-------|-------|
| **Product vision** | 9/10 | Clear differentiator, well-defined user journey |
| **Feature completeness** | 8/10 | Core loop is solid, missing push notifs + offline |
| **UI/UX quality** | 8/10 | Clean, modern, good animations. Some layout bugs |
| **Security** | 5/10 | Client-side admin check, no rate limiting, JWT bypasses |
| **Performance** | 7/10 | Caching is good, but full-page reloads and unnecessary re-fetches |
| **Code quality** | 6/10 | Large files, inconsistent patterns, no tests |
| **Monetization** | 7/10 | Good model, but limits are client-side enforceable |
| **Launch readiness** | 6/10 | Needs security + PWA + branding before public launch |

**Overall: Strong product, needs 1-2 weeks of hardening before public launch.**

