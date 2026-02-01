
# Improve Save/Unsave UX for Better Clarity

## The Problem
Currently, when clicking the heart icon on a saved place, the dialog shows confusing options:
- "Remove entirely" appears even when the place is only in one location (All Saved)
- "Save to 1 Board" button is irrelevant when the user wants to unsave
- The flow doesn't match user expectations for a simple unsave action

## The Solution
Create a smarter, context-aware unsave flow:

1. **Immediate unsave for simple cases**: When a place is saved but NOT added to any specific boards, clicking the heart icon should immediately unsave with a success toast - no dialog needed

2. **Confirmation dialog for complex cases**: When a place IS in one or more boards, show a cleaner dialog asking what to do:
   - "Remove from X board(s) and unsave"
   - "Just remove from this board" (when opened from a specific board)
   - Option to deselect specific boards before confirming

3. **Cleaner button labels**: Replace confusing text with clear, action-oriented labels

## Implementation Details

### File Changes

| File | Change |
|------|--------|
| `src/components/saved/BoardView.tsx` | Update heart click handler to check board count before opening dialog |
| `src/components/saved/SaveToBoardDialog.tsx` | Redesign the footer section with context-aware buttons |
| `src/components/SavedPage.tsx` | Add logic to handle immediate unsave vs dialog flow |
| `src/hooks/useSavedPlaces.tsx` | Already shows toast on unsave (no changes needed) |

### New Dialog Behavior

**Scenario A: Place saved only to "All Saved" (no boards)**
- Heart click → Immediate unsave
- Show toast: "Removed from saved"
- No dialog opens

**Scenario B: Place is in 1 or more boards**
- Heart click → Open dialog
- Dialog shows:
  - List of boards (user can deselect to remove from specific boards)
  - "Remove from all boards & unsave" button (red, destructive)
  - "Update boards" button (only if user changed board selections)
  - Hide confusing "Save to X Boards" text when in removal mode

### UI Changes

**Before:**
```
[Family]  [ ]
[Date]    [✓]    ← already selected

[Remove entirely]     ← confusing
[Save to 1 Board]     ← irrelevant
```

**After:**
```
[Family]  [ ]
[Date]    [✓]    ← can uncheck to remove

[Remove from all & unsave]    ← only when place was already saved
[Done]                        ← saves current board selection
```

If user unchecks all boards:
```
[Family]  [ ]
[Date]    [ ]

[Remove from saved]   ← clear action
```

### Flow Diagram

```
User clicks heart on saved place
          |
          v
   Is place in any boards?
         / \
        /   \
       No    Yes
       |      |
       v      v
  Immediate   Open dialog
   unsave     with boards
       |           |
       v           v
  "Removed"    Show current
   toast       board memberships
                   |
                   v
             User can toggle
             boards on/off
                   |
                   v
             "Done" saves changes
             OR "Remove entirely"
             unsaves completely
```
