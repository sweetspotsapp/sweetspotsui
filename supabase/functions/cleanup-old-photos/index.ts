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

    const url = new URL(req.url);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const BATCH = 20;

    // List place_id folders under "places/"
    const { data: folders, error: listError } = await supabase.storage
      .from(BUCKET)
      .list('places', { limit: BATCH, offset });

    if (listError) {
      return new Response(JSON.stringify({ error: listError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!folders || folders.length === 0) {
      return new Response(JSON.stringify({ done: true, deleted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let totalDeleted = 0;
    const deletedFolders: string[] = [];

    for (const folder of folders) {
      if (!folder.name) continue;
      const placeId = folder.name;

      // List photo refs
      const { data: photoRefs } = await supabase.storage
        .from(BUCKET)
        .list(`places/${placeId}/photos`, { limit: 100 });

      if (photoRefs) {
        for (const ref of photoRefs) {
          const { data: sizeFiles } = await supabase.storage
            .from(BUCKET)
            .list(`places/${placeId}/photos/${ref.name}`, { limit: 100 });

          if (sizeFiles && sizeFiles.length > 0) {
            const paths = sizeFiles.map(s => `places/${placeId}/photos/${ref.name}/${s.name}`);
            const { error: delError } = await supabase.storage.from(BUCKET).remove(paths);
            if (!delError) totalDeleted += paths.length;
          }
        }
      }

      deletedFolders.push(placeId);
    }

    return new Response(JSON.stringify({
      done: folders.length < BATCH,
      nextOffset: folders.length < BATCH ? null : offset + BATCH,
      deleted: totalDeleted,
      foldersProcessed: deletedFolders.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
