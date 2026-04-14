import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface PlaceData {
  place_id: string;
  name: string;
  categories: string[] | null;
  price_level: number | null;
  opening_hours: any | null;
  reviews: any[] | null;
  ai_reason: string | null;
}

/**
 * Generate filter tags for a batch of places using Gemini AI
 */
async function generateFilterTags(places: PlaceData[]): Promise<Map<string, string[]>> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const results = new Map<string, string[]>();

  try {
    const placesInfo = places.map((p, idx) => {
      const reviewSnippets = (p.reviews || [])
        .slice(0, 2)
        .map((r: any) => (r.text || '').slice(0, 100))
        .join(' | ');
      
      const hoursText = p.opening_hours?.weekday_text?.join(', ') || 'Unknown hours';
      
      return `[${idx}] "${p.name}"
Categories: ${(p.categories || []).join(', ') || 'None'}
Price Level: ${p.price_level ?? 'Unknown'}
Hours: ${hoursText}
Reviews: ${reviewSnippets || 'None'}
AI Description: ${p.ai_reason || 'None'}`;
    }).join('\n\n');

    const systemPrompt = `You are a place categorization expert. Analyze each place and determine which filter tags apply based on the provided information. Be generous but reasonable.

Valid tags and their meanings:
- halal: Halal-certified or serves halal food
- vegetarian-vegan: Vegetarian or vegan options available
- gluten-free: Gluten-free options available
- free-wifi: Free WiFi available for customers
- outdoor-seating: Patio, terrace, garden seating, alfresco dining, outdoor cafes
- parking: Has parking lot, valet, or dedicated parking
- wheelchair-accessible: Wheelchair accessible entrance and facilities
- pet-friendly: Dogs allowed, pet-welcoming, outdoor pet area
- family-friendly: Kids welcome, family activities, casual atmosphere, kid-friendly food
- late-night: Open after 10pm, 24 hours, midnight operations, bars, clubs
- large-groups: Can accommodate large groups, group dining, event space, banquet

Respond with a JSON object where keys are the place indices (0, 1, 2...) and values are arrays of applicable tags.
Example: {"0": ["halal", "family-friendly"], "1": ["free-wifi", "outdoor-seating"], "2": ["pet-friendly", "large-groups"]}`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze these places and return filter tags:\n\n${placesInfo}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI filter tag generation failed:', response.status, errorText);
      throw new Error(`AI request failed: ${response.status}`);
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
    
    // Map indices back to place_ids and validate tags
    places.forEach((place, idx) => {
      const tags = parsed[String(idx)] || [];
      const validTags = tags.filter((t: string) => VALID_FILTER_TAGS.includes(t));
      results.set(place.place_id, validTags);
    });

    console.log(`Generated filter tags for ${results.size} places`);
  } catch (error) {
    console.error('Error generating filter tags:', error);
    throw error;
  }

  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all places without filter_tags
    const { data: places, error: fetchError } = await supabase
      .from('places')
      .select('place_id, name, categories, price_level, opening_hours, reviews, ai_reason')
      .is('filter_tags', null);

    if (fetchError) {
      throw new Error(`Failed to fetch places: ${fetchError.message}`);
    }

    if (!places || places.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No places need backfilling',
        updated: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${places.length} places to backfill with filter tags`);

    let totalUpdated = 0;
    const batchSize = 10;

    for (let i = 0; i < places.length; i += batchSize) {
      const batch = places.slice(i, i + batchSize);
      
      try {
        const filterTagsMap = await generateFilterTags(batch);
        
        // Update each place with its filter tags
        for (const [placeId, tags] of filterTagsMap) {
          const { error: updateError } = await supabase
            .from('places')
            .update({ filter_tags: tags })
            .eq('place_id', placeId);

          if (updateError) {
            console.error(`Failed to update place ${placeId}:`, updateError);
          } else {
            totalUpdated++;
            console.log(`Updated ${placeId} with tags:`, tags);
          }
        }
      } catch (batchError) {
        console.error(`Error processing batch ${i}-${i + batchSize}:`, batchError);
      }

      // Small delay between batches
      if (i + batchSize < places.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Backfill complete: updated ${totalUpdated}/${places.length} places`);

    return new Response(JSON.stringify({ 
      message: 'Backfill complete',
      total: places.length,
      updated: totalUpdated
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('backfill-filter-tags error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to backfill filter tags' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
