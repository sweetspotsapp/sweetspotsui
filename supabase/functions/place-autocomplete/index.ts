const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input } = await req.json();

    if (!input || input.length < 2) {
      return new Response(
        JSON.stringify({ predictions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY_BE');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Places API (New) - Autocomplete endpoint
    const url = 'https://places.googleapis.com/v1/places:autocomplete';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Google Autocomplete (New) error:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ predictions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const predictions = (data.suggestions || [])
      .filter((s: any) => s.placePrediction)
      .slice(0, 8)
      .map((s: any) => {
        const p = s.placePrediction;
        return {
          description: p.text?.text || '',
          place_id: p.placeId || '',
          main_text: p.structuredFormat?.mainText?.text || p.text?.text || '',
          secondary_text: p.structuredFormat?.secondaryText?.text || '',
        };
      });

    return new Response(
      JSON.stringify({ predictions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Autocomplete error:', error);
    return new Response(
      JSON.stringify({ predictions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
