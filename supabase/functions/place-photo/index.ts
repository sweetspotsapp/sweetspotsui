import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKET = 'place-photos';

const TRANSPARENT_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
  0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21,
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x01, 0x44,
  0x00, 0x3b,
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const photoName = url.searchParams.get('photo_name');
    const placeId = url.searchParams.get('place_id');
    const maxWidth = url.searchParams.get('maxWidthPx') || '400';
    const maxHeight = url.searchParams.get('maxHeightPx') || '400';

    if (!photoName) {
      return new Response(
        JSON.stringify({ error: 'Missing photo_name parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!placeId) {
      return new Response(
        JSON.stringify({ error: 'Missing place_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY_BE');

    if (!googleMapsApiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Flat storage path: {placeId}.jpg
    const storagePath = `${placeId}.jpg`;

    // === CHECK CACHE: Try Supabase Storage first ===
    const { data: cachedBlob, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(storagePath);

    if (cachedBlob && !downloadError) {
      console.log('Cache HIT:', storagePath);
      const buffer = await cachedBlob.arrayBuffer();
      return new Response(buffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': cachedBlob.type || 'image/jpeg',
          'Cache-Control': 'public, max-age=2592000', // 30 days
          'X-Cache': 'HIT',
        },
      });
    }

    // === CACHE MISS: Fetch from Google Places API (with retry for 429) ===
    console.log('Cache MISS — fetching from Google:', photoName, '→', storagePath);
    const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}&key=${googleMapsApiKey}`;
    
    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(photoUrl);
      if (response.status !== 429) break;
      console.log(`Rate limited (attempt ${attempt + 1}/3), waiting ${(attempt + 1) * 500}ms...`);
      await new Promise(r => setTimeout(r, (attempt + 1) * 500));
    }

    if (!response || !response.ok) {
      console.error('Google photo fetch failed:', response?.status);
      return new Response(TRANSPARENT_PIXEL, {
        headers: { ...corsHeaders, 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache' },
      });
    }

    const imageData = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'image/jpeg';

    // === STORE in Supabase Storage (fire-and-forget, don't block response) ===
    supabase.storage
      .from(BUCKET)
      .upload(storagePath, imageData, { contentType, upsert: false })
      .then(({ error }) => {
        if (error && !error.message.includes('already exists')) {
          console.error('Storage upload error:', error.message);
        } else if (!error) {
          console.log('Cached to storage:', storagePath);
        }
      });

    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=2592000', // 30 days
        'X-Cache': 'MISS',
      },
    });

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
