import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    if (!prompt) throw new Error("No prompt provided");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const today = new Date().toISOString().split("T")[0];

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
            content: `You are a trip parameter extractor. Today is ${today}. Extract structured trip parameters from a user's natural language prompt. If dates aren't specified, default to a trip starting tomorrow with the number of days mentioned (default 3 days). If budget isn't mentioned, default to "$$". If group size isn't mentioned, default to 1. Extract vibes/styles from descriptive words.`,
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_trip_params",
              description: "Extract trip planning parameters from a natural language prompt",
              parameters: {
                type: "object",
                properties: {
                  destination: { type: "string", description: "The destination city/country" },
                  days: { type: "number", description: "Number of days for the trip" },
                  startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
                  endDate: { type: "string", description: "End date in YYYY-MM-DD format" },
                  budget: { type: "string", enum: ["$", "$$", "$$$", "$$$$"], description: "Budget level" },
                  groupSize: { type: "number", description: "Number of travelers" },
                  vibes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Vibe/style tags like Foodie, Chill, Adventure, Nightlife, Culture, Shopping, Nature",
                  },
                  vibeDetails: {
                    type: "string",
                    description: "The full original prompt as additional context for trip generation",
                  },
                  name: { type: "string", description: "A short catchy trip name" },
                },
                required: ["destination", "startDate", "endDate", "budget", "groupSize", "vibes", "vibeDetails"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_trip_params" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const params = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(params), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-trip-prompt error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
