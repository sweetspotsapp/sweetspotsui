

# Make Trip Summary Wording More Casual

The summary text (shown in the screenshot) reads very formally — "A high-altitude and water-based adventure entirely focused on chasing the perfect southern hemisphere sunset and golden hour views across Melbourne." The user wants a more relaxed, conversational tone.

## Changes

**File: `supabase/functions/generate-trip/index.ts`**

Update the summary tone instructions in three places:

1. **Tool schema `summary` description** (line 76) — instruct the AI to write in a casual, friendly tone like talking to a friend. Example: "Chasing sunsets across Melbourne — rooftop golden hours, waterfront views, and zero alarms."

2. **Main prompt** (around line 64) — replace the formal summary instruction with a casual tone directive: "Write the summary like you're texting a friend about the trip — keep it short, warm, and conversational. No formal language."

3. **System prompt** (line 131) — add a tone note: "Write all copy in a casual, warm tone — like a well-traveled friend giving advice, not a travel brochure."

This requires redeploying the `generate-trip` edge function.

