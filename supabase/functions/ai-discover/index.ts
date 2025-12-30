import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIPlace {
  name: string;
  reason: string;
  category: string;
}

interface AIDiscoverResponse {
  summary: string;
  places: AIPlace[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, lat, lng, city } = await req.json();
    
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build location context
    let locationContext = city || 'the user\'s location';
    if (lat && lng) {
      locationContext = `coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})${city ? `, near ${city}` : ''}`;
    }

    console.log(`AI Discover: "${prompt}" near ${locationContext}`);

    const systemPrompt = `You are a local travel and food expert with extensive knowledge of places around the world. Your job is to recommend REAL, SPECIFIC places that match the user's query.

CRITICAL RULES:
1. ONLY recommend places that actually exist - use your knowledge of real businesses, restaurants, bars, landmarks, parks, etc.
2. Include a mix of popular spots and hidden gems
3. Consider the user's apparent intent (vibe, activity, occasion, time of day)
4. Recommend 8-15 places maximum
5. Each place must be a SPECIFIC business or location name, not a generic description
6. Prioritize places that genuinely match the query - quality over quantity

For each place, provide:
- The exact business/location name as it would appear on Google Maps
- A short reason (1 sentence) why it matches the query
- A category (restaurant, bar, cafe, landmark, park, club, rooftop, etc.)

Return your response as valid JSON in this exact format:
{
  "summary": "A helpful 2-3 sentence explanation of your recommendations and what the user might enjoy",
  "places": [
    {
      "name": "Exact Place Name",
      "reason": "Why this place matches what they're looking for",
      "category": "category_type"
    }
  ]
}`;

    const userMessage = `User query: "${prompt}"
Location context: Near ${locationContext}

Recommend real, specific places that match this query. Focus on quality and relevance.`;

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
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add more credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response:', aiData);
      throw new Error('No response from AI');
    }

    console.log('AI raw response:', content.substring(0, 500));

    // Parse JSON from response (handle markdown code blocks)
    let parsed: AIDiscoverResponse;
    try {
      let jsonStr = content;
      
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, content);
      
      // Try to extract structured data even from malformed response
      const placesMatch = content.match(/"places"\s*:\s*\[([\s\S]*?)\]/);
      const summaryMatch = content.match(/"summary"\s*:\s*"([^"]+)"/);
      
      if (placesMatch) {
        try {
          const places = JSON.parse(`[${placesMatch[1]}]`);
          parsed = {
            summary: summaryMatch ? summaryMatch[1] : "Here are some recommendations based on your search.",
            places: places
          };
        } catch {
          throw new Error('Could not parse AI response');
        }
      } else {
        throw new Error('Could not parse AI response');
      }
    }

    // Validate response structure
    if (!parsed.places || !Array.isArray(parsed.places)) {
      console.error('Invalid response structure:', parsed);
      throw new Error('Invalid AI response structure');
    }

    // Filter out invalid entries
    const validPlaces = parsed.places.filter(p => 
      p && typeof p.name === 'string' && p.name.trim().length > 0
    );

    console.log(`AI recommended ${validPlaces.length} places`);

    return new Response(JSON.stringify({
      summary: parsed.summary || "Here are some great spots that match your search.",
      places: validPlaces,
      query: prompt,
      location: locationContext
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('ai-discover error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to get AI recommendations' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
