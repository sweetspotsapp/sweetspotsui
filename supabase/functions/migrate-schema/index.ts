import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { export_token } = await req.json();
    if (export_token !== Deno.env.get("MIGRATION_EXPORT_TOKEN")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const targetDbUrl = Deno.env.get("MIGRATION_TARGET_DB_URL")!;
    const targetUrl = Deno.env.get("MIGRATION_TARGET_URL")!;
    const targetKey = Deno.env.get("MIGRATION_TARGET_SECRET_KEY")!;

    // Step 1: Apply schema via direct Postgres connection
    const client = new Client(targetDbUrl);
    await client.connect();

    // Execute migrations as individual statements
    // We split on semicolons but need to handle $$ blocks
    const migrationSql = getMigrationSql();
    
    // Split SQL into executable statements, respecting $$ blocks
    const statements = splitSqlStatements(migrationSql);
    const results: string[] = [];
    let errors: string[] = [];

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt || stmt.startsWith("--")) continue;
      try {
        await client.queryArray(stmt);
        results.push(`OK: statement ${i + 1}`);
      } catch (e: any) {
        const msg = e.message || String(e);
        // Skip "already exists" errors (idempotent)
        if (msg.includes("already exists") || msg.includes("duplicate key") || msg.includes("does not exist")) {
          results.push(`SKIP: statement ${i + 1} - ${msg.substring(0, 100)}`);
        } else {
          errors.push(`ERR statement ${i + 1}: ${msg.substring(0, 200)}`);
          results.push(`ERR: statement ${i + 1} - ${msg.substring(0, 100)}`);
        }
      }
    }

    await client.end();

    // Step 2: Create storage buckets via Supabase client
    const targetSupabase = createClient(targetUrl, targetKey);
    const buckets = [
      { id: "place-photos", name: "place-photos", public: true, fileSizeLimit: 2097152, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
      { id: "avatars", name: "avatars", public: true },
      { id: "sweetspots", name: "sweetspots", public: false },
      { id: "trip-documents", name: "trip-documents", public: false },
    ];

    const bucketResults: string[] = [];
    for (const b of buckets) {
      const { error } = await targetSupabase.storage.createBucket(b.id, {
        public: b.public,
        fileSizeLimit: b.fileSizeLimit,
        allowedMimeTypes: b.allowedMimeTypes,
      });
      if (error) {
        bucketResults.push(`${b.id}: ${error.message}`);
      } else {
        bucketResults.push(`${b.id}: created`);
      }
    }

    return new Response(JSON.stringify({
      schema_statements: statements.length,
      schema_ok: results.filter(r => r.startsWith("OK")).length,
      schema_skipped: results.filter(r => r.startsWith("SKIP")).length,
      schema_errors: errors.length,
      errors,
      buckets: bucketResults,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inDollarQuote = false;
  let dollarTag = "";

  const lines = sql.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--") && !inDollarQuote) {
      current += line + "\n";
      continue;
    }

    if (!inDollarQuote) {
      // Check for $$ or $function$ start
      const dollarMatch = line.match(/(\$[a-zA-Z]*\$)/);
      if (dollarMatch) {
        const tag = dollarMatch[1];
        const count = (line.split(tag).length - 1);
        if (count === 1) {
          inDollarQuote = true;
          dollarTag = tag;
        }
        // If count >= 2, it's a self-contained $$ block on one line
      }
    } else {
      // Check for closing dollar tag
      if (line.includes(dollarTag)) {
        inDollarQuote = false;
        dollarTag = "";
      }
    }

    current += line + "\n";

    if (!inDollarQuote && trimmed.endsWith(";")) {
      statements.push(current.trim());
      current = "";
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements.filter(s => {
    const cleaned = s.replace(/--[^\n]*/g, "").trim();
    return cleaned.length > 0 && cleaned !== ";";
  });
}

function getMigrationSql(): string {
  return atob("LS0gQ3JlYXRlIHByb2ZpbGVzIHRhYmxlCkNSRUFURSBUQUJMRSBwdWJsaWMucHJvZmlsZXMgKAogIGlkIFVVSUQgUFJJTUFSWSBLRVkgUkVGRVJFTkNFUyBhdXRoLnVzZXJzKGlkKSBPTiBERUxFVEUgQ0FTQ0FERSwKICBidWRnZXQgVEVYVCwKICB2aWJlIEpTT05CLAogIGRpZXRhcnkgSlNPTkIsCiAgbW9iaWxpdHkgSlNPTkIsCiAgY3JlYXRlZF9hdCBUSU1FU1RBTVBUWiBOT1QgTlVMTCBERUZBVUxUIG5vdygpCik7");
}
