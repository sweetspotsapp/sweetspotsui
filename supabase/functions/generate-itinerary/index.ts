import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { destination, startDate, endDate, budget, groupSize, vibes, mustIncludePlaceIds } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch must-include place details
    let mustIncludePlaces: { name: string; place_id: string; categories: string[] }[] = [];
    if (mustIncludePlaceIds && mustIncludePlaceIds.length > 0) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, serviceKey);
      const { data } = await sb
        .from("places")
        .select("place_id, name, categories, address, rating")
        .in("place_id", mustIncludePlaceIds);
      if (data) mustIncludePlaces = data;
    }

    const mustIncludeSection = mustIncludePlaces.length > 0
      ? `\n\nMUST INCLUDE these places (mark them as mustInclude: true):\n${mustIncludePlaces.map(p => `- ${p.name} (${(p.categories || []).join(", ")})`).join("\n")}`
      : "";

    const prompt = `Create a detailed day-by-day travel itinerary for a trip to ${destination}.

Trip details:
- Dates: ${startDate} to ${endDate}
- Budget level: ${budget} ($ = budget, $$ = moderate, $$$ = upscale, $$$$ = luxury)
- Group size: ${groupSize} people
- Vibes they want: ${vibes.join(", ")}${mustIncludeSection}

Generate a structured itinerary with Morning, Afternoon, and Evening slots for each day. Each activity should have a realistic name of a place or activity, a brief description, a category, and an optional time.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a travel planning expert. Return structured itineraries using the provided tool." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_itinerary",
              description: "Return a structured travel itinerary",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "A 1-2 sentence overview of the trip" },
                  days: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string", description: "e.g. Day 1 - Monday" },
                        slots: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              time: { type: "string", enum: ["Morning", "Afternoon", "Evening"] },
                              activities: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    name: { type: "string" },
                                    time: { type: "string", description: "e.g. 9:00 AM - 11:00 AM" },
                                    category: { type: "string", enum: ["food", "cafe", "bar", "museum", "park", "shopping", "landmark", "entertainment", "adventure", "nightlife", "beach", "temple", "market"] },
                                    description: { type: "string", description: "1-2 sentences" },
                                    mustInclude: { type: "boolean" },
                                  },
                                  required: ["name", "category", "description"],
                                  additionalProperties: false,
                                },
                              },
                            },
                            required: ["time", "activities"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["label", "slots"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["summary", "days"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_itinerary" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const itinerary = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(itinerary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-itinerary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
