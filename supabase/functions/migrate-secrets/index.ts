const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SECRETS_TO_MIGRATE = [
  "GOOGLE_MAPS_API_KEY",
  "GOOGLE_MAPS_API_KEY_BE",
  "STRIPE_SECRET_KEY",
  "OPENWEATHERMAP_API_KEY",
  "GEMINI_API_KEY",
  "GEOAPIFY_API_KEY",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { export_token } = await req.json();

    if (export_token !== Deno.env.get("MIGRATION_EXPORT_TOKEN")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read secret values from current runtime environment
    const secrets: { name: string; value: string }[] = [];
    const missing: string[] = [];

    for (const name of SECRETS_TO_MIGRATE) {
      const value = Deno.env.get(name);
      if (value) {
        secrets.push({ name, value });
      } else {
        missing.push(name);
      }
    }

    return new Response(JSON.stringify({
      secrets,
      missing,
      message: `Found ${secrets.length} secrets. Set these on your target project via the Supabase dashboard → Settings → Edge Function Secrets.`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
