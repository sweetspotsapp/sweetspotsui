import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  prompt: string;
  lat: number;
  lng: number;
  radius_m: number;
}

interface PlaceCandidate {
  place_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  categories: string[] | null;
  rating: number | null;
  ratings_total: number | null;
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

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

    if (!googleMapsApiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Client for user authentication
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

    console.log('Authenticated user:', user.id);

    // Service role client for upserting places (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Parse request body
    const body: RequestBody = await req.json();
    const { prompt, lat, lng, radius_m } = body;

    if (!prompt || lat === undefined || lng === undefined || radius_m === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: prompt, lat, lng, radius_m' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Search request:', { prompt, lat, lng, radius_m });

    // Use Places API (New) - Text Search
    const searchUrl = 'https://places.googleapis.com/v1/places:searchText';
    
    const requestBody = {
      textQuery: prompt,
      locationBias: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng
          },
          radius: radius_m
        }
      },
      maxResultCount: 20, // Max allowed per request for New API
      languageCode: "en"
    };

    console.log('Calling Places API (New)...');
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleMapsApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Places API error:', data);
      return new Response(
        JSON.stringify({ error: 'Places API error', details: data.error?.message || 'Unknown error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const places = data.places || [];
    console.log(`Fetched ${places.length} places`);

    // Extract and transform place data
    const candidates: PlaceCandidate[] = places.map((place: any) => ({
      place_id: place.id,
      name: place.displayName?.text || 'Unknown',
      address: place.formattedAddress || null,
      lat: place.location?.latitude || 0,
      lng: place.location?.longitude || 0,
      categories: place.types || null,
      rating: place.rating || null,
      ratings_total: place.userRatingCount || null,
    }));

    // Upsert places into database using service role (bypasses RLS)
    const placesToUpsert = places.map((place: any) => ({
      place_id: place.id,
      name: place.displayName?.text || 'Unknown',
      address: place.formattedAddress || null,
      lat: place.location?.latitude || 0,
      lng: place.location?.longitude || 0,
      categories: place.types || null,
      rating: place.rating || null,
      ratings_total: place.userRatingCount || null,
      provider: 'google',
      raw: place,
      last_enriched_at: new Date().toISOString(),
    }));

    if (placesToUpsert.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('places')
        .upsert(placesToUpsert, { onConflict: 'place_id' });

      if (upsertError) {
        console.error('Error upserting places:', upsertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save places', details: upsertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log(`Upserted ${placesToUpsert.length} places`);
    }

    // Insert search record using user's client (respects RLS)
    const { error: searchError } = await supabaseClient
      .from('searches')
      .insert({
        user_id: user.id,
        prompt,
        lat,
        lng,
        created_at: new Date().toISOString(),
      });

    if (searchError) {
      console.error('Error inserting search:', searchError);
    } else {
      console.log('Search record inserted');
    }

    // Return response
    const placeIds = candidates.map(c => c.place_id);
    
    console.log('Returning', candidates.length, 'candidates');
    return new Response(
      JSON.stringify({ place_ids: placeIds, candidates }),
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
