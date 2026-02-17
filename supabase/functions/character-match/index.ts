import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { vibeBreakdown, personalityTraits } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const vibeDescription = vibeBreakdown
      .map((v: { label: string; percentage: number }) => `${v.label} ${v.percentage}%`)
      .join(", ");

    const traitsDescription = personalityTraits
      .map((t: { label: string; description: string }) => `${t.label}: ${t.description}`)
      .join("; ");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You match people to famous characters based on their personality and vibe preferences. Return exactly 1 match.

CRITICAL RULES:
- ONLY pick characters that are UNIVERSALLY recognizable — household names that almost anyone on the planet would know. Think: Leonardo DiCaprio, Beyoncé, Harry Potter, James Bond, Oprah, Batman, Gordon Ramsay, Taylor Swift, Indiana Jones, Frida Kahlo, etc.
- NO obscure actors, niche TV hosts, or lesser-known figures. If you have to explain who they are, they're not famous enough.
- Mix from movies, TV, music, sports, history — but they must be ICONIC.
- Be creative, fun, and surprising in your reasoning.

You MUST respond using the tool provided.`,
          },
          {
            role: "user",
            content: `My vibe DNA: ${vibeDescription}. My personality traits: ${traitsDescription || "Still discovering!"}. Who am I most like?`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "character_match",
              description: "Return the character match result",
              parameters: {
                type: "object",
                properties: {
                  character_name: {
                    type: "string",
                    description: "Full name of the character (e.g. 'Beyoncé', 'James Bond', 'Gordon Ramsay')",
                  },
                  known_for: {
                    type: "string",
                    description: "A short 1-line description of who they are so anyone would recognize them (e.g. 'Legendary chef and TV host known for fiery passion', 'The world's most iconic secret agent')",
                  },
                  source: {
                    type: "string",
                    description: "Where they're from (e.g. 'Music / Real Life', 'James Bond franchise', 'Hell's Kitchen / Real Life')",
                  },
                  match_reason: {
                    type: "string",
                    description: "A fun, 1-2 sentence explanation of why they match. Address the user as 'you'. Keep it playful.",
                  },
                  emoji: {
                    type: "string",
                    description: "A single emoji that represents this character",
                  },
                  match_percentage: {
                    type: "number",
                    description: "A match percentage between 75 and 98",
                  },
                },
                required: ["character_name", "known_for", "source", "match_reason", "emoji", "match_percentage"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "character_match" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits needed." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const match = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(match), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("character-match error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
