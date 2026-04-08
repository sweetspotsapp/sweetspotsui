import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const QuerySchema = z.object({
  name: z.string().min(1).max(300),
  destination: z.string().min(1).max(200),
  index: z.number().int().min(0).max(100),
});
const BatchGeocodeSchema = z.object({
  queries: z.array(QuerySchema).min(1).max(30),
});

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

    const rawBody = await req.json();
    const parsed = BatchGeocodeSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { queries } = parsed.data;

    const results = await Promise.allSettled(
      queries.map(async (q) => {
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
