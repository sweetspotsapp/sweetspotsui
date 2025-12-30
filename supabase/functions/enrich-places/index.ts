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

interface Review {
  author_name: string;
  rating: number;
  text: string;
  relative_time: string;
  time: number;
}

interface OpeningHours {
  open_now: boolean;
  weekday_text: string[];
  periods?: Array<{
    open: { day: number; time: string };
    close?: { day: number; time: string };
  }>;
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
  photos: string[] | null;
  provider: string;
  ai_reason: string;
  ai_category: string;
  price_level: number | null;
  opening_hours: OpeningHours | null;
  reviews: Review[] | null;
  is_open_now: boolean | null;
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

    console.log(`Enriching ${places.length} AI-recommended places with full details`);

    const enrichedPlaces: EnrichedPlace[] = [];

    // Process places in parallel with rate limiting
    const batchSize = 5;
    for (let i = 0; i < places.length; i += batchSize) {
      const batch = places.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (aiPlace: AIPlace) => {
          try {
            // Search for the place using Google Places Text Search
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

            // Request ALL available fields for complete data
            const fieldMask = [
              'places.id',
              'places.displayName',
              'places.formattedAddress',
              'places.location',
              'places.types',
              'places.rating',
              'places.userRatingCount',
              'places.photos',
              'places.priceLevel',
              'places.regularOpeningHours',
              'places.reviews'
            ].join(',');

            const searchResponse = await fetch(searchUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_API_KEY,
                'X-Goog-FieldMask': fieldMask
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

            // Extract all photo references (up to 10)
            const photos: string[] = [];
            let primaryPhotoName: string | null = null;
            if (googlePlace.photos && googlePlace.photos.length > 0) {
              primaryPhotoName = googlePlace.photos[0].name;
              googlePlace.photos.slice(0, 10).forEach((photo: any) => {
                if (photo.name) {
                  photos.push(photo.name);
                }
              });
            }

            // Extract price level (convert from enum to number)
            let priceLevel: number | null = null;
            if (googlePlace.priceLevel) {
              const priceLevelMap: Record<string, number> = {
                'PRICE_LEVEL_FREE': 0,
                'PRICE_LEVEL_INEXPENSIVE': 1,
                'PRICE_LEVEL_MODERATE': 2,
                'PRICE_LEVEL_EXPENSIVE': 3,
                'PRICE_LEVEL_VERY_EXPENSIVE': 4,
              };
              priceLevel = priceLevelMap[googlePlace.priceLevel] ?? null;
            }

            // Extract opening hours
            let openingHours: OpeningHours | null = null;
            let isOpenNow: boolean | null = null;
            if (googlePlace.regularOpeningHours) {
              const regHours = googlePlace.regularOpeningHours;
              isOpenNow = regHours.openNow ?? null;
              openingHours = {
                open_now: regHours.openNow ?? false,
                weekday_text: regHours.weekdayDescriptions || [],
                periods: regHours.periods?.map((p: any) => ({
                  open: { day: p.open?.day, time: p.open?.hour?.toString().padStart(2, '0') + (p.open?.minute?.toString().padStart(2, '0') || '00') },
                  close: p.close ? { day: p.close.day, time: p.close.hour?.toString().padStart(2, '0') + (p.close.minute?.toString().padStart(2, '0') || '00') } : undefined
                }))
              };
            }

            // Extract reviews (up to 5)
            let reviews: Review[] | null = null;
            if (googlePlace.reviews && googlePlace.reviews.length > 0) {
              reviews = googlePlace.reviews.slice(0, 5).map((review: any) => ({
                author_name: review.authorAttribution?.displayName || 'Anonymous',
                rating: review.rating || 5,
                text: review.text?.text || '',
                relative_time: review.relativePublishTimeDescription || '',
                time: review.publishTime ? new Date(review.publishTime).getTime() / 1000 : Date.now() / 1000
              }));
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
              photo_name: primaryPhotoName,
              photos: photos.length > 0 ? photos : null,
              provider: 'google',
              ai_reason: aiPlace.reason,
              ai_category: aiPlace.category,
              price_level: priceLevel,
              opening_hours: openingHours,
              reviews: reviews,
              is_open_now: isOpenNow,
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

    console.log(`Successfully enriched ${enrichedPlaces.length}/${places.length} places with full data`);

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
        photos: place.photos,
        provider: place.provider,
        price_level: place.price_level,
        opening_hours: place.opening_hours,
        reviews: place.reviews,
        is_open_now: place.is_open_now,
        last_enriched_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from('places')
        .upsert(placesToInsert, { onConflict: 'place_id' });

      if (upsertError) {
        console.error('Error saving places to database:', upsertError);
      } else {
        console.log(`Saved ${placesToInsert.length} places to database with full data`);
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
