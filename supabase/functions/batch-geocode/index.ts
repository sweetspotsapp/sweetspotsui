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
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY_BE');
    if (!googleMapsApiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { queries } = await req.json();
    if (!Array.isArray(queries) || queries.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Limit to 30 queries max
    const limited = queries.slice(0, 30);

    const results = await Promise.allSettled(
      limited.map(async (q: { name: string; destination: string; index: number }) => {
        const query = `${q.name} ${q.destination}`;
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${googleMapsApiKey}`;
        const res = await fetch(url);
        const json = await res.json();
        const place = json.results?.[0];
        if (place) {
          return {
            index: q.index,
            lat: place.geometry?.location?.lat,
            lng: place.geometry?.location?.lng,
            placeId: place.place_id,
            address: place.formatted_address,
            photoName: place.photos?.[0]?.photo_reference || null,
          };
        }
        return null;
      })
    );

    const enriched = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);

    return new Response(JSON.stringify({ results: enriched }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Batch geocode error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
