import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { destination } = await req.json();
    if (!destination || typeof destination !== "string" || destination.length < 2) {
      return new Response(JSON.stringify({ error: "destination required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const owmKey = Deno.env.get("OPENWEATHERMAP_API_KEY");

    if (!owmKey) {
      return new Response(JSON.stringify({ error: "Weather API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check cache first
    const cacheKey = `weather:${destination.toLowerCase().trim()}`;
    const { data: cached } = await supabase
      .from("query_cache")
      .select("cache_value")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached?.cache_value) {
      return new Response(JSON.stringify(cached.cache_value), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Geocode destination using OpenWeatherMap's built-in geocoding
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(destination)}&limit=1&appid=${owmKey}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData?.length) {
      console.log("Geocoding returned no results for:", destination, "Response:", JSON.stringify(geoData));
      return new Response(JSON.stringify({ daily: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lat, lon } = geoData[0];

    // Fetch 16-day forecast (free tier supports up to 16 days with /forecast/daily)
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${owmKey}`;
    const forecastRes = await fetch(forecastUrl);
    const forecastData = await forecastRes.json();

    if (!forecastData?.list) {
      return new Response(JSON.stringify({ daily: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The free 5-day/3-hour forecast — aggregate to daily
    const dailyMap = new Map<string, { temps: number[]; icons: string[]; summaries: string[] }>();
    
    for (const entry of forecastData.list) {
      const date = entry.dt_txt?.split(" ")[0];
      if (!date) continue;
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { temps: [], icons: [], summaries: [] });
      }
      const day = dailyMap.get(date)!;
      day.temps.push(entry.main.temp_max || entry.main.temp);
      day.icons.push(entry.weather?.[0]?.main?.toLowerCase() || "clear");
      day.summaries.push(entry.weather?.[0]?.description || "");
    }

    const daily = Array.from(dailyMap.entries()).map(([date, data]) => {
      const tempHigh = Math.round(Math.max(...data.temps));
      const tempLow = Math.round(Math.min(...data.temps));
      // Pick the most common weather condition
      const iconCounts = new Map<string, number>();
      for (const ic of data.icons) {
        iconCounts.set(ic, (iconCounts.get(ic) || 0) + 1);
      }
      let icon = "clear";
      let maxCount = 0;
      for (const [k, v] of iconCounts) {
        if (v > maxCount) { icon = k; maxCount = v; }
      }
      // Map to simple icon names
      const iconMap: Record<string, string> = {
        clear: "clear",
        clouds: "clouds",
        rain: "rain",
        drizzle: "rain",
        thunderstorm: "thunderstorm",
        snow: "snow",
        mist: "clouds",
        fog: "clouds",
        haze: "clouds",
      };
      const summary = data.summaries[Math.floor(data.summaries.length / 2)] || "";
      
      return {
        date,
        icon: iconMap[icon] || "clouds",
        temp_high: tempHigh,
        temp_low: tempLow,
        summary: summary.charAt(0).toUpperCase() + summary.slice(1),
      };
    });

    const result = { daily };

    // Cache for 6 hours
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    await supabase.from("query_cache").upsert({
      cache_key: cacheKey,
      cache_value: result,
      expires_at: expiresAt,
    }, { onConflict: "cache_key" });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("trip-weather error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
