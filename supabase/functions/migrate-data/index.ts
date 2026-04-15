const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const TABLES_ORDER = [
  "places",
  "profiles",
  "query_cache",
  "searches",
  "trip_templates",
  "user_roles",
  "boards",
  "trips",
  "contact_submissions",
  "search_feedback",
  "saved_places",
  "place_interactions",
  "board_places",
  "shared_trips",
];

const BATCH_SIZE = 50;
const TIME_LIMIT_MS = 50_000; // stop after 50s to return before gateway timeout

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { export_token, table, offset } = await req.json();
    if (export_token !== Deno.env.get("MIGRATION_EXPORT_TOKEN")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const source = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const target = createClient(Deno.env.get("MIGRATION_TARGET_URL")!, Deno.env.get("MIGRATION_TARGET_SECRET_KEY")!);

    const tablesToMigrate = table ? [table] : TABLES_ORDER;
    const report: Record<string, any> = {};
    const startTime = Date.now();
    let timedOut = false;

    for (const t of tablesToMigrate) {
      if (timedOut) { report[t] = { status: "skipped_timeout" }; continue; }

      const startOffset = (table && offset != null) ? offset : 0;
      let currentOffset = startOffset;
      let totalMigrated = 0;

      while (true) {
        if (Date.now() - startTime > TIME_LIMIT_MS) {
          report[t] = { migrated: totalMigrated, from_offset: startOffset, stopped_at: currentOffset, reason: "timeout" };
          timedOut = true;
          break;
        }

        const { data, error } = await source.from(t).select("*").range(currentOffset, currentOffset + BATCH_SIZE - 1);

        if (error) { report[t] = { error: error.message }; break; }
        if (!data || data.length === 0) { report[t] = { migrated: totalMigrated, complete: true }; break; }

        const { error: upsertError } = await target.from(t).upsert(data, { onConflict: getPrimaryKey(t) });

        if (upsertError) {
          report[t] = { error: upsertError.message, migrated: totalMigrated, stopped_at: currentOffset };
          break;
        }

        totalMigrated += data.length;
        currentOffset += BATCH_SIZE;

        if (data.length < BATCH_SIZE) { report[t] = { migrated: totalMigrated, complete: true }; break; }
      }
    }

    return new Response(JSON.stringify({ report, timed_out: timedOut, elapsed_ms: Date.now() - startTime }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function getPrimaryKey(table: string): string {
  const keys: Record<string, string> = {
    places: "place_id", profiles: "id", query_cache: "cache_key", searches: "id",
    trip_templates: "id", user_roles: "id", boards: "id", trips: "id",
    contact_submissions: "id", search_feedback: "id", saved_places: "id",
    place_interactions: "id", board_places: "id", shared_trips: "id",
  };
  return keys[table] || "id";
}
