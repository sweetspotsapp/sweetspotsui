const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const TABLES_ORDER = [
  "places",           // no FK deps, must be first (others reference it)
  "profiles",         // references auth.users only
  "query_cache",      // no FK
  "searches",         // references auth.users
  "trip_templates",   // no FK
  "user_roles",       // references auth.users
  "boards",           // references auth.users
  "trips",            // references auth.users
  "contact_submissions", // no FK
  "search_feedback",  // no FK
  "saved_places",     // references places
  "place_interactions", // references places
  "board_places",     // references boards
  "shared_trips",     // references trips
];

const BATCH_SIZE = 500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { export_token, table, offset } = await req.json();
    if (export_token !== Deno.env.get("MIGRATION_EXPORT_TOKEN")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sourceUrl = Deno.env.get("SUPABASE_URL")!;
    const sourceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const targetUrl = Deno.env.get("MIGRATION_TARGET_URL")!;
    const targetKey = Deno.env.get("MIGRATION_TARGET_SECRET_KEY")!;

    const source = createClient(sourceUrl, sourceKey);
    const target = createClient(targetUrl, targetKey);

    const tablesToMigrate = table ? [table] : TABLES_ORDER;
    const report: Record<string, any> = {};

    for (const t of tablesToMigrate) {
      const startOffset = table ? (offset || 0) : 0;
      let currentOffset = startOffset;
      let totalMigrated = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await source
          .from(t)
          .select("*")
          .range(currentOffset, currentOffset + BATCH_SIZE - 1);

        if (error) {
          report[t] = { error: error.message };
          break;
        }

        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }

        // Upsert to target
        const primaryKey = getPrimaryKey(t);
        const { error: upsertError } = await target
          .from(t)
          .upsert(data, { onConflict: primaryKey });

        if (upsertError) {
          report[t] = { error: upsertError.message, migrated: totalMigrated, offset: currentOffset };
          hasMore = false;
          break;
        }

        totalMigrated += data.length;
        currentOffset += BATCH_SIZE;

        if (data.length < BATCH_SIZE) {
          hasMore = false;
        }
      }

      if (!report[t]) {
        report[t] = { migrated: totalMigrated, from_offset: startOffset };
      }
    }

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function getPrimaryKey(table: string): string {
  const keys: Record<string, string> = {
    places: "place_id",
    profiles: "id",
    query_cache: "cache_key",
    searches: "id",
    trip_templates: "id",
    user_roles: "id",
    boards: "id",
    trips: "id",
    contact_submissions: "id",
    search_feedback: "id",
    saved_places: "id",
    place_interactions: "id",
    board_places: "id",
    shared_trips: "id",
  };
  return keys[table] || "id";
}
