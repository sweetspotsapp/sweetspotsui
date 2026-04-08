import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) { rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 }); return true; }
  if (entry.count >= 15) return false;
  entry.count++;
  return true;
}

const DiscoverInputSchema = z.object({
  prompt: z.string().min(1).max(500),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  city: z.string().max(200).optional(),
});

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
    // Rate limit
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`discover:${clientIp}`)) {
      return new Response(JSON.stringify({ error: 'Rate limited. Please wait.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await req.json();
    const parsed = DiscoverInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { prompt, lat, lng, city } = parsed.data;

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
4. Recommend 20-25 places - aim for variety and comprehensive coverage
5. Each place must be a SPECIFIC business or location name, not a generic description
6. Prioritize places that genuinely match the query - quality over quantity
7. **IMPORTANT**: If the user's query mentions a specific city or location (e.g., "bars in Jakarta", "cafes in Singapore"), ALWAYS prioritize that mentioned location over their current GPS location. The query location takes precedence!
8. Your summary MUST reference the query topic AND the correct location from the query, NOT the user's GPS location if different.

For each place, provide:
- The exact business/location name as it would appear on Google Maps
- A short reason (1 sentence) why it matches the query
- A category (restaurant, bar, cafe, landmark, park, club, rooftop, etc.)

SUMMARY GUIDELINES - This is critical:
- Write 1-2 sentences of LOCAL INSIGHT that adds NEW information the user wouldn't know
- Share genuinely useful tips like: which neighborhood/area these places cluster in, best time to visit, a local tip or cultural context, what makes this area special for this type of experience
- DO NOT just rephrase the user's query - that's useless

BAD summaries (never write these):
- "Looking for X? Here are some great options..."
- "Here are some highly-rated places for..."
- "Based on your search for X, here are some recommendations..."
- "Since you're looking for X, I've curated a list..."

GOOD summaries (write like these):
- "The Senopati area is Jakarta's cocktail bar hub - most spots here stay lively until 2am"
- "For authentic Padang food, these Tanah Abang spots use traditional spices - try visiting before noon for the freshest dishes"
- "BSD and Bintaro have Jakarta's best Indonesian-style reflexology spots. Weekday mornings are quieter and often discounted."
- "Kemang is where expats and locals mix - expect creative fusion menus and rooftop vibes after 8pm"

Return your response as valid JSON in this exact format:
{
  "summary": "1-2 sentences of LOCAL INSIGHT - neighborhood info, timing tips, or cultural context. Never rephrase the query.",
  "places": [
    {
      "name": "Exact Place Name",
      "reason": "Why this place matches what they're looking for",
      "category": "category_type"
    }
  ]
}`;

    const userMessage = `User query: "${prompt}"
User's current GPS location (for reference only): Near ${locationContext}

IMPORTANT: If the user's query mentions a specific city or area (like "Jakarta", "Singapore", "Bali"), recommend places in THAT location, NOT their current GPS location. Only use their GPS location if they say "nearby", "near me", or don't specify a location.

Recommend real, specific places that match this query. Focus on quality and relevance to the query.`;

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
