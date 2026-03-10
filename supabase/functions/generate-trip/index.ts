import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { destination, startDate, endDate, budget, groupSize, vibes, vibeDetails, mustIncludePlaceIds, accommodations } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Fetch must-include place details
    let mustIncludePlaces: { name: string; place_id: string; categories: string[]; address: string; rating: number }[] = [];
    if (mustIncludePlaceIds && mustIncludePlaceIds.length > 0) {
      const { data } = await sb
        .from("places")
        .select("place_id, name, categories, address, rating")
        .in("place_id", mustIncludePlaceIds);
      if (data) mustIncludePlaces = data;
    }

    const mustIncludeSection = mustIncludePlaces.length > 0
      ? `\n\nMUST INCLUDE these places (mark them as mustInclude: true):\n${mustIncludePlaces.map(p => `- ${p.name} (${(p.categories || []).join(", ")})`).join("\n")}`
      : "";

    const accommodationSection = accommodations && accommodations.length > 0
      ? `\n\nAccommodation(s):\n${accommodations.map((a: any, i: number) => `- Stay ${i + 1}: ${a.name || 'Unknown'} at ${a.address || 'Unknown address'}`).join("\n")}\nPlease consider proximity to accommodation when planning activities.`
      : "";

    const prompt = `Create a detailed day-by-day travel plan for a trip to ${destination}.

Trip details:
- Dates: ${startDate} to ${endDate}
- Budget level: ${budget} ($ = budget, $$ = moderate, $$$ = upscale, $$$$ = luxury)
- Group size: ${groupSize} people
- Vibes they want: ${vibes.join(", ")}${vibeDetails ? `\n- Additional details from the traveler: "${vibeDetails}"` : ""}${mustIncludeSection}${accommodationSection}

Generate a structured trip plan with Morning, Afternoon, and Evening slots for each day. Each activity should have:
- A realistic name of a real place or activity
- A brief description
- A category
- An optional time range
- An estimated cost per person in USD (be realistic based on the budget level and destination)

Estimate costs realistically: free for parks/landmarks, $5-15 for cafes, $15-50 for restaurants, $10-30 for museums, etc. Adjust for the destination's cost of living.`;

    const toolDef = {
      type: "function",
      function: {
        name: "create_trip",
        description: "Return a structured travel trip plan with cost estimates",
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
                              estimatedCost: { type: "number", description: "Estimated cost per person in USD. Use 0 for free activities." },
                            },
                            required: ["name", "category", "description", "estimatedCost"],
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
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a travel planning expert. Return structured trip plans using the provided tool. Always include realistic cost estimates." },
          { role: "user", content: prompt },
        ],
        tools: [toolDef],
        tool_choice: { type: "function", function: { name: "create_trip" } },
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
    let toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    // Retry once if no tool call returned
    if (!toolCall) {
      console.warn("No tool call in first response, retrying with google/gemini-2.5-flash...");
      const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a travel planning expert. You MUST use the create_trip tool to return your response. Do not respond with plain text." },
            { role: "user", content: prompt },
          ],
          tools: [toolDef],
          tool_choice: { type: "function", function: { name: "create_trip" } },
        }),
      });

      if (!retryResponse.ok) {
        const retryText = await retryResponse.text();
        console.error("Retry AI error:", retryResponse.status, retryText);
        throw new Error("AI failed to generate trip after retry");
      }

      const retryData = await retryResponse.json();
      toolCall = retryData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        console.error("Retry response:", JSON.stringify(retryData));
        throw new Error("AI did not return structured trip. Please try again.");
      }
    }

    const tripPlan = JSON.parse(toolCall.function.arguments);

    // Enrich activities with real place data using Google Places API
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY_BE");

    // First try matching from DB cache
    const { data: cachedPlaces } = await sb
      .from("places")
      .select("place_id, name, photo_name, lat, lng, address, photos")
      .limit(500);

    const placeCache = new Map<string, { place_id: string; photo_name: string | null; lat: number | null; lng: number | null; address: string | null; photos: string[] | null }>();
    if (cachedPlaces) {
      for (const p of cachedPlaces) {
        placeCache.set(p.name.toLowerCase().trim(), p);
      }
    }

    // Enrich each activity - try DB cache first, then Google Places API
    for (const day of tripPlan.days) {
      for (const slot of day.slots) {
        for (const act of slot.activities) {
          const normalizedName = act.name.toLowerCase().trim();

          // Try exact match from cache
          let match = placeCache.get(normalizedName);
          // Fuzzy match
          if (!match) {
            for (const [key, val] of placeCache) {
              if (key.includes(normalizedName) || normalizedName.includes(key)) {
                match = val;
                break;
              }
            }
          }

          if (match) {
            act.placeId = match.place_id;
            act.photoName = match.photo_name || (match.photos && match.photos[0]) || null;
            act.lat = match.lat;
            act.lng = match.lng;
            act.address = match.address;
            continue;
          }

          // No cache hit — use Google Places Text Search
          if (!GOOGLE_MAPS_API_KEY) continue;

          try {
            const searchQuery = `${act.name} ${destination}`;
            const gRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
                "X-Goog-FieldMask": "places.name,places.displayName,places.photos,places.location,places.formattedAddress",
              },
              body: JSON.stringify({ textQuery: searchQuery, maxResultCount: 1 }),
            });

            if (gRes.ok) {
              const gData = await gRes.json();
              const place = gData.places?.[0];
              if (place) {
                const photoName = place.photos?.[0]?.name || null;
                const lat = place.location?.latitude || null;
                const lng = place.location?.longitude || null;
                const addr = place.formattedAddress || null;
                const displayName = place.displayName?.text || act.name;

                const resourceName = place.name as string | undefined;
                const googlePlaceId = resourceName?.startsWith("places/") ? resourceName.slice(7) : null;

                act.photoName = photoName;
                act.lat = lat;
                act.lng = lng;
                act.address = addr;

                if (googlePlaceId) {
                  act.placeId = googlePlaceId;
                  try {
                    await sb.from("places").upsert({
                      place_id: googlePlaceId,
                      name: displayName,
                      photo_name: photoName,
                      lat, lng,
                      address: addr,
                      categories: [act.category],
                    }, { onConflict: "place_id", ignoreDuplicates: true });
                  } catch (upsertErr) {
                    console.error(`Upsert failed for "${act.name}":`, upsertErr);
                  }
                }
              }
            }
          } catch (err) {
            console.error(`Google Places lookup failed for "${act.name}":`, err);
          }
        }
      }
    }

    return new Response(JSON.stringify(tripPlan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-trip error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});