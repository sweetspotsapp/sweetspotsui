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
  max_results?: number; // Optional: max places to fetch (default 60, max 60)
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
  photo_name: string | null;
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
    const { prompt, lat, lng, radius_m, max_results = 60 } = body;

    if (!prompt || lat === undefined || lng === undefined || radius_m === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: prompt, lat, lng, radius_m' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cap max_results at 60 (Google's practical limit with pagination)
    const targetResults = Math.min(max_results, 60);
    const maxPages = Math.ceil(targetResults / 20); // Up to 3 pages

    console.log('Search request:', { prompt, lat, lng, radius_m, targetResults, maxPages });

    // Use Places API (New) - Text Search with pagination
    const searchUrl = 'https://places.googleapis.com/v1/places:searchText';
    
    let allPlaces: any[] = [];
    let nextPageToken: string | null = null;

    for (let page = 0; page < maxPages; page++) {
      const requestBody: any = {
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
        pageSize: 20,
        languageCode: "en"
      };

      // Add page token for subsequent requests
      if (nextPageToken) {
        requestBody.pageToken = nextPageToken;
      }

      console.log(`Calling Places API (New) - Page ${page + 1}/${maxPages}...`);
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleMapsApiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.photos,nextPageToken'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Places API error:', data);
        // If first page fails, return error; otherwise continue with what we have
        if (page === 0) {
          return new Response(
            JSON.stringify({ error: 'Places API error', details: data.error?.message || 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      }

      const places = data.places || [];
      allPlaces = allPlaces.concat(places);
      console.log(`Page ${page + 1}: Fetched ${places.length} places (total: ${allPlaces.length})`);

      // Get next page token
      nextPageToken = data.nextPageToken || null;

      // Stop if no more pages or we have enough results
      if (!nextPageToken || allPlaces.length >= targetResults) {
        break;
      }

      // Small delay between pagination requests (Google recommends this)
      if (nextPageToken) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`Total fetched: ${allPlaces.length} places`);

    // Extract and transform place data - include first photo name
    const candidates: PlaceCandidate[] = allPlaces.map((place: any) => {
      const firstPhoto = place.photos?.[0];
      return {
        place_id: place.id,
        name: place.displayName?.text || 'Unknown',
        address: place.formattedAddress || null,
        lat: place.location?.latitude || 0,
        lng: place.location?.longitude || 0,
        categories: place.types || null,
        rating: place.rating || null,
        ratings_total: place.userRatingCount || null,
        photo_name: firstPhoto?.name || null,
      };
    });

    // Upsert places into database using service role (bypasses RLS)
    const placesToUpsert = allPlaces.map((place: any) => {
      const firstPhoto = place.photos?.[0];
      return {
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
        photo_name: firstPhoto?.name || null,
        last_enriched_at: new Date().toISOString(),
      };
    });

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
    
    console.log('Returning', candidates.length, 'candidates with photos');
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