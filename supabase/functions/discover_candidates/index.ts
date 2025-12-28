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

interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
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

    // Call Google Places Text Search API
    const allPlaces: GooglePlace[] = [];
    let nextPageToken: string | null = null;
    const maxResults = 60;

    do {
      const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
      searchUrl.searchParams.set('query', prompt);
      searchUrl.searchParams.set('location', `${lat},${lng}`);
      searchUrl.searchParams.set('radius', radius_m.toString());
      searchUrl.searchParams.set('key', googleMapsApiKey);
      
      if (nextPageToken) {
        searchUrl.searchParams.set('pagetoken', nextPageToken);
      }

      console.log('Calling Google Places API...');
      const response = await fetch(searchUrl.toString());
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('Google Places API error:', data.status, data.error_message);
        return new Response(
          JSON.stringify({ error: `Google Places API error: ${data.status}`, details: data.error_message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (data.results) {
        allPlaces.push(...data.results);
        console.log(`Fetched ${data.results.length} places, total: ${allPlaces.length}`);
      }

      nextPageToken = data.next_page_token || null;

      // Google requires a short delay before using next_page_token
      if (nextPageToken && allPlaces.length < maxResults) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } while (nextPageToken && allPlaces.length < maxResults);

    // Limit to max 60 results
    const limitedPlaces = allPlaces.slice(0, maxResults);
    console.log(`Processing ${limitedPlaces.length} places`);

    // Extract and transform place data
    const candidates: PlaceCandidate[] = limitedPlaces.map((place) => ({
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address || null,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      categories: place.types || null,
      rating: place.rating || null,
      ratings_total: place.user_ratings_total || null,
    }));

    // Upsert places into database using service role (bypasses RLS)
    const placesToUpsert = limitedPlaces.map((place) => ({
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address || null,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      categories: place.types || null,
      rating: place.rating || null,
      ratings_total: place.user_ratings_total || null,
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
      // Don't fail the whole request, just log the error
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
