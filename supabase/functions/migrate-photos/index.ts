import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKET = 'place-photos';
const BATCH_SIZE = 50; // Process 50 places per invocation

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get offset from query param for pagination
    const url = new URL(req.url);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const migrated: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    // List place_id folders under "places/"
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET)
      .list('places', { limit: BATCH_SIZE, offset });

    if (listError) {
      return new Response(JSON.stringify({ error: listError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({
        done: true, message: 'No more files to migrate',
        migrated: 0, skipped: 0, errors: 0
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    for (const placeFolder of files) {
      if (!placeFolder.name) continue;
      const placeId = placeFolder.name;
      const newPath = `${placeId}.jpg`;

      // Check if already migrated
      const { data: existingBlob } = await supabase.storage.from(BUCKET).download(newPath);
      if (existingBlob) {
        skipped.push(placeId);
        continue;
      }

      // Walk into places/{placeId}/photos/{photoRef}/{size}
      const { data: photosFolder } = await supabase.storage
        .from(BUCKET)
        .list(`places/${placeId}/photos`, { limit: 1 });

      if (!photosFolder || photosFolder.length === 0) {
        skipped.push(`${placeId} (no photos subfolder)`);
        continue;
      }

      const photoRef = photosFolder[0].name;
      const { data: sizeFiles } = await supabase.storage
        .from(BUCKET)
        .list(`places/${placeId}/photos/${photoRef}`, { limit: 10 });

      if (!sizeFiles || sizeFiles.length === 0) {
        skipped.push(`${placeId} (no size files)`);
        continue;
      }

      const sizeFile = sizeFiles[0].name;
      const oldPath = `places/${placeId}/photos/${photoRef}/${sizeFile}`;

      // Download old file
      const { data: blob, error: dlError } = await supabase.storage.from(BUCKET).download(oldPath);
      if (dlError || !blob) {
        errors.push(`Download failed: ${oldPath} - ${dlError?.message}`);
        continue;
      }

      // Upload to new flat path
      const buffer = await blob.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(newPath, buffer, { contentType: blob.type || 'image/jpeg', upsert: false });

      if (uploadError) {
        if (uploadError.message.includes('already exists')) {
          skipped.push(placeId);
        } else {
          errors.push(`Upload failed: ${newPath} - ${uploadError.message}`);
        }
        continue;
      }

      // Delete old files for this place
      const { data: allPhotoRefs } = await supabase.storage
        .from(BUCKET)
        .list(`places/${placeId}/photos`, { limit: 100 });

      if (allPhotoRefs) {
        for (const ref of allPhotoRefs) {
          const { data: allSizes } = await supabase.storage
            .from(BUCKET)
            .list(`places/${placeId}/photos/${ref.name}`, { limit: 100 });
          if (allSizes) {
            const paths = allSizes.map(s => `places/${placeId}/photos/${ref.name}/${s.name}`);
            if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);
          }
        }
      }

      migrated.push(placeId);
    }

    const hasMore = files.length === BATCH_SIZE;

    return new Response(JSON.stringify({
      done: !hasMore,
      nextOffset: hasMore ? offset + BATCH_SIZE : null,
      migrated: migrated.length,
      skipped: skipped.length,
      errors: errors.length,
      migratedIds: migrated,
      skippedIds: skipped,
      errorDetails: errors,
    }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Migration failed', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
