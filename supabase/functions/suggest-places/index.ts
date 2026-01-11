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
    const { placeIds, boardName, userLat, userLng, limit = 4 } = await req.json();

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

    // Extract meaningful categories (exclude generic ones)
    const genericCategories = new Set([
      'point_of_interest', 'establishment', 'store', 'food', 'place'
    ]);
    
    const meaningfulCategories = new Set<string>();
    const allCategories = new Set<string>();
    const filterTags = new Set<string>();
    let avgRating = 0;
    let avgPriceLevel = 0;
    let priceCount = 0;
    
    // Calculate centroid for location-based suggestions
    let centroidLat = 0;
    let centroidLng = 0;
    let locationCount = 0;

    savedPlaces.forEach(place => {
      if (place.categories) {
        place.categories.forEach((cat: string) => {
          allCategories.add(cat);
          if (!genericCategories.has(cat)) {
            meaningfulCategories.add(cat);
          }
        });
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
      if (place.lat && place.lng) {
        centroidLat += place.lat;
        centroidLng += place.lng;
        locationCount++;
      }
    });

    avgRating = avgRating / savedPlaces.length;
    avgPriceLevel = priceCount > 0 ? avgPriceLevel / priceCount : 2;
    
    const hasCentroid = locationCount > 0;
    if (hasCentroid) {
      centroidLat = centroidLat / locationCount;
      centroidLng = centroidLng / locationCount;
    }

    console.log('Extracted characteristics:', {
      meaningfulCategories: Array.from(meaningfulCategories),
      filterTags: Array.from(filterTags),
      avgRating,
      centroid: hasCentroid ? { lat: centroidLat, lng: centroidLng } : null
    });

    // Haversine distance calculation (in km)
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // STEP 1: Try to find nearby places with matching MEANINGFUL categories
    let suggestions: any[] = [];
    
    if (hasCentroid && meaningfulCategories.size > 0) {
      // Query for places with overlapping meaningful categories
      const { data: nearbyCandidates } = await supabase
        .from('places')
        .select('*')
        .not('place_id', 'in', `(${placeIds.join(',')})`)
        .overlaps('categories', Array.from(meaningfulCategories))
        .gte('rating', 3.5)
        .limit(50);

      if (nearbyCandidates && nearbyCandidates.length > 0) {
        // Filter to within 100km and score by category match + distance
        const nearbyScored = nearbyCandidates
          .filter(p => p.lat && p.lng)
          .map(p => {
            const dist = calculateDistance(centroidLat, centroidLng, p.lat, p.lng);
            const catOverlap = p.categories?.filter((c: string) => meaningfulCategories.has(c)).length || 0;
            const tagOverlap = p.filter_tags?.filter((t: string) => filterTags.has(t)).length || 0;
            
            // Score: prioritize category match, then proximity
            let score = catOverlap * 20 + tagOverlap * 5;
            if (dist <= 50) score += 15;
            else if (dist <= 100) score += 10;
            else if (dist <= 200) score += 5;
            // Small penalty for very far places, but don't exclude them
            if (dist > 500) score -= 5;
            
            return { ...p, score, distance: dist };
          })
          .sort((a, b) => b.score - a.score);

        // Take top matches within 200km first
        const nearbyMatches = nearbyScored.filter(p => p.distance <= 200).slice(0, limit);
        suggestions = nearbyMatches;
        
        console.log('Found nearby category matches:', suggestions.length);
      }
    }

    // STEP 2: If not enough nearby, use AI to find similar vibes from broader pool
    if (suggestions.length < limit) {
      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      
      if (lovableApiKey) {
        // Get a broader pool of high-rated places
        const { data: allCandidates } = await supabase
          .from('places')
          .select('place_id, name, categories, rating, filter_tags, lat, lng, photo_name, photos, address, price_level')
          .not('place_id', 'in', `(${placeIds.join(',')})`)
          .not('place_id', 'in', `(${suggestions.map(s => s.place_id).join(',') || 'none'})`)
          .gte('rating', 4.0)
          .limit(30);

        if (allCandidates && allCandidates.length > 0) {
          // Use AI to pick the most similar vibes
          const savedPlaceDescriptions = savedPlaces.map(p => 
            `${p.name} (${p.categories?.filter((c: string) => !genericCategories.has(c)).slice(0, 3).join(', ') || 'place'})`
          ).join(', ');

          const candidateList = allCandidates.map((c, i) => 
            `${i + 1}. ${c.name} - ${c.categories?.filter((cat: string) => !genericCategories.has(cat)).slice(0, 3).join(', ') || 'place'}`
          ).join('\n');

          const prompt = `You're helping find places with SIMILAR VIBES to these saved places:
${savedPlaceDescriptions}

Board name: "${boardName || 'Favorites'}"

From this list, pick the ${Math.min(limit - suggestions.length, 4)} places that have the MOST SIMILAR VIBE or experience. Consider cuisine type, atmosphere, experience type, etc.

Available places:
${candidateList}

Return ONLY a JSON object with:
- "picks": array of numbers (the place numbers you chose)
- "reasons": array of strings (short reason for each pick)

Example: {"picks": [3, 7, 12], "reasons": ["Same cuisine style", "Similar cozy atmosphere", "Great for groups like the saved spot"]}`;

          try {
            const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${lovableApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                  { role: 'system', content: 'You are a local guide expert at matching place vibes. Pick places that would genuinely appeal to someone who saved the given places.' },
                  { role: 'user', content: prompt }
                ],
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              const content = aiData.choices?.[0]?.message?.content || '';
              
              try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  const picks = parsed.picks || [];
                  const reasons = parsed.reasons || [];
                  
                  picks.forEach((pickNum: number, idx: number) => {
                    const candidate = allCandidates[pickNum - 1];
                    if (candidate && suggestions.length < limit) {
                      suggestions.push({
                        ...candidate,
                        ai_reason: reasons[idx] || 'Similar vibe to your saved places',
                        score: 100 - idx // AI picks get high score
                      });
                    }
                  });
                  
                  console.log('AI added suggestions:', picks.length);
                }
              } catch (parseErr) {
                console.log('Could not parse AI response:', parseErr);
              }
            }
          } catch (aiErr) {
            console.log('AI suggestion failed:', aiErr);
          }
        }
      }
    }

    // STEP 3: Final fallback - just use category overlap scoring
    if (suggestions.length < limit) {
      const { data: fallbackCandidates } = await supabase
        .from('places')
        .select('*')
        .not('place_id', 'in', `(${placeIds.join(',')})`)
        .not('place_id', 'in', `(${suggestions.map(s => s.place_id).join(',') || 'none'})`)
        .overlaps('categories', Array.from(allCategories))
        .gte('rating', 4.0)
        .order('rating', { ascending: false })
        .limit(limit - suggestions.length);

      if (fallbackCandidates) {
        fallbackCandidates.forEach(c => {
          if (suggestions.length < limit) {
            suggestions.push({
              ...c,
              ai_reason: `Highly rated ${c.categories?.[0]?.replace(/_/g, ' ') || 'spot'}`,
              score: 50
            });
          }
        });
      }
    }

    console.log('Returning suggestions:', suggestions.length);

    // Generate AI reasons for suggestions that don't have them yet
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const suggestionsNeedingReasons = suggestions.filter(s => !s.ai_reason);
    
    if (lovableApiKey && suggestionsNeedingReasons.length > 0) {
      try {
        const savedPlaceNames = savedPlaces.map(p => p.name).slice(0, 5).join(', ');
        
        const prompt = `Based on these saved places: ${savedPlaceNames}
Board: "${boardName || 'My Favorites'}"

Write SHORT 1-sentence reasons why each suggested place would appeal to this user:
${suggestionsNeedingReasons.map((s, i) => `${i + 1}. ${s.name} (${s.categories?.slice(0, 2).join(', ') || 'place'})`).join('\n')}

Return ONLY a JSON array of strings. Example: ["Great for...", "Similar vibe..."]`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a helpful assistant.' },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          
          try {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const reasons = JSON.parse(jsonMatch[0]);
              suggestionsNeedingReasons.forEach((s, i) => {
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
        console.log('AI reason generation failed:', aiErr);
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
