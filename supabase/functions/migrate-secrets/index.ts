const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// All known secret names to migrate (excluding Supabase internal ones and migration-specific ones)
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
    const { export_token, target_project_ref, supabase_access_token, dry_run } = await req.json();

    if (export_token !== Deno.env.get("MIGRATION_EXPORT_TOKEN")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!target_project_ref || !supabase_access_token) {
      return new Response(JSON.stringify({ error: "Missing target_project_ref or supabase_access_token" }), {
        status: 400,
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

    if (dry_run) {
      return new Response(JSON.stringify({
        found: secrets.map(s => s.name),
        missing,
        message: "Dry run — no secrets were pushed. Remove dry_run to execute.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Push secrets to target project via Supabase Management API
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${target_project_ref}/secrets`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabase_access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(secrets),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({
        error: `Management API returned ${res.status}`,
        detail: errText,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      pushed: secrets.map(s => s.name),
      missing,
      message: `Successfully pushed ${secrets.length} secrets to project ${target_project_ref}`,
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
