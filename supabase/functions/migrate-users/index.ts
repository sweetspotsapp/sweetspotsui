import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { export_token, page } = await req.json();
    if (export_token !== Deno.env.get("MIGRATION_EXPORT_TOKEN")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sourceUrl = Deno.env.get("SUPABASE_URL")!;
    const sourceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const targetUrl = Deno.env.get("MIGRATION_TARGET_URL")!;
    const targetKey = Deno.env.get("MIGRATION_TARGET_SECRET_KEY")!;

    const source = createClient(sourceUrl, sourceKey);
    const target = createClient(targetUrl, targetKey);

    // List users from source (paginated, 1000 per page)
    const currentPage = page || 1;
    const { data: { users }, error: listError } = await source.auth.admin.listUsers({
      page: currentPage,
      perPage: 1000,
    });

    if (listError) {
      return new Response(JSON.stringify({ error: listError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: { email: string; status: string }[] = [];

    for (const user of users) {
      try {
        const { error: createError } = await target.auth.admin.createUser({
          email: user.email,
          email_confirm: true,
          user_metadata: user.user_metadata || {},
          app_metadata: user.app_metadata || {},
          // Password hash cannot be transferred via Admin API
          // Users will need to use "Forgot Password" on first login
        });

        if (createError) {
          if (createError.message?.includes("already been registered") || createError.message?.includes("already exists")) {
            results.push({ email: user.email || "unknown", status: "already_exists" });
          } else {
            results.push({ email: user.email || "unknown", status: `error: ${createError.message}` });
          }
        } else {
          results.push({ email: user.email || "unknown", status: "created" });
        }
      } catch (e: any) {
        results.push({ email: user.email || "unknown", status: `exception: ${e.message}` });
      }
    }

    const created = results.filter(r => r.status === "created").length;
    const existing = results.filter(r => r.status === "already_exists").length;
    const errors = results.filter(r => r.status.startsWith("error") || r.status.startsWith("exception")).length;

    return new Response(JSON.stringify({
      page: currentPage,
      users_found: users.length,
      created,
      already_exists: existing,
      errors,
      has_more: users.length === 1000,
      details: results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
