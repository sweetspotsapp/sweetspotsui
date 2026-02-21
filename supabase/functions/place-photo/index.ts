import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const photoName = url.searchParams.get('photo_name');
    const maxWidth = url.searchParams.get('maxWidthPx') || '400';
    const maxHeight = url.searchParams.get('maxHeightPx') || '400';

    if (!photoName) {
      return new Response(
        JSON.stringify({ error: 'Missing photo_name parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY_BE');
    if (!googleMapsApiKey) {
      console.error('GOOGLE_MAPS_API_KEY_BE not configured');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the photo from Google Places API (New)
    const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}&key=${googleMapsApiKey}`;
    
    console.log('Fetching photo:', photoName);
    
    const response = await fetch(photoUrl);
    
    if (!response.ok) {
      console.error('Photo fetch failed:', response.status);
      // Return a 1x1 transparent pixel so the browser doesn't show a broken image icon
      const pixel = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
        0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21,
        0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
        0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x01, 0x44,
        0x00, 0x3b
      ]);
      return new Response(pixel, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Get the image data and content type
    const imageData = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'image/jpeg';

    // Return the image with proper headers
    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
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
