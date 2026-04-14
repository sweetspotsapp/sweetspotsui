import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SavedPlaceRow = {
  place_id: string;
  name: string;
  categories: string[] | null;
  filter_tags: string[] | null;
  lat: number | null;
  lng: number | null;
};

function getMeaningfulCategories(categories: string[] | null): string[] {
  const generic = new Set([
    "point_of_interest",
    "establishment",
    "store",
    "food",
    "place",
    "restaurant",
  ]);
  return (categories || []).filter((c) => !generic.has(c));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { placeIds, boardName, limit = 4, radius_m } = await req.json();

    if (!Array.isArray(placeIds) || placeIds.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1) Load the board's saved places (source of truth for centroid + vibe)
    const { data: savedPlaces, error: savedErr } = await supabaseAdmin
      .from("places")
      .select("place_id,name,categories,filter_tags,lat,lng")
      .in("place_id", placeIds) as { data: SavedPlaceRow[] | null; error: any };

    if (savedErr) {
      console.error("suggest-places: failed to fetch saved places", savedErr);
      return new Response(JSON.stringify({ error: "Failed to load saved places" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const saved = savedPlaces || [];
    if (saved.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Compute centroid from saved places (location anchor)
    let sumLat = 0;
    let sumLng = 0;
    let n = 0;
    for (const p of saved) {
      if (typeof p.lat === "number" && typeof p.lng === "number") {
        sumLat += p.lat;
        sumLng += p.lng;
        n += 1;
      }
    }

    // If we can't compute a centroid, we cannot guarantee location correctness.
    if (n === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const centroidLat = sumLat / n;
    const centroidLng = sumLng / n;

    // 3) Generate a board-level “vibe query” (used as the search prompt)
    //    Key: NO hard-coded location. Location is enforced by centroid + radius.
    const topCats = new Map<string, number>();
    const topTags = new Map<string, number>();

    for (const p of saved) {
      for (const c of getMeaningfulCategories(p.categories)) {
        topCats.set(c, (topCats.get(c) || 0) + 1);
      }
      for (const t of p.filter_tags || []) {
        topTags.set(t, (topTags.get(t) || 0) + 1);
      }
    }

    const sortedCats = [...topCats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => c);
    const sortedTags = [...topTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);

    let vibeQuery = (boardName && String(boardName).trim()) || "";

    // AI: compress the saved places into a short keyword query that feels like a vibe (not a location)
    if (geminiApiKey) {
      try {
        const savedSummary = saved
          .slice(0, 8)
          .map((p) => `${p.name} (${getMeaningfulCategories(p.categories).slice(0, 3).join(", ") || "place"})`)
          .join("; ");

        const prompt = `Create a short Google-Places-style search query (2–7 words) that captures the overall VIBE / experience of this board.
Rules:
- Do NOT include any city/country names.
- Prefer vibe + cuisine/experience keywords.
- Keep it general but meaningful.

Board name: "${boardName || ""}"
Saved places: ${savedSummary}
Top categories: ${sortedCats.join(", ") || "(none)"}
Top vibe tags: ${sortedTags.join(", ") || "(none)"}

Return ONLY JSON: {"query": "..."}`;

        const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${geminiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content:
                  "You turn saved places into short keyword searches. Never output location names. Output strict JSON.",
              },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          const objMatch = content.match(/\{[\s\S]*\}/);
          if (objMatch) {
            const parsed = JSON.parse(objMatch[0]);
            if (typeof parsed.query === "string" && parsed.query.trim()) {
              vibeQuery = parsed.query.trim();
            }
          }
        } else {
          const t = await aiResp.text();
          console.log("vibeQuery AI failed:", aiResp.status, t);
        }
      } catch (e) {
        console.log("vibeQuery AI error:", e);
      }
    }

    // Deterministic fallback if AI didn't set it
    if (!vibeQuery) {
      if (sortedCats.length > 0) {
        vibeQuery = sortedCats[0].replace(/_/g, " ");
      } else {
        vibeQuery = "popular places";
      }
    }

    // 4) Use the same “main page search algorithm” (unified-search)
    //    Location is strictly controlled by centroid + radius.
    const authHeader = req.headers.get("Authorization") || undefined;
    const invokeHeaders: Record<string, string> = {};
    if (authHeader) invokeHeaders["Authorization"] = authHeader;

    const searchRadius = typeof radius_m === "number" ? radius_m : 12000; // ~12km default

    const { data: unifiedData, error: unifiedErr } = await supabaseAdmin.functions.invoke(
      "unified-search",
      {
        body: {
          prompt: vibeQuery,
          lat: centroidLat,
          lng: centroidLng,
          radius_m: searchRadius,
          mode: "drive",
          // get a bigger pool then return only `limit`
          limit: Math.max(12, Number(limit) * 5),
        },
        headers: invokeHeaders,
      }
    );

    if (unifiedErr) {
      console.error("suggest-places: unified-search error", unifiedErr);
      return new Response(JSON.stringify({ error: "Search failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const unifiedPlaces = unifiedData?.places || [];

    // 5) Final: remove already-saved and return top N
    const savedIdSet = new Set(placeIds);
    const suggestions = unifiedPlaces
      .filter((p: any) => p?.place_id && !savedIdSet.has(p.place_id))
      .slice(0, Number(limit))
      .map((p: any) => ({
        ...p,
        ai_reason: p.why || p.ai_reason || "Similar vibe to your board",
      }));

    console.log("suggest-places returning:", {
      boardName,
      vibeQuery,
      centroid: { lat: centroidLat, lng: centroidLng },
      radius_m: searchRadius,
      count: suggestions.length,
    });

    return new Response(JSON.stringify({
      suggestions,
      boardVibe: vibeQuery,
      centroid: { lat: centroidLat, lng: centroidLng },
      radius_m: searchRadius,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in suggest-places:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
