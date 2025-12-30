import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIPlace {
  name: string;
  reason: string;
  category: string;
}

interface EnrichedPlace {
  place_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  categories: string[] | null;
  rating: number | null;
  ratings_total: number | null;
  photo_name: string | null;
  provider: string;
  ai_reason: string;
  ai_category: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { places, lat, lng } = await req.json();

    if (!places || !Array.isArray(places) || places.length === 0) {
      return new Response(JSON.stringify({ error: 'Places array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY not configured');
    }

    // Initialize Supabase client for saving places
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Enriching ${places.length} AI-recommended places`);

    const enrichedPlaces: EnrichedPlace[] = [];

    // Process places in parallel with rate limiting
    const batchSize = 5;
    for (let i = 0; i < places.length; i += batchSize) {
      const batch = places.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (aiPlace: AIPlace) => {
          try {
            // Search for the place using Google Places Text Search
            const searchQuery = encodeURIComponent(aiPlace.name);
            let searchUrl = `https://places.googleapis.com/v1/places:searchText`;
            
            const searchBody: any = {
              textQuery: aiPlace.name,
              maxResultCount: 1,
            };
            
            // Add location bias if coordinates provided
            if (lat && lng) {
              searchBody.locationBias = {
                circle: {
                  center: { latitude: lat, longitude: lng },
                  radius: 50000 // 50km radius
                }
              };
            }

            const searchResponse = await fetch(searchUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_API_KEY,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.photos'
              },
              body: JSON.stringify(searchBody)
            });

            if (!searchResponse.ok) {
              console.error(`Google search failed for "${aiPlace.name}":`, await searchResponse.text());
              return null;
            }

            const searchData = await searchResponse.json();
            const googlePlace = searchData.places?.[0];

            if (!googlePlace) {
              console.log(`No Google result for: ${aiPlace.name}`);
              return null;
            }

            // Extract photo reference
            let photoName: string | null = null;
            if (googlePlace.photos && googlePlace.photos.length > 0) {
              photoName = googlePlace.photos[0].name;
            }

            return {
              place_id: googlePlace.id,
              name: googlePlace.displayName?.text || aiPlace.name,
              address: googlePlace.formattedAddress || null,
              lat: googlePlace.location?.latitude || null,
              lng: googlePlace.location?.longitude || null,
              categories: googlePlace.types || [aiPlace.category],
              rating: googlePlace.rating || null,
              ratings_total: googlePlace.userRatingCount || null,
              photo_name: photoName,
              provider: 'google',
              ai_reason: aiPlace.reason,
              ai_category: aiPlace.category,
            } as EnrichedPlace;

          } catch (error) {
            console.error(`Error enriching "${aiPlace.name}":`, error);
            return null;
          }
        })
      );

      // Add successful results
      enrichedPlaces.push(...batchResults.filter((p): p is EnrichedPlace => p !== null));
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < places.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Successfully enriched ${enrichedPlaces.length}/${places.length} places`);

    // Save enriched places to database (upsert to avoid duplicates)
    if (enrichedPlaces.length > 0) {
      const placesToInsert = enrichedPlaces.map(place => ({
        place_id: place.place_id,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        categories: place.categories,
        rating: place.rating,
        ratings_total: place.ratings_total,
        photo_name: place.photo_name,
        provider: place.provider,
        last_enriched_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from('places')
        .upsert(placesToInsert, { onConflict: 'place_id' });

      if (upsertError) {
        console.error('Error saving places to database:', upsertError);
        // Continue anyway - places will still be returned to the client
      } else {
        console.log(`Saved ${placesToInsert.length} places to database`);
      }
    }

    return new Response(JSON.stringify({ 
      places: enrichedPlaces,
      found: enrichedPlaces.length,
      total: places.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('enrich-places error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to enrich places' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
