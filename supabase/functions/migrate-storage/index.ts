import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const BUCKETS = ["place-photos", "avatars", "sweetspots", "trip-documents"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { export_token, bucket, offset = 0, limit = 50 } = await req.json();
    if (export_token !== Deno.env.get("MIGRATION_EXPORT_TOKEN")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sourceUrl = Deno.env.get("SUPABASE_URL")!;
    const sourceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const targetUrl = Deno.env.get("MIGRATION_TARGET_URL")!;
    const targetKey = Deno.env.get("MIGRATION_TARGET_SECRET_KEY")!;

    const source = createClient(sourceUrl, sourceKey);
    const target = createClient(targetUrl, targetKey);

    const bucketsToMigrate = bucket ? [bucket] : BUCKETS;
    const report: Record<string, any> = {};

    for (const b of bucketsToMigrate) {
      const result = await migrateBucket(source, target, b, offset, limit);
      report[b] = result;
    }

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function migrateBucket(
  source: any,
  target: any,
  bucketId: string,
  offset: number,
  limit: number,
) {
  // List files from source bucket
  const { data: files, error: listError } = await source.storage
    .from(bucketId)
    .list("", { offset, limit, sortBy: { column: "name", order: "asc" } });

  if (listError) {
    return { error: listError.message };
  }

  if (!files || files.length === 0) {
    return { migrated: 0, message: "no files at this offset" };
  }

  // Filter out folders
  const realFiles = files.filter((f: any) => f.id);

  let migrated = 0;
  let errors: string[] = [];

  for (const file of realFiles) {
    const filePath = file.name;
    
    try {
      // Download from source
      const { data: blob, error: dlError } = await source.storage
        .from(bucketId)
        .download(filePath);

      if (dlError || !blob) {
        errors.push(`${filePath}: download failed - ${dlError?.message}`);
        continue;
      }

      // Upload to target
      const { error: upError } = await target.storage
        .from(bucketId)
        .upload(filePath, blob, {
          upsert: true,
          contentType: file.metadata?.mimetype || "application/octet-stream",
        });

      if (upError) {
        errors.push(`${filePath}: upload failed - ${upError.message}`);
      } else {
        migrated++;
      }
    } catch (e: any) {
      errors.push(`${filePath}: ${e.message}`);
    }
  }

  return {
    total_listed: files.length,
    real_files: realFiles.length,
    migrated,
    errors: errors.length,
    error_details: errors.length > 0 ? errors : undefined,
    has_more: files.length === limit,
    next_offset: offset + limit,
  };
}
