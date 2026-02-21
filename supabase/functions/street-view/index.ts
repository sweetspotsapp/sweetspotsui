import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY_BE');
    if (!GOOGLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');
    const width = url.searchParams.get('width') || '600';
    const height = url.searchParams.get('height') || '300';

    if (!lat || !lng) {
      return new Response(JSON.stringify({ error: 'Missing lat/lng params' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // First check metadata to see if Street View is available
    const metaUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${GOOGLE_API_KEY}`;
    const metaRes = await fetch(metaUrl);
    const meta = await metaRes.json();

    if (meta.status !== 'OK') {
      return new Response(JSON.stringify({ available: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the actual Street View image
    const imageUrl = `https://maps.googleapis.com/maps/api/streetview?size=${width}x${height}&location=${lat},${lng}&fov=90&pitch=10&key=${GOOGLE_API_KEY}`;
    const imageRes = await fetch(imageUrl);

    if (!imageRes.ok) {
      return new Response(JSON.stringify({ available: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const imageBuffer = await imageRes.arrayBuffer();
    return new Response(imageBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Street View error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
