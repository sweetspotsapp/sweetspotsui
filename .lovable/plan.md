
## Implementation Plan: SweetSpots PRD v2.0 Alignment

Based on the gap analysis, here's a prioritized implementation plan to align the current codebase with the PRD requirements:

---

### Phase 1: Core Feature Gaps (High Priority)

#### 1.1 Homepage Restructure - 3 Fixed Sections
**Goal**: Transform the current category-based layout into the PRD-specified sections

**Changes**:
- Modify `HomePage.tsx` to display three distinct sections:
  1. **"Best for You"** - Top 4-6 places with highest composite scores
  2. **"What You Meant"** - Places that directly match the user's interpreted intent (show the AI's keyword translation)
  3. **"Explore Something Different"** - Nearby trending or category-adjacent recommendations
- Update `unified-search` to return results pre-grouped by these categories
- Add an "intent translation" display (e.g., "Showing results for: romantic dinner spots")

---

#### 1.2 Collaboration Feature (Collab-Lite)
**Goal**: Enable group decision-making on boards

**Database Changes**:
```sql
-- Board sharing table
CREATE TABLE board_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE NOT NULL,
  permission TEXT DEFAULT 'view', -- 'view' or 'vote'
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Voting table
CREATE TABLE board_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  voter_id UUID, -- Can be null for anonymous votes
  voter_name TEXT, -- For anonymous identification
  vote_type TEXT DEFAULT 'up', -- 'up' or 'down'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(board_id, place_id, voter_id)
);
```

**Frontend Components**:
- `ShareBoardDialog.tsx` - Generate and copy share links
- `SharedBoardView.tsx` - Public view for shared boards (no auth required)
- `VoteButton.tsx` - Upvote/downvote UI on place cards
- Update `BoardView.tsx` to show vote counts and "Top Picks" sorting

**New Edge Function**:
- `share-board/index.ts` - Handle share link generation and validation

---

#### 1.3 Quick Itinerary (Lite)
**Goal**: Transform saved places into a time-based plan

**Database Changes**:
```sql
CREATE TABLE itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  board_id UUID REFERENCES boards(id),
  name TEXT NOT NULL,
  duration_minutes INTEGER, -- e.g., 180 for "3-hour plan"
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE itinerary_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  estimated_duration_minutes INTEGER DEFAULT 60,
  notes TEXT
);
```

**New Edge Function**:
- `generate-itinerary/index.ts` - AI-powered route optimization
  - Input: Board places + user location + time constraint
  - Output: Ordered stops with ETAs and suggested durations

**Frontend Components**:
- `ItineraryButton.tsx` - "Generate Tonight Plan" CTA in BoardView
- `ItineraryView.tsx` - Timeline display with reorderable stops
- `ItineraryStopCard.tsx` - Individual stop with time + place info

---

### Phase 2: Board Enhancements (Medium Priority)

#### 2.1 Add Notes to Saved Places
**Database Changes**:
```sql
ALTER TABLE board_places ADD COLUMN notes TEXT;
ALTER TABLE board_places ADD COLUMN position INTEGER;
```

**Frontend Changes**:
- Add note icon to place cards in `BoardView.tsx`
- Create `PlaceNoteEditor.tsx` modal for editing notes
- Display notes inline or on expand

---

#### 2.2 Place Reordering
**Frontend Changes**:
- Integrate drag-and-drop library (e.g., `@dnd-kit/core`)
- Add position tracking to board places
- Update positions on drag end

---

### Phase 3: Polish & Optimization (Lower Priority)

#### 3.1 Enhanced Filter System
- Add more vibe-specific filters matching `VALID_FILTER_TAGS`
- Implement multi-select filter chips
- Add "Open Now" toggle filter

#### 3.2 Onboarding Value Prop Screen
- Add initial splash screen before location input
- Include the tagline: "Tell us your vibe. We'll give you the right plan in seconds."

---

### Implementation Order

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | Homepage Restructure | 3-section layout, intent display |
| 2 | Collaboration DB + Backend | Share tables, edge function |
| 3 | Collaboration Frontend | Share dialog, shared board view, voting |
| 4 | Quick Itinerary Backend | Generate-itinerary edge function |
| 5 | Quick Itinerary Frontend | Timeline view, stop cards |
| 6 | Board Enhancements | Notes, reordering |
| 7 | Polish | Filters, onboarding, testing |

---

### Success Metrics Alignment

The PRD defines these targets:
- **Searches/session**: >= 3 (current architecture supports this)
- **Save rate**: >= 40% (boards + save UI in place)
- **Board creation**: >= 2 per active user (needs collaboration to drive this)
- **Vote interaction**: >= 20% of shared boards (requires collab feature)
- **7-day return rate**: >= 25% (itinerary + collab should improve)

Collaboration and Itinerary features are **critical** for meeting the vote interaction and return rate metrics.
