import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeId } = await req.json();
    
    if (!placeId) {
      return new Response(JSON.stringify({ error: 'placeId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the current place details
    const { data: currentPlace, error: placeError } = await supabase
      .from('places')
      .select('*')
      .eq('place_id', placeId)
      .maybeSingle();

    if (placeError || !currentPlace) {
      console.error('Error fetching place:', placeError);
      return new Response(JSON.stringify({ error: 'Place not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all other places for comparison
    const { data: allPlaces, error: allPlacesError } = await supabase
      .from('places')
      .select('place_id, name, categories, rating, photo_name, lat, lng, reviews, ai_reason, address')
      .neq('place_id', placeId)
      .limit(50);

    if (allPlacesError || !allPlaces || allPlaces.length === 0) {
      console.error('Error fetching places:', allPlacesError);
      return new Response(JSON.stringify({ similarPlaces: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract review texts from current place
    const currentReviews = Array.isArray(currentPlace.reviews) 
      ? currentPlace.reviews.map((r: any) => r.text).filter(Boolean).slice(0, 5).join(' | ')
      : '';

    // Build a description of the current place for AI analysis
    const currentPlaceDescription = `
Place: ${currentPlace.name}
Categories: ${currentPlace.categories?.join(', ') || 'Unknown'}
Rating: ${currentPlace.rating || 'N/A'}
AI Reason: ${currentPlace.ai_reason || 'No AI description'}
Sample Reviews: ${currentReviews.substring(0, 500)}
    `.trim();

    // Build descriptions for candidate places
    const candidatePlaces = allPlaces.map(p => {
      const reviews = Array.isArray(p.reviews) 
        ? p.reviews.map((r: any) => r.text).filter(Boolean).slice(0, 2).join(' | ')
        : '';
      return {
        place_id: p.place_id,
        name: p.name,
        categories: p.categories?.join(', ') || 'Unknown',
        rating: p.rating,
        ai_reason: p.ai_reason || '',
        reviews: reviews.substring(0, 200),
        photo_name: p.photo_name,
        lat: p.lat,
        lng: p.lng,
      };
    });

    const candidatesText = candidatePlaces.map((p, i) => 
      `[${i}] ${p.name} - Categories: ${p.categories}, Rating: ${p.rating}, Vibe: ${p.ai_reason}, Reviews: ${p.reviews}`
    ).join('\n');

    // Use AI to find similar vibes
    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a place recommendation AI. Given a place and a list of candidates, identify places with similar "vibes" - meaning similar atmosphere, experience type, ambiance, and target audience. Focus on the feeling and experience, not just matching categories.

Return ONLY a JSON array of indices (numbers) of the top 6 most similar places, ordered by similarity. Example: [3, 7, 12, 1, 8, 15]

Consider:
- Similar atmosphere and ambiance
- Similar target customer (families, couples, solo, groups)
- Similar experience type (casual, upscale, trendy, traditional)
- Similar vibe keywords in reviews and descriptions
- NOT just category matching - a cozy cafe and a cozy bookstore could have similar vibes`
          },
          {
            role: "user",
            content: `Find places with similar vibes to this place:

${currentPlaceDescription}

Candidate places:
${candidatesText}

Return only a JSON array of 6 indices, no explanation.`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '[]';
    
    console.log('AI response:', aiContent);

    // Parse the AI response to get indices
    let indices: number[] = [];
    try {
      // Extract JSON array from response (handle potential markdown formatting)
      const jsonMatch = aiContent.match(/\[[\d,\s]+\]/);
      if (jsonMatch) {
        indices = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      // Fallback: return first 6 places
      indices = [0, 1, 2, 3, 4, 5];
    }

    // Get the similar places based on AI recommendations
    const similarPlaces = indices
      .filter(i => i >= 0 && i < candidatePlaces.length)
      .slice(0, 6)
      .map(i => {
        const p = candidatePlaces[i];
        return {
          place_id: p.place_id,
          name: p.name,
          rating: p.rating,
          photo_name: p.photo_name,
          lat: p.lat,
          lng: p.lng,
        };
      });

    console.log('Returning similar places:', similarPlaces.map(p => p.name));

    return new Response(JSON.stringify({ similarPlaces }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in find-similar-vibes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
