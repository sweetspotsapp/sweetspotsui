import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Fetch Open Graph / meta tags from a URL */
async function fetchPageMeta(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    const html = await res.text();

    // Extract useful meta content
    const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]*)"/) ||
      html.match(/<meta[^>]+content="([^"]*)"[^>]+property="og:title"/);
    const ogDesc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]*)"/) ||
      html.match(/<meta[^>]+content="([^"]*)"[^>]+property="og:description"/);
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/);

    const parts: string[] = [];
    if (ogTitle?.[1]) parts.push(`Title: ${ogTitle[1]}`);
    if (ogDesc?.[1]) parts.push(`Description: ${ogDesc[1]}`);
    if (title?.[1] && !ogTitle) parts.push(`Page title: ${title[1]}`);
    parts.push(`URL: ${url}`);

    return parts.join("\n") || `URL: ${url}`;
  } catch (e) {
    console.error("Failed to fetch page meta:", e);
    return `URL: ${url}`;
  }
}

/** For Google Maps URLs, try to extract the place name directly */
function extractFromGoogleMapsUrl(url: string): string | null {
  // Handle maps.google.com/maps/place/Place+Name
  const placeMatch = url.match(/\/maps\/place\/([^/@?]+)/);
  if (placeMatch) return decodeURIComponent(placeMatch[1].replace(/\+/g, " "));

  // Handle maps.app.goo.gl short links - we'll need to fetch these
  return null;
}

/** Use AI to extract the place name and city */
async function extractPlaceWithAI(
  pageContent: string
): Promise<{ place_name: string; city: string; confidence: string } | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
          content:
            "You extract place/venue/restaurant names from social media posts or URLs. Return ONLY a JSON object with place_name, city, and confidence (high/medium/low). If you cannot identify a specific place, return null.",
        },
        {
          role: "user",
          content: `Extract the place name and city from this content:\n\n${pageContent}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_place",
            description: "Extract place information from content",
            parameters: {
              type: "object",
              properties: {
                place_name: { type: "string", description: "Name of the place/venue/restaurant" },
                city: { type: "string", description: "City or area where the place is located" },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["place_name", "city", "confidence"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_place" } },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("AI gateway error:", res.status, errText);
    if (res.status === 429) throw new Error("RATE_LIMITED");
    if (res.status === 402) throw new Error("PAYMENT_REQUIRED");
    throw new Error("AI extraction failed");
  }

  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return null;

  try {
    return JSON.parse(toolCall.function.arguments);
  } catch {
    return null;
  }
}

/** Search Google Places API for the extracted place */
async function searchGooglePlaces(
  placeName: string,
  city: string
): Promise<any | null> {
  const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY_BE");
  if (!GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY_BE not configured");

  const query = `${placeName} ${city}`;
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.photos,places.types,places.regularOpeningHours",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });

  if (!res.ok) {
    console.error("Google Places error:", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  return data.places?.[0] || null;
}

/** Upsert place into the places table */
async function upsertPlace(place: any) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const placeId = place.id;
  const photoName = place.photos?.[0]?.name || null;
  const photos = place.photos?.map((p: any) => p.name) || null;

  // Map price level
  const priceLevelMap: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };

  const row = {
    place_id: placeId,
    name: place.displayName?.text || "Unknown",
    address: place.formattedAddress || null,
    lat: place.location?.latitude || null,
    lng: place.location?.longitude || null,
    rating: place.rating || null,
    ratings_total: place.userRatingCount || null,
    price_level: place.priceLevel ? priceLevelMap[place.priceLevel] ?? null : null,
    photo_name: photoName,
    photos,
    provider: "google",
    categories: place.types || null,
    last_enriched_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("places")
    .upsert(row, { onConflict: "place_id" });

  if (error) console.error("Upsert error:", error);

  return row;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit by IP
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkImportRateLimit(`import:${clientIp}`)) {
      return new Response(JSON.stringify({ error: 'Too many import requests. Please wait a moment.' }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.json();
    const { url } = rawBody;
    if (!url || typeof url !== "string" || url.length > 2000) {
      return new Response(JSON.stringify({ error: "A valid URL is required (max 2000 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Basic URL format validation
    try { new URL(url); } catch {
      return new Response(JSON.stringify({ error: "Invalid URL format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Try extracting from Google Maps URL directly
    let placeName = extractFromGoogleMapsUrl(url);
    let city = "";

    if (!placeName) {
      // Step 2: Fetch page metadata
      const pageContent = await fetchPageMeta(url);

      // Step 3: Use AI to extract place name
      const extraction = await extractPlaceWithAI(pageContent);
      if (!extraction || !extraction.place_name) {
        return new Response(
          JSON.stringify({ error: "Could not identify a place from this link" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      placeName = extraction.place_name;
      city = extraction.city;
    }

    // Step 4: Search Google Places
    const googlePlace = await searchGooglePlaces(placeName!, city);
    if (!googlePlace) {
      return new Response(
        JSON.stringify({ error: `Could not find "${placeName}" on Google Maps` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 5: Upsert into places table
    const cached = await upsertPlace(googlePlace);

    // Build photo URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const photoUrl = cached.photo_name
      ? `${supabaseUrl}/functions/v1/place-photo?photo_name=${encodeURIComponent(cached.photo_name)}&maxWidthPx=400`
      : null;

    return new Response(
      JSON.stringify({
        place_id: cached.place_id,
        name: cached.name,
        address: cached.address,
        lat: cached.lat,
        lng: cached.lng,
        rating: cached.rating,
        photo_url: photoUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("import-from-link error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";

    if (message === "RATE_LIMITED") {
      return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message === "PAYMENT_REQUIRED") {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
