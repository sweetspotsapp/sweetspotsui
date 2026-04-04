

# Updated Production Audit: Add Real-Time Collaboration Section

## What's Missing

The current trip sharing system (`shared_trips` table) only supports **view-only** access. There's no real-time sync — when one user drags an activity, the other user doesn't see it. The `permission` column defaults to `'view'` and is never set to `'edit'`.

## What to Add to the Audit Document

### Real-Time Collaborative Itinerary Editing

**Current state:** Trips can be shared via email/SweetSpots ID, but recipients get read-only access. No presence indicators, no live cursors, no conflict resolution.

**What's needed:**

1. **Permission upgrade** — Allow `shared_trips.permission = 'edit'` so the sharer can grant edit access (not just view).

2. **Realtime sync via Postgres Changes** — Enable `supabase_realtime` on the `trips` table. When User A drags an activity, the `trip_data` JSONB column updates, and User B receives the change instantly via Supabase Realtime subscription.

3. **Presence indicators** — Use Supabase Realtime Presence to show who's currently viewing/editing the trip (avatars in the trip header, colored cursors or highlights on the activity card being dragged).

4. **Conflict resolution** — Since `trip_data` is a single JSONB blob, two simultaneous edits could clash. Strategy: last-write-wins with optimistic UI + toast notification ("Alex just moved Coffee Shop to Day 2").

5. **UI changes:**
   - Share dialog: toggle between "Can view" / "Can edit" permission
   - Trip header: show collaborator avatars with online status dots
   - Activity cards: subtle highlight when another user is dragging one
   - Change feed: small toast or log showing recent edits by collaborators

6. **Cost impact:** Realtime connections are low-cost (included in Supabase free tier up to 200 concurrent). No additional API calls — just WebSocket subscriptions.

## Plan: Regenerate the .docx

Update the existing `sweetspots-production-audit.docx` to add a new **Section 5: Real-Time Collaboration** covering the above, inserted after the current retention section. Also update the sprint roadmap to include collaboration in Sprint 3 or as a new Sprint 5.

### Files to modify
- **Generate updated `/mnt/documents/sweetspots-production-audit_v2.docx`** with the new collaboration section

### No code changes — document update only.

