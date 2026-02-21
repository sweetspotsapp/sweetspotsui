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

interface PlaceInsights {
  insider_tips: string[];
  signature_items: string[];
  unique_vibes: string;
  best_for: string[];
  local_secrets: string;
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
  filter_tags: string[] | null;
  insider_tips: string[] | null;
  signature_items: string[] | null;
  unique_vibes: string | null;
  best_for: string[] | null;
  local_secrets: string | null;
}

// Valid filter tags that can be generated
const VALID_FILTER_TAGS = [
  'halal',
  'vegetarian-vegan',
  'gluten-free',
  'free-wifi',
  'outdoor-seating',
  'parking',
  'wheelchair-accessible',
  'pet-friendly',
  'family-friendly',
  'late-night',
  'large-groups',
];

/**
 * Extract verified filter tags from Google Places API structured attributes
 */
function extractGoogleFilterTags(googlePlace: any): string[] {
  const tags: string[] = [];
  
  if (googlePlace.outdoorSeating === true) tags.push('outdoor-seating');
  if (googlePlace.allowsDogs === true) tags.push('pet-friendly');
  if (googlePlace.goodForChildren === true) tags.push('family-friendly');
  if (googlePlace.servesVegetarianFood === true) tags.push('vegetarian-vegan');
  
  // Parking options - any parking counts
  if (googlePlace.parkingOptions) {
    const p = googlePlace.parkingOptions;
    if (p.freeParkingLot || p.paidParkingLot || p.freeStreetParking || 
        p.paidStreetParking || p.valetParking || p.freeGarageParking || p.paidGarageParking) {
      tags.push('parking');
    }
  }
  
  // Accessibility
  if (googlePlace.accessibilityOptions) {
    if (googlePlace.accessibilityOptions.wheelchairAccessibleEntrance === true) {
      tags.push('wheelchair-accessible');
    }
  }
  
  return tags;
}

/**
 * Generate filter tags for a batch of places using Lovable AI
 */
