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

    const vibeInstruction = vibeDetails
      ? `\n\nCRITICAL — The traveler specifically described what they want: "${vibeDetails}"\nYou MUST heavily prioritize this description when choosing activities. Every activity should relate to or complement this request. Do NOT add generic tourist activities that don't match unless absolutely necessary to fill a time slot.`
      : "";

    const vibeChipsInstruction = vibes && vibes.length > 0
      ? `\nThe traveler selected these vibes: ${vibes.join(", ")}. Prioritize activities that match these moods.`
      : "";

    const prompt = `Create a detailed day-by-day travel plan for a trip to ${destination}.

Trip details:
- Dates: ${startDate} to ${endDate}
- Budget level: ${budget} ($ = budget, $$ = moderate, $$$ = upscale, $$$$ = luxury)
- Group size: ${groupSize} people${vibeChipsInstruction}${vibeInstruction}${mustIncludeSection}${accommodationSection}

Generate a structured trip plan with Morning, Afternoon, and Evening slots for each day. Each activity MUST be:
- The FULL, EXACT name of a REAL, SPECIFIC establishment or attraction that EXISTS in ${destination}. For example: "Little Creatures Geelong" NOT "Coffee". "Geelong Gallery" NOT "Art Museum". "Pakington Strand" NOT "Shopping Street". NEVER use generic category names as activity names.
- A brief description mentioning what makes this specific place special
- A category
- An optional time range
- An estimated cost per person in USD (be realistic based on the budget level and destination)

CRITICAL: Every single activity name must be a real, Googleable business or landmark in ${destination}. If you're unsure a place exists there, pick one you're confident about. NEVER invent or use placeholder names like "Local Cafe", "Beach Walk", "Coffee Shop", "Night Market" — always use the actual venue name.

IMPORTANT: The traveler's vibes and description are the MOST important input. Build the entire itinerary around what they asked for. If they said "sunset", prioritize sunset viewpoints, rooftop bars at golden hour, sunset cruises, etc. If they said "foodie", focus on food experiences. Do NOT default to generic city tours or random cafes.

Write the summary like you're texting a friend about the trip — keep it short, warm, and conversational. No formal language. For example, if vibes are "Chill" and details say "sunset only", write something like "Chasing sunsets across Melbourne — rooftop golden hours, waterfront views, and zero alarms 🌅" NOT "An exploration of Melbourne's coffee culture...".

Estimate costs realistically: free for parks/landmarks, $5-15 for cafes, $15-50 for restaurants, $10-30 for museums, etc. Adjust for the destination's cost of living.`;

    const toolDef = {
      type: "function",
      function: {
        name: "create_trip",
        description: "Return a structured travel trip plan with cost estimates",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string", description: "Write this like you're hyping up the trip to a friend — casual, warm, maybe a little cheeky. Keep it 1-2 sentences. Example: 'Chasing sunsets across Melbourne — rooftop golden hours, waterfront views, and zero alarms 🌅'. Do NOT sound like a travel brochure." },
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
                              category: { type: "string", enum: ["food", "cafe", "bar", "museum", "park", "shopping", "landmark", "entertainment", "adventure", "nightlife", "beach", "temple", "market", "nature", "viewpoint", "wellness", "tour"] },
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
          { role: "system", content: "You are a well-traveled friend who makes amazing trip plans. Write all copy in a casual, warm tone — like a friend giving advice over coffee, not a travel brochure. The traveler's stated vibes, mood, and description are your PRIMARY guide — every activity must reflect what they asked for. Never fall back to generic tourist itineraries. Return structured trip plans using the provided tool with realistic cost estimates." },
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
            { role: "system", content: "You are a travel planning expert who deeply personalizes itineraries based on the traveler's vibes and description. You MUST use the create_trip tool to return your response. Do not respond with plain text." },
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

    // Geocode the destination to get a location bias for searches
    let destLat: number | null = null;
    let destLng: number | null = null;
    if (GOOGLE_MAPS_API_KEY) {
      try {
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const loc = geoData.results?.[0]?.geometry?.location;
          if (loc) { destLat = loc.lat; destLng = loc.lng; }
        }
      } catch (e) { console.error("Geocode failed:", e); }
    }

    // Haversine distance in km
    function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
      const toRad = (d: number) => d * Math.PI / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Max distance from destination center (km) — generous for large metro areas
    const MAX_DISTANCE_KM = 100;

    // First try matching from DB cache — only places near the destination
    let placeCache = new Map<string, { place_id: string; photo_name: string | null; lat: number | null; lng: number | null; address: string | null; photos: string[] | null }>();
    if (destLat && destLng) {
      // Rough bounding box to limit DB query
      const latRange = MAX_DISTANCE_KM / 111;
      const lngRange = MAX_DISTANCE_KM / (111 * Math.cos(destLat * Math.PI / 180));
      const { data: cachedPlaces } = await sb
        .from("places")
        .select("place_id, name, photo_name, lat, lng, address, photos")
        .gte("lat", destLat - latRange)
        .lte("lat", destLat + latRange)
        .gte("lng", destLng - lngRange)
        .lte("lng", destLng + lngRange)
        .limit(500);
      if (cachedPlaces) {
        for (const p of cachedPlaces) {
          placeCache.set(p.name.toLowerCase().trim(), p);
        }
      }
    }

    // Enrich each activity - try DB cache first, then Google Places API (PARALLEL)
    const enrichTasks: Promise<void>[] = [];

    for (const day of tripPlan.days) {
      for (const slot of day.slots) {
        for (const act of slot.activities) {
          const normalizedName = act.name.toLowerCase().trim();
          const match = placeCache.get(normalizedName);

          if (match) {
            act.placeId = match.place_id;
            act.photoName = match.photo_name || (match.photos && match.photos[0]) || null;
            act.lat = match.lat;
            act.lng = match.lng;
            act.address = match.address;
            continue;
          }

          if (!GOOGLE_MAPS_API_KEY) continue;

          enrichTasks.push((async () => {
            try {
              const searchBody: Record<string, unknown> = {
                textQuery: `${act.name} in ${destination}`,
                maxResultCount: 3,
              };
              if (destLat && destLng) {
                searchBody.locationBias = {
                  circle: { center: { latitude: destLat, longitude: destLng }, radius: MAX_DISTANCE_KM * 1000 },
                };
              }

              const gRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
                  "X-Goog-FieldMask": "places.name,places.displayName,places.photos,places.location,places.formattedAddress",
                },
                body: JSON.stringify(searchBody),
              });

              if (gRes.ok) {
                const gData = await gRes.json();
                let place = null;
                for (const candidate of gData.places || []) {
                  const cLat = candidate.location?.latitude;
                  const cLng = candidate.location?.longitude;
                  if (destLat && destLng && cLat && cLng) {
                    if (haversineKm(destLat, destLng, cLat, cLng) <= MAX_DISTANCE_KM) { place = candidate; break; }
                  } else { place = candidate; break; }
                }

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
                        place_id: googlePlaceId, name: displayName, photo_name: photoName,
                        lat, lng, address: addr, categories: [act.category],
                      }, { onConflict: "place_id", ignoreDuplicates: true });
                    } catch (e) { console.error(`Upsert failed for "${act.name}":`, e); }
                  }
                }
              }
            } catch (err) {
              console.error(`Google Places lookup failed for "${act.name}":`, err);
            }
          })());
        }
      }
    }

    // Run all Google lookups in parallel
    await Promise.all(enrichTasks);

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