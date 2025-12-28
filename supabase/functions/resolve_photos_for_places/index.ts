import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  place_ids: string[];
  maxWidthPx: number;
}

interface PhotoResult {
  place_id: string;
  photo_url: string | null;
}

// Get photo URL from Google Places API
async function getPhotoUrl(photoName: string, maxWidthPx: number, apiKey: string): Promise<string | null> {
  try {
    const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true&key=${apiKey}`;
    const response = await fetch(photoUrl);
    
    if (!response.ok) {
      console.error(`Photo fetch failed for ${photoName}:`, response.status);
      return null;
    }
    
    const data = await response.json();
    return data.photoUri || null;
  } catch (error) {
    console.error(`Error fetching photo URL for ${photoName}:`, error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!googleMapsApiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { place_ids, maxWidthPx = 400 } = body;

    if (!place_ids || !Array.isArray(place_ids) || place_ids.length === 0) {
      return new Response(
        JSON.stringify({ photos: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Resolving photos for ${place_ids.length} places`);

    // Fetch photo_names for all place_ids
    const { data: places, error: placesError } = await supabaseClient
      .from('places')
      .select('place_id, photo_name')
      .in('place_id', place_ids);

    if (placesError) {
      console.error('Error fetching places:', placesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch places', details: placesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a map of place_id -> photo_name
    const photoNameMap = new Map<string, string | null>();
    for (const place of (places || [])) {
      photoNameMap.set(place.place_id, place.photo_name);
    }

    // Resolve photo URLs for each place
    const photos: PhotoResult[] = [];
    
    for (const placeId of place_ids) {
      const photoName = photoNameMap.get(placeId);
      
      if (!photoName) {
        // No photo_name for this place
        photos.push({ place_id: placeId, photo_url: null });
        continue;
      }

      // Get the photo URL from Google
      const photoUrl = await getPhotoUrl(photoName, maxWidthPx, googleMapsApiKey);
      photos.push({ place_id: placeId, photo_url: photoUrl });
    }

    console.log(`Resolved ${photos.filter(p => p.photo_url).length}/${photos.length} photo URLs`);
    
    return new Response(
      JSON.stringify({ photos }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
