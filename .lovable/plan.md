
# Fix Natural Language Detection for Search Queries

## The Problem
Searches like "chill vibes, outdoor" return **zero results** because:
1. The prompt is incorrectly classified as "keyword-like" due to the 3-word limit
2. The word "vibes" (plural) isn't detected as a conversational pattern (only "vibe" singular is)
3. Google Places API doesn't understand mood words like "chill" or "vibes" - it needs concrete terms like "cafe outdoor seating relaxed"

## Root Cause Analysis

```
User types: "chill vibes, outdoor"
                    ↓
Split by spaces: ["chill", "vibes,", "outdoor"] = 3 words
                    ↓
Pattern check: /\bvibe\b/ does NOT match "vibes,"
                    ↓
Result: isAlreadyKeywords = TRUE (incorrectly!)
                    ↓
Google receives: "chill vibes, outdoor" → 0 results
```

## The Solution
Expand the natural language detection to:
1. Add plural forms (vibes, moods, feels)
2. Add common mood words (chill, cozy, relaxing, fun, etc.)
3. Remove the strict 3-word limit in favor of smarter detection

## File Changes

| File | Change |
|------|--------|
| `supabase/functions/unified-search/index.ts` | Improve the `translatePromptToKeywords` function |

## Code Changes

### Updated Detection Logic

**Before:**
```typescript
const conversationalPatterns = /\b(where|what|...vibe...)\b/i;

const isAlreadyKeywords = 
  prompt.split(' ').length <= 3 && 
  !conversationalPatterns.test(prompt) &&
  !personalPronouns.test(prompt);
```

**After:**
```typescript
// Mood/vibe words that Google doesn't understand well
const moodWords = /\b(chill|vibes?|cozy|relaxing|romantic|fun|lively|trendy|quiet|peaceful|aesthetic|cute|fancy|casual|hipster|artsy|authentic|hidden|local)\b/i;

// Conversational patterns (expanded)
const conversationalPatterns = /\b(where|what|how|can|should|want|wanna|need|looking|find|get|take|go|somewhere|place|spot|feel|feeling|i'm|im|i am|tonight|today|right now|mood|craving|bored|hungry|tired)\b/i;

// ALWAYS translate if prompt contains mood words
// because Google doesn't understand "chill" or "vibes"
const containsMoodWords = moodWords.test(prompt);

// Skip translation only if:
// 1. Very short AND no mood words AND no conversational patterns
const isAlreadyKeywords = 
  prompt.split(' ').length <= 2 &&   // Even stricter
  !containsMoodWords &&               // NEW: catch mood words
  !conversationalPatterns.test(prompt) &&
  !personalPronouns.test(prompt);
```

### Expected Result

```
User types: "chill vibes, outdoor"
                    ↓
Mood word check: /\bchill\b/ matches → containsMoodWords = TRUE
                    ↓
isAlreadyKeywords = FALSE → Translate!
                    ↓
AI translates: "cafe park outdoor seating lounge relaxed"
                    ↓
Google receives proper keywords → Results returned!
```

## Testing

After implementation, the same search should:
1. Log: `Translating natural language to keywords...`
2. Log: `Translated: "chill vibes, outdoor" → "cafe lounge park outdoor seating"`
3. Return actual places from Google
