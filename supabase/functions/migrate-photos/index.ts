import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKET = 'place-photos';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const migrated: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];
    let offset = 0;
    const limit = 100;

    // List all files in the bucket (paginated)
    while (true) {
      // List top-level folders (place_id folders like "places/ChIJ...")
      // The old format is: places/{place_id}/photos/{photo_ref}/{size}
      // But storage lists files — we need to walk the structure
      // Actually the old format stored as: {photoName}/{maxWidth}x{maxHeight}
      // where photoName = "places/ChIJ.../photos/AXCi..."
      // So the top-level folder is "places"
      
      const { data: files, error: listError } = await supabase.storage
        .from(BUCKET)
        .list('places', { limit, offset });

      if (listError) {
        errors.push(`List error at offset ${offset}: ${listError.message}`);
        break;
      }

      if (!files || files.length === 0) break;

      // Each entry here is a place_id folder like "ChIJ..."
      for (const placeFolder of files) {
        if (!placeFolder.name) continue;
        const placeId = placeFolder.name;
        const newPath = `${placeId}.jpg`;

        // Check if already migrated
        const { data: existingBlob } = await supabase.storage
          .from(BUCKET)
          .download(newPath);

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

        // List size variants
        const { data: sizeFiles } = await supabase.storage
          .from(BUCKET)
          .list(`places/${placeId}/photos/${photoRef}`, { limit: 10 });

        if (!sizeFiles || sizeFiles.length === 0) {
          skipped.push(`${placeId} (no size files)`);
          continue;
        }

        // Pick first size variant
        const sizeFile = sizeFiles[0].name;
        const oldPath = `places/${placeId}/photos/${photoRef}/${sizeFile}`;

        // Download old file
        const { data: blob, error: dlError } = await supabase.storage
          .from(BUCKET)
          .download(oldPath);

        if (dlError || !blob) {
          errors.push(`Download failed for ${oldPath}: ${dlError?.message}`);
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
            errors.push(`Upload failed for ${newPath}: ${uploadError.message}`);
          }
          continue;
        }

        // Delete ALL old files for this place (all size variants, all photo refs)
        const { data: allPhotoRefs } = await supabase.storage
          .from(BUCKET)
          .list(`places/${placeId}/photos`, { limit: 100 });

        if (allPhotoRefs) {
          for (const ref of allPhotoRefs) {
            const { data: allSizes } = await supabase.storage
              .from(BUCKET)
              .list(`places/${placeId}/photos/${ref.name}`, { limit: 100 });

            if (allSizes) {
              const pathsToDelete = allSizes.map(s => `places/${placeId}/photos/${ref.name}/${s.name}`);
              if (pathsToDelete.length > 0) {
                await supabase.storage.from(BUCKET).remove(pathsToDelete);
              }
            }
          }
        }

        migrated.push(placeId);
      }

      if (files.length < limit) break;
      offset += limit;
    }

    return new Response(
      JSON.stringify({
        migrated: migrated.length,
        skipped: skipped.length,
        errors: errors.length,
        migratedIds: migrated,
        skippedIds: skipped,
        errorDetails: errors,
      }, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Migration failed', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
