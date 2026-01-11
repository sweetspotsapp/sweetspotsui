import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeIds, boardName, userLat, userLng, limit = 5 } = await req.json();

    console.log('Suggest places request:', { placeIds, boardName, limit });

    if (!placeIds || placeIds.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the saved places to understand what the user likes
    const { data: savedPlaces, error: placesError } = await supabase
      .from('places')
      .select('*')
      .in('place_id', placeIds);

    if (placesError) {
      console.error('Error fetching saved places:', placesError);
      throw placesError;
    }

    if (!savedPlaces || savedPlaces.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Found saved places:', savedPlaces.length);

    // Extract characteristics from saved places
    const categories = new Set<string>();
    const filterTags = new Set<string>();
    let avgRating = 0;
    let avgPriceLevel = 0;
    let priceCount = 0;
    
    // Calculate centroid of saved places for location-based suggestions
    let centroidLat = 0;
    let centroidLng = 0;
    let locationCount = 0;

    savedPlaces.forEach(place => {
      if (place.categories) {
        place.categories.forEach((cat: string) => categories.add(cat));
      }
      if (place.filter_tags) {
        place.filter_tags.forEach((tag: string) => filterTags.add(tag));
      }
      if (place.rating) {
        avgRating += place.rating;
      }
      if (place.price_level) {
        avgPriceLevel += place.price_level;
        priceCount++;
      }
      // Accumulate coordinates for centroid
      if (place.lat && place.lng) {
        centroidLat += place.lat;
        centroidLng += place.lng;
        locationCount++;
      }
    });

    avgRating = avgRating / savedPlaces.length;
    avgPriceLevel = priceCount > 0 ? avgPriceLevel / priceCount : 2;
    
    // Calculate centroid
    const hasCentroid = locationCount > 0;
    if (hasCentroid) {
      centroidLat = centroidLat / locationCount;
      centroidLng = centroidLng / locationCount;
    }

    console.log('Extracted characteristics:', {
      categories: Array.from(categories),
      filterTags: Array.from(filterTags),
      avgRating,
      avgPriceLevel,
      centroid: hasCentroid ? { lat: centroidLat, lng: centroidLng } : null
    });

    // Haversine distance calculation (in km)
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Build a query to find similar places
    let query = supabase
      .from('places')
      .select('*')
      .not('place_id', 'in', `(${placeIds.join(',')})`) // Exclude already saved places
      .gte('rating', Math.max(3.5, avgRating - 0.5)) // Similar or better rating
      .order('rating', { ascending: false })
      .limit(limit * 5); // Fetch more to filter and score by distance

    // If we have filter tags, try to match them
    if (filterTags.size > 0) {
      query = query.overlaps('filter_tags', Array.from(filterTags));
    }

    const { data: candidates, error: candidatesError } = await query;

    if (candidatesError) {
      console.error('Error fetching candidates:', candidatesError);
      throw candidatesError;
    }

    console.log('Found candidates:', candidates?.length || 0);

    // If no candidates with overlapping tags, try broader search
    let finalCandidates = candidates || [];
    if (finalCandidates.length < limit) {
      const { data: broaderCandidates } = await supabase
        .from('places')
        .select('*')
        .not('place_id', 'in', `(${placeIds.join(',')})`)
        .gte('rating', 4.0)
        .order('rating', { ascending: false })
        .limit(limit * 3);

      if (broaderCandidates) {
        // Merge without duplicates
        const existingIds = new Set(finalCandidates.map(p => p.place_id));
        broaderCandidates.forEach(p => {
          if (!existingIds.has(p.place_id)) {
            finalCandidates.push(p);
          }
        });
      }
    }

    // First, try to filter candidates by distance if we have a centroid
    // Only keep places within 100km of the saved places' centroid
    let locationFilteredCandidates = hasCentroid 
      ? finalCandidates.filter(candidate => {
          if (!candidate.lat || !candidate.lng) return false;
          const dist = calculateDistance(centroidLat, centroidLng, candidate.lat, candidate.lng);
          return dist <= 100; // Only keep places within 100km
        })
      : finalCandidates;

    console.log('After location filter:', locationFilteredCandidates.length, 'candidates within 100km');

    // FALLBACK: If no nearby places found, use category-matched places regardless of location
    // This ensures we always show some suggestions even for places in regions with sparse data
    if (locationFilteredCandidates.length < limit && finalCandidates.length > 0) {
      console.log('Fallback: Using category-matched places regardless of location');
      locationFilteredCandidates = finalCandidates;
    }

    // Score and rank candidates - with location priority
    const scoredCandidates = locationFilteredCandidates.map(candidate => {
      let score = 0;

      // Category overlap
      if (candidate.categories) {
        const catOverlap = candidate.categories.filter((c: string) => categories.has(c)).length;
        score += catOverlap * 10;
      }

      // Filter tag overlap
      if (candidate.filter_tags) {
        const tagOverlap = candidate.filter_tags.filter((t: string) => filterTags.has(t)).length;
        score += tagOverlap * 5;
      }

      // Rating bonus
      if (candidate.rating) {
        score += (candidate.rating - 3.5) * 5;
      }

      // Price level similarity
      if (candidate.price_level && priceCount > 0) {
        const priceDiff = Math.abs(candidate.price_level - avgPriceLevel);
        score -= priceDiff * 3; // Penalize price difference
      }

      // LOCATION PRIORITY: Boost places near the centroid of saved places
      let distanceFromCentroid: number | null = null;
      if (hasCentroid && candidate.lat && candidate.lng) {
        distanceFromCentroid = calculateDistance(centroidLat, centroidLng, candidate.lat, candidate.lng);
        
        // Scoring based on distance:
        // - Within 5km: +20 points
        // - 5-15km: +10 points
        // - 15-30km: +5 points
        // - Beyond 30km: no bonus, slight penalty for very far places
        if (distanceFromCentroid <= 5) {
          score += 20;
        } else if (distanceFromCentroid <= 15) {
          score += 10;
        } else if (distanceFromCentroid <= 30) {
          score += 5;
        } else if (distanceFromCentroid > 50) {
          score -= 5; // Slight penalty for very distant places
        }
      }

      return { ...candidate, score, distanceFromCentroid };
    });

    // Sort by score (which now includes location priority) and take top results
    scoredCandidates.sort((a, b) => b.score - a.score);
    const suggestions = scoredCandidates.slice(0, limit);

    console.log('Returning suggestions:', suggestions.length);

    // Generate AI reasons for why these are suggested
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (lovableApiKey && suggestions.length > 0) {
      try {
        const savedPlaceNames = savedPlaces.map(p => p.name).slice(0, 5).join(', ');
        
        const prompt = `Based on these saved places: ${savedPlaceNames}
Board theme: "${boardName || 'My Favorites'}"

For each suggested place, write a SHORT 1-sentence reason why it would fit this collection. Be specific about what makes it similar.

Suggested places:
${suggestions.map((s, i) => `${i + 1}. ${s.name} (${s.categories?.slice(0, 2).join(', ') || 'place'})`).join('\n')}

Return ONLY a JSON array of strings with reasons, one per place. Example: ["Great for...", "Similar vibe..."]`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a helpful assistant that provides concise recommendations.' },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          
          // Try to parse JSON from response
          try {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const reasons = JSON.parse(jsonMatch[0]);
              suggestions.forEach((s, i) => {
                if (reasons[i]) {
                  s.ai_reason = reasons[i];
                }
              });
            }
          } catch (parseErr) {
            console.log('Could not parse AI reasons:', parseErr);
          }
        }
      } catch (aiErr) {
        console.log('AI suggestion generation failed:', aiErr);
        // Continue without AI reasons
      }
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-places:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
