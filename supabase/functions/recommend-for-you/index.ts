import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Extract user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit) || 6, 12);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 1) Get user's saved place IDs
    const { data: savedRows } = await admin
      .from("saved_places")
      .select("place_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const savedIds = (savedRows || []).map((r: any) => r.place_id);

    if (savedIds.length === 0) {
      return new Response(JSON.stringify({ recommendations: [], reason: "no_saves" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Load saved places' metadata (categories, tags, location)
    const { data: savedPlaces } = await admin
      .from("places")
      .select("place_id, name, categories, filter_tags, lat, lng")
      .in("place_id", savedIds);

    const places = savedPlaces || [];

    // 3) Compute centroid
    let sumLat = 0, sumLng = 0, n = 0;
    for (const p of places) {
      if (typeof p.lat === "number" && typeof p.lng === "number") {
        sumLat += p.lat;
        sumLng += p.lng;
        n++;
      }
    }

    if (n === 0) {
      return new Response(JSON.stringify({ recommendations: [], reason: "no_location" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const centroidLat = sumLat / n;
    const centroidLng = sumLng / n;

    // 4) Extract top tags & categories to build a vibe query
    const generic = new Set(["point_of_interest", "establishment", "store", "food", "place", "restaurant"]);
    const tagCounts = new Map<string, number>();
    const catCounts = new Map<string, number>();

    for (const p of places) {
      for (const t of p.filter_tags || []) {
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      }
      for (const c of p.categories || []) {
        if (!generic.has(c)) catCounts.set(c, (catCounts.get(c) || 0) + 1);
      }
    }

    const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
    const topCats = [...catCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c);

    // Build a vibe query from tags + categories
    const vibeKeywords = [...topTags.slice(0, 3), ...topCats.slice(0, 2)].map(k => k.replace(/_/g, " "));
    const vibeQuery = vibeKeywords.length > 0 ? vibeKeywords.join(", ") : "popular unique places";

    console.log("recommend-for-you:", { userId: user.id, savedCount: savedIds.length, vibeQuery, centroid: { lat: centroidLat, lng: centroidLng } });

    // 5) Call unified-search with the vibe query around the centroid
    const { data: searchData, error: searchErr } = await admin.functions.invoke("unified-search", {
      body: {
        prompt: vibeQuery,
        lat: centroidLat,
        lng: centroidLng,
        radius_m: 15000,
        mode: "drive",
        limit: Math.max(20, limit * 4),
      },
      headers: { Authorization: authHeader },
    });

    if (searchErr) {
      console.error("recommend-for-you: unified-search error", searchErr);
      return new Response(JSON.stringify({ recommendations: [], reason: "search_error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allPlaces = searchData?.places || [];
    const savedSet = new Set(savedIds);

    // 6) Filter out already-saved, return top N
    const recommendations = allPlaces
      .filter((p: any) => p?.place_id && !savedSet.has(p.place_id))
      .slice(0, limit)
      .map((p: any) => ({
        place_id: p.place_id,
        name: p.name,
        address: p.address,
        rating: p.rating,
        photo_name: p.photo_name,
        ai_reason: p.why || p.ai_reason || "Matches your vibe",
        categories: p.categories,
        filter_tags: p.filter_tags,
      }));

    return new Response(JSON.stringify({ recommendations, vibeQuery }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("recommend-for-you error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
