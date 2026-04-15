import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { export_token } = await req.json();
    if (export_token !== Deno.env.get("MIGRATION_EXPORT_TOKEN")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUrl = Deno.env.get("MIGRATION_TARGET_URL")!;
    const targetKey = Deno.env.get("MIGRATION_TARGET_SECRET_KEY")!;
    const target = createClient(targetUrl, targetKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const tables = [
      "board_places", "boards", "contact_submissions", "place_interactions",
      "places", "profiles", "query_cache", "saved_places", "search_feedback",
      "searches", "shared_trips", "trip_templates", "trips", "user_roles",
    ];

    // Count rows in each table
    const tableCounts: Record<string, number> = {};
    for (const table of tables) {
      const { count, error } = await target
        .from(table)
        .select("*", { count: "exact", head: true });
      tableCounts[table] = error ? -1 : (count ?? 0);
    }

    // Count auth users
    let userCount = 0;
    let userError = null;
    try {
      const { data, error } = await target.auth.admin.listUsers({ perPage: 1000 });
      if (error) userError = error.message;
      else userCount = data.users.length;
    } catch (e: any) {
      userError = e.message;
    }

    // Count storage files per bucket
    const buckets = ["place-photos", "avatars", "sweetspots", "trip-documents"];
    const storageCounts: Record<string, number> = {};
    for (const bucket of buckets) {
      let total = 0;
      let offset = 0;
      const limit = 1000;
      while (true) {
        const { data, error } = await target.storage
          .from(bucket)
          .list("", { limit, offset });
        if (error || !data) break;
        const real = data.filter((f: any) => f.id && !f.name.startsWith(".") && !f.name.startsWith("places/"));
        total += real.length;
        if (data.length < limit) break;
        offset += limit;
      }
      storageCounts[bucket] = total;
    }

    return new Response(JSON.stringify({
      tableCounts,
      userCount,
      userError,
      storageCounts,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
