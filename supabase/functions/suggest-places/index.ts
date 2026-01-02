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
    });

    avgRating = avgRating / savedPlaces.length;
    avgPriceLevel = priceCount > 0 ? avgPriceLevel / priceCount : 2;

    console.log('Extracted characteristics:', {
      categories: Array.from(categories),
      filterTags: Array.from(filterTags),
      avgRating,
      avgPriceLevel
    });

    // Build a query to find similar places
    let query = supabase
      .from('places')
      .select('*')
      .not('place_id', 'in', `(${placeIds.join(',')})`) // Exclude already saved places
      .gte('rating', Math.max(3.5, avgRating - 0.5)) // Similar or better rating
      .order('rating', { ascending: false })
      .limit(limit * 3); // Fetch more to filter

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
        .limit(limit * 2);

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

    // Score and rank candidates
    const scoredCandidates = finalCandidates.map(candidate => {
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

      return { ...candidate, score };
    });

    // Sort by score and take top results
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