async function generateFilterTags(
  places: Array<{
    name: string;
    categories: string[] | null;
    price_level: number | null;
    opening_hours: OpeningHours | null;
    reviews: Review[] | null;
    ai_reason: string;
  }>
): Promise<Map<string, string[]>> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured, skipping filter tag generation');
    return new Map();
  }

  const results = new Map<string, string[]>();

  try {
    // Build prompt for batch processing
    const placesInfo = places.map((p, idx) => {
      const reviewSnippets = (p.reviews || [])
        .slice(0, 2)
        .map(r => r.text.slice(0, 100))
        .join(' | ');
      
      const hoursText = p.opening_hours?.weekday_text?.join(', ') || 'Unknown hours';
      
      return `[${idx}] "${p.name}"
Categories: ${(p.categories || []).join(', ') || 'None'}
Price Level: ${p.price_level ?? 'Unknown'}
Hours: ${hoursText}
Reviews: ${reviewSnippets || 'None'}
AI Description: ${p.ai_reason || 'None'}`;
    }).join('\n\n');

    const systemPrompt = `You are a place categorization expert. Analyze each place and determine which filter tags apply based on the provided information. Be generous but reasonable. ONLY assign tags that are NOT already provided as "Known tags" — those are verified from Google and already included.

Valid tags and their meanings:
- halal: Halal-certified or serves halal food
- vegetarian-vegan: Vegetarian or vegan options available
- gluten-free: Gluten-free options available
- free-wifi: Free WiFi available for customers
- outdoor-seating: Patio, terrace, garden seating, alfresco dining
- parking: Has parking lot, valet, or dedicated parking
- wheelchair-accessible: Wheelchair accessible entrance and facilities
- pet-friendly: Dogs allowed, pet-welcoming, outdoor pet area
- family-friendly: Kids welcome, family activities, kid-friendly food
- late-night: Open after 10pm, 24 hours, midnight operations
- large-groups: Can accommodate large groups, group dining, event space

Respond with a JSON object where keys are the place indices (0, 1, 2...) and values are arrays of ADDITIONAL applicable tags (don't repeat Known tags).
Example: {"0": ["halal", "large-groups"], "1": ["free-wifi"], "2": []}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze these places and return filter tags:\n\n${placesInfo}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('AI filter tag generation failed:', response.status, await response.text());
      return results;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    
    // Map indices back to place names and validate tags
    places.forEach((place, idx) => {
      const tags = parsed[String(idx)] || [];
      const validTags = tags.filter((t: string) => VALID_FILTER_TAGS.includes(t));
      results.set(place.name, validTags);
    });

    console.log(`Generated filter tags for ${results.size} places`);
  } catch (error) {
    console.error('Error generating filter tags:', error);
  }

  return results;
}

/**
 * Generate unique AI insights for a place using Lovable AI
 */
async function generatePlaceInsights(
  place: {
    name: string;
    categories: string[] | null;
    price_level: number | null;
    address: string | null;
    reviews: Review[] | null;
  }
): Promise<PlaceInsights | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured, skipping insight generation');
    return null;
  }

  try {
    const reviewTexts = (place.reviews || [])
      .slice(0, 5)
      .map(r => `"${r.text.slice(0, 200)}" (${r.rating}★)`)
      .join('\n');

    const priceLabel = place.price_level !== null 
      ? ['Free', 'Budget', 'Moderate', 'Upscale', 'Fine Dining'][place.price_level] || 'Unknown'
      : 'Unknown';

    const systemPrompt = `You are a local insider who writes about hidden gems and unique experiences. Your job is to extract UNIQUE, SPECIFIC insights that differentiate this place from competitors. Avoid generic phrases like "great food" or "nice atmosphere" - be SPECIFIC.

Analyze the reviews and place info to generate:
1. insider_tips: 2-3 specific tips only a local would know (e.g., "Ask for a table by the window for sunset views", "The secret menu has a spicy tuna not listed")
2. signature_items: 1-2 must-try items specifically mentioned in reviews (e.g., "Lavender honey latte", "The truffle fries")  
3. unique_vibes: ONE sentence capturing what makes this place DIFFERENT (e.g., "Feels like a hidden speakeasy from the 1920s")
4. best_for: 2-3 specific occasions this place is perfect for (e.g., "First dates", "Remote work", "Catch-ups with old friends")
5. local_secrets: One insider secret or hidden feature (e.g., "Ask for the off-menu spicy roll")

If reviews don't provide enough detail for a field, make an educated inference based on the category, location, and price level - but keep it plausible.

Return ONLY valid JSON in this exact format:
{
  "insider_tips": ["tip1", "tip2"],
  "signature_items": ["item1", "item2"],
  "unique_vibes": "one sentence",
  "best_for": ["occasion1", "occasion2"],
  "local_secrets": "one secret"
}`;

    const userPrompt = `Analyze this place and generate unique insights:

Place: ${place.name}
Categories: ${(place.categories || []).join(', ') || 'Unknown'}
Price Level: ${priceLabel}
Location: ${place.address || 'Unknown'}

Reviews:
${reviewTexts || 'No reviews available - make educated inferences based on category and price level'}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('AI insight generation failed:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    const parsed = JSON.parse(jsonStr) as PlaceInsights;
    console.log(`Generated insights for "${place.name}"`);
    return parsed;
  } catch (error) {
    console.error('Error generating place insights:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { places, lat, lng, placeId } = await req.json();

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY_BE');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY_BE not configured');
    }

    // Initialize Supabase client for saving places
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle direct placeId lookup (for places not in our database yet)
    if (placeId) {
      console.log(`Fetching place details directly for placeId: ${placeId}`);
      
      try {
        const fieldMask = [
          'id', 'displayName', 'formattedAddress', 'location', 'types',
          'rating', 'userRatingCount', 'photos', 'priceLevel',
          'regularOpeningHours', 'reviews',
          'outdoorSeating', 'allowsDogs', 'goodForChildren',
          'servesVegetarianFood', 'parkingOptions', 'accessibilityOptions'
        ].join(',');

        const detailsResponse = await fetch(
          `https://places.googleapis.com/v1/places/${placeId}?languageCode=en`,
          {
            method: 'GET',
            headers: {
              'X-Goog-Api-Key': GOOGLE_API_KEY,
              'X-Goog-FieldMask': fieldMask
            }
          }
        );

        if (!detailsResponse.ok) {
          console.error('Google place details failed:', await detailsResponse.text());
          return new Response(JSON.stringify({ places: [], found: 0, total: 1 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const googlePlace = await detailsResponse.json();
        
        // Extract photos
        const photos: string[] = [];
        let primaryPhotoName: string | null = null;
        if (googlePlace.photos && googlePlace.photos.length > 0) {
          primaryPhotoName = googlePlace.photos[0].name;
          googlePlace.photos.slice(0, 10).forEach((photo: any) => {
            if (photo.name) photos.push(photo.name);
          });
        }

        // Extract price level
        let priceLevel: number | null = null;
        if (googlePlace.priceLevel) {
          const priceLevelMap: Record<string, number> = {
            'PRICE_LEVEL_FREE': 0, 'PRICE_LEVEL_INEXPENSIVE': 1,
            'PRICE_LEVEL_MODERATE': 2, 'PRICE_LEVEL_EXPENSIVE': 3,
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
          };
        }

        // Extract reviews
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

        const enrichedPlace: EnrichedPlace = {
          place_id: googlePlace.id || placeId,
          name: googlePlace.displayName?.text || 'Unknown Place',
          address: googlePlace.formattedAddress || null,
          lat: googlePlace.location?.latitude || null,
          lng: googlePlace.location?.longitude || null,
          categories: googlePlace.types || null,
          rating: googlePlace.rating || null,
          ratings_total: googlePlace.userRatingCount || null,
          photo_name: primaryPhotoName,
          photos: photos.length > 0 ? photos : null,
          provider: 'google',
          ai_reason: '',
          ai_category: '',
          price_level: priceLevel,
          opening_hours: openingHours,
          reviews: reviews,
          is_open_now: isOpenNow,
          filter_tags: extractGoogleFilterTags(googlePlace),
          insider_tips: null,
          signature_items: null,
          unique_vibes: null,
          best_for: null,
          local_secrets: null,
        };

        // Generate filter tags for this single place
        const filterTagsMap = await generateFilterTags([{
          name: enrichedPlace.name,
          categories: enrichedPlace.categories,
          price_level: enrichedPlace.price_level,
          opening_hours: enrichedPlace.opening_hours,
          reviews: enrichedPlace.reviews,
          ai_reason: enrichedPlace.ai_reason,
        }]);
        const aiTags = filterTagsMap.get(enrichedPlace.name) || [];
        const googleTags = enrichedPlace.filter_tags || [];
        const mergedTags = [...new Set([...googleTags, ...aiTags])];
        enrichedPlace.filter_tags = mergedTags.length > 0 ? mergedTags : null;

        // Generate AI insights for this place
        const insights = await generatePlaceInsights({
          name: enrichedPlace.name,
          categories: enrichedPlace.categories,
          price_level: enrichedPlace.price_level,
          address: enrichedPlace.address,
          reviews: enrichedPlace.reviews,
        });
        if (insights) {
          enrichedPlace.insider_tips = insights.insider_tips;
          enrichedPlace.signature_items = insights.signature_items;
          enrichedPlace.unique_vibes = insights.unique_vibes;
          enrichedPlace.best_for = insights.best_for;
          enrichedPlace.local_secrets = insights.local_secrets;
        }

        // Save to database
        const { error: upsertError } = await supabase
          .from('places')
          .upsert({
            place_id: enrichedPlace.place_id,
            name: enrichedPlace.name,
            address: enrichedPlace.address,
            lat: enrichedPlace.lat,
            lng: enrichedPlace.lng,
            categories: enrichedPlace.categories,
            rating: enrichedPlace.rating,
            ratings_total: enrichedPlace.ratings_total,
            photo_name: enrichedPlace.photo_name,
            photos: enrichedPlace.photos,
            provider: enrichedPlace.provider,
            price_level: enrichedPlace.price_level,
            opening_hours: enrichedPlace.opening_hours,
            reviews: enrichedPlace.reviews,
            is_open_now: enrichedPlace.is_open_now,
            filter_tags: enrichedPlace.filter_tags,
            insider_tips: enrichedPlace.insider_tips,
            signature_items: enrichedPlace.signature_items,
            unique_vibes: enrichedPlace.unique_vibes,
            best_for: enrichedPlace.best_for,
            local_secrets: enrichedPlace.local_secrets,
            last_enriched_at: new Date().toISOString(),
          }, { onConflict: 'place_id' });

        if (upsertError) {
          console.error('Error saving place to database:', upsertError);
        } else {
          console.log(`Saved place ${enrichedPlace.name} to database with filter_tags:`, enrichedPlace.filter_tags);
        }

        return new Response(JSON.stringify({ 
          places: [enrichedPlace],
          found: 1,
          total: 1
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error) {
        console.error('Error fetching place by ID:', error);
        return new Response(JSON.stringify({ places: [], found: 0, total: 1 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (!places || !Array.isArray(places) || places.length === 0) {
      return new Response(JSON.stringify({ error: 'Places array or placeId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Enriching ${places.length} AI-recommended places with smart caching`);

    // ========== SMART CACHING: Check database first ==========
    const CACHE_FRESHNESS_DAYS = 7;
    const freshnessThreshold = new Date();
    freshnessThreshold.setDate(freshnessThreshold.getDate() - CACHE_FRESHNESS_DAYS);

    // Get all place names for lookup
    const placeNames = places.map((p: AIPlace) => p.name);
    
    // Query database for existing places matching these names
    console.log(`Checking cache for ${placeNames.length} places...`);
    
    const { data: cachedPlaces, error: cacheError } = await supabase
      .from('places')
      .select('*')
      .or(placeNames.map(name => `name.ilike.%${name.replace(/'/g, "''")}%`).join(','));

    if (cacheError) {
      console.error('Cache lookup error:', cacheError);
    }

    // Build a map of cached places by normalized name for quick lookup
    const cachedPlacesMap = new Map<string, any>();
    const freshCachedPlaces: EnrichedPlace[] = [];
    
    if (cachedPlaces && cachedPlaces.length > 0) {
      for (const cached of cachedPlaces) {
        const normalizedName = cached.name.toLowerCase().trim();
        const lastEnriched = cached.last_enriched_at ? new Date(cached.last_enriched_at) : null;
        const hasCriticalData = cached.opening_hours || cached.reviews;
        const hasMultiplePhotos = cached.photos && cached.photos.length > 1;
        const isFresh = lastEnriched && lastEnriched > freshnessThreshold && hasCriticalData && hasMultiplePhotos;
        
        if (isFresh) {
          cachedPlacesMap.set(normalizedName, cached);
        } else if (lastEnriched && (!hasCriticalData || !hasMultiplePhotos)) {
          console.log(`Cache STALE (missing data or photos): "${cached.name}" - will re-fetch`);
        }
      }
      console.log(`Found ${cachedPlacesMap.size} fresh cached places (< ${CACHE_FRESHNESS_DAYS} days old with complete data and multiple photos)`);
    }

    // Determine which places need fresh data from Google
    const placesToFetch: AIPlace[] = [];
    const placeNameToAIPlace = new Map<string, AIPlace>();
    
    for (const aiPlace of places as AIPlace[]) {
      const normalizedName = aiPlace.name.toLowerCase().trim();
      placeNameToAIPlace.set(normalizedName, aiPlace);
      
      // Check if we have a fresh cached version
      let foundCached = false;
      for (const [cachedName, cachedPlace] of cachedPlacesMap) {
        // Fuzzy match: check if names are similar enough
        if (cachedName.includes(normalizedName) || normalizedName.includes(cachedName) || 
            cachedName === normalizedName) {
          // Use cached data, but update ai_reason from current search
          const enrichedFromCache: EnrichedPlace = {
            place_id: cachedPlace.place_id,
            name: cachedPlace.name,
            address: cachedPlace.address,
            lat: cachedPlace.lat,
            lng: cachedPlace.lng,
            categories: cachedPlace.categories,
            rating: cachedPlace.rating,
            ratings_total: cachedPlace.ratings_total,
            photo_name: cachedPlace.photo_name,
            photos: cachedPlace.photos,
            provider: cachedPlace.provider || 'google',
            ai_reason: aiPlace.reason, // Use fresh AI reason
            ai_category: aiPlace.category,
            price_level: cachedPlace.price_level,
            opening_hours: cachedPlace.opening_hours,
            reviews: cachedPlace.reviews,
            is_open_now: cachedPlace.is_open_now,
            filter_tags: cachedPlace.filter_tags,
            insider_tips: cachedPlace.insider_tips || null,
            signature_items: cachedPlace.signature_items || null,
            unique_vibes: cachedPlace.unique_vibes || null,
            best_for: cachedPlace.best_for || null,
            local_secrets: cachedPlace.local_secrets || null,
          };
          freshCachedPlaces.push(enrichedFromCache);
          foundCached = true;
          console.log(`Cache HIT: "${aiPlace.name}"`);
          break;
        }
      }
      
      if (!foundCached) {
        placesToFetch.push(aiPlace);
        console.log(`Cache MISS: "${aiPlace.name}" - will fetch from Google`);
      }
    }

    console.log(`Cache summary: ${freshCachedPlaces.length} hits, ${placesToFetch.length} misses`);

    // ========== Fetch missing/stale places from Google ==========
    const newlyEnrichedPlaces: EnrichedPlace[] = [];

    if (placesToFetch.length > 0) {
      console.log(`Fetching ${placesToFetch.length} places from Google API...`);
      
      // Process places in parallel with rate limiting
      const batchSize = 5;
      for (let i = 0; i < placesToFetch.length; i += batchSize) {
        const batch = placesToFetch.slice(i, i + batchSize);
        
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
                'places.reviews',
                'places.outdoorSeating',
                'places.allowsDogs',
                'places.goodForChildren',
                'places.servesVegetarianFood',
                'places.parkingOptions',
                'places.accessibilityOptions'
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
                filter_tags: extractGoogleFilterTags(googlePlace), // Google-verified tags, AI will add more
                insider_tips: null, // Will be populated later
                signature_items: null,
                unique_vibes: null,
                best_for: null,
                local_secrets: null,
              } as EnrichedPlace;

            } catch (error) {
              console.error(`Error enriching "${aiPlace.name}":`, error);
              return null;
            }
          })
        );

        // Add successful results
        newlyEnrichedPlaces.push(...batchResults.filter((p): p is EnrichedPlace => p !== null));
        
        // Small delay between batches to respect rate limits
        if (i + batchSize < placesToFetch.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`Successfully fetched ${newlyEnrichedPlaces.length}/${placesToFetch.length} places from Google`);

      // Generate filter tags and AI insights for newly enriched places
      if (newlyEnrichedPlaces.length > 0) {
        const tagBatchSize = 10;
        for (let i = 0; i < newlyEnrichedPlaces.length; i += tagBatchSize) {
          const batch = newlyEnrichedPlaces.slice(i, i + tagBatchSize);
          const filterTagsMap = await generateFilterTags(batch.map(p => ({
            name: p.name,
            categories: p.categories,
            price_level: p.price_level,
            opening_hours: p.opening_hours,
            reviews: p.reviews,
            ai_reason: p.ai_reason,
          })));
          
          // Merge Google-verified tags with AI-inferred tags
          batch.forEach(place => {
            const aiTags = filterTagsMap.get(place.name) || [];
            const googleTags = place.filter_tags || [];
            const mergedTags = [...new Set([...googleTags, ...aiTags])];
            place.filter_tags = mergedTags.length > 0 ? mergedTags : null;
          });
        }

        // Generate AI insights for each place (individually for quality)
        for (const place of newlyEnrichedPlaces) {
          const insights = await generatePlaceInsights({
            name: place.name,
            categories: place.categories,
            price_level: place.price_level,
            address: place.address,
            reviews: place.reviews,
          });
          if (insights) {
            place.insider_tips = insights.insider_tips;
            place.signature_items = insights.signature_items;
            place.unique_vibes = insights.unique_vibes;
            place.best_for = insights.best_for;
            place.local_secrets = insights.local_secrets;
          }
        }
      }

      // Save newly enriched places to database
      if (newlyEnrichedPlaces.length > 0) {
        const placesToInsert = newlyEnrichedPlaces.map(place => ({
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
          ai_reason: place.ai_reason,
          filter_tags: place.filter_tags,
          insider_tips: place.insider_tips,
          signature_items: place.signature_items,
          unique_vibes: place.unique_vibes,
          best_for: place.best_for,
          local_secrets: place.local_secrets,
          last_enriched_at: new Date().toISOString(),
        }));

        const { error: upsertError } = await supabase
          .from('places')
          .upsert(placesToInsert, { onConflict: 'place_id' });

        if (upsertError) {
          console.error('Error saving places to database:', upsertError);
        } else {
          console.log(`Saved ${placesToInsert.length} NEW places to database with AI insights`);
        }
      }
    }

    // ========== Combine cached + newly fetched places ==========
    const enrichedPlaces = [...freshCachedPlaces, ...newlyEnrichedPlaces];
    console.log(`Total results: ${enrichedPlaces.length} (${freshCachedPlaces.length} cached + ${newlyEnrichedPlaces.length} fresh)`);

    // Preserve original order from AI recommendations
    const orderedPlaces: EnrichedPlace[] = [];
    for (const aiPlace of places as AIPlace[]) {
      const match = enrichedPlaces.find(p => 
        p.name.toLowerCase().includes(aiPlace.name.toLowerCase()) ||
        aiPlace.name.toLowerCase().includes(p.name.toLowerCase())
      );
      if (match && !orderedPlaces.includes(match)) {
        orderedPlaces.push(match);
      }
    }
    // Add any remaining places not matched by order
    for (const place of enrichedPlaces) {
      if (!orderedPlaces.includes(place)) {
        orderedPlaces.push(place);
      }
    }

    return new Response(JSON.stringify({ 
      places: orderedPlaces,
      found: orderedPlaces.length,
      total: places.length,
      cached: freshCachedPlaces.length,
      fresh: newlyEnrichedPlaces.length,
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
