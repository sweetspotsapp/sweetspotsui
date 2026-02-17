import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ DATABASE-BACKED CACHE ============
// Helper functions to get/set cache from Supabase
async function getCacheValue<T>(supabaseClient: any, key: string): Promise<T | null> {
  try {
    const { data, error } = await supabaseClient
      .from('query_cache')
      .select('cache_value, expires_at')
      .eq('cache_key', key)
      .single();
    
    if (error || !data) return null;
    
    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      // Delete expired entry asynchronously
      supabaseClient.from('query_cache').delete().eq('cache_key', key).then(() => {});
      return null;
    }
    
    return data.cache_value as T;
  } catch (e) {
    console.error('Cache read error:', e);
    return null;
  }
}

async function setCacheValue<T>(supabaseClient: any, key: string, value: T, ttlMs: number): Promise<void> {
  try {
    const expires_at = new Date(Date.now() + ttlMs).toISOString();
    await supabaseClient
      .from('query_cache')
      .upsert({
        cache_key: key,
        cache_value: value,
        expires_at,
        created_at: new Date().toISOString()
      }, { onConflict: 'cache_key' });
  } catch (e) {
    console.error('Cache write error:', e);
  }
}

// Clean up expired cache entries (fire and forget)
async function cleanExpiredCache(supabaseClient: any): Promise<void> {
  try {
    const { data, error } = await supabaseClient.rpc('clean_expired_cache');
    if (!error && data > 0) {
      console.log(`Cleaned ${data} expired cache entries`);
    }
  } catch (e) {
    // Silently fail - cache cleanup is not critical
  }
}

interface RequestBody {
  prompt: string;
  lat?: number;
  lng?: number;
  location_name?: string; // City/area name to geocode
  radius_m?: number;
  mode?: 'drive' | 'walk' | 'bike';
  limit?: number;
}

interface PlaceCandidate {
  place_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  categories: string[] | null;
  rating: number | null;
  ratings_total: number | null;
  photo_name: string | null;
  price_level?: number | null;
  filter_tags?: string[] | null;
  is_open_now?: boolean | null;
  unique_vibes?: string | null;
}

interface RankedPlace extends PlaceCandidate {
  eta_seconds: number | null;
  distance_meters: number | null;
  score: number;
  why: string;
  is_open_now?: boolean | null;
  unique_vibes?: string | null;
}

interface Profile {
  id: string;
  dietary: Record<string, unknown> | null;
  mobility: Record<string, unknown> | null;
  budget: string | null;
  vibe: Record<string, unknown> | null;
}

// Weights for scoring
const WEIGHTS = {
  aiRelevance: 0.50,
  eta: 0.20,
  distance: 0.05,
  profileFit: 0.10,
  behaviorFit: 0.05,
  quality: 0.10,
};

// Map mode to Geoapify mode
function mapModeToGeoapify(mode: 'drive' | 'walk' | 'bike'): string {
  const modeMap: Record<string, string> = {
    drive: 'drive',
    walk: 'walk',
    bike: 'bicycle',
  };
  return modeMap[mode] || 'drive';
}

// Calculate ETA score (lower is better)
function calculateEtaScore(etaSeconds: number | null, maxEta: number): number {
  if (etaSeconds === null || maxEta === 0) return 0.5;
  return 1 - Math.min(etaSeconds / maxEta, 1);
}

// Calculate distance score (shorter is better)
function calculateDistanceScore(distanceMeters: number | null, maxDistance: number): number {
  if (distanceMeters === null || maxDistance === 0) return 0.5;
  return 1 - Math.min(distanceMeters / maxDistance, 1);
}

// Calculate profile fit based on user preferences
function calculateProfileFit(profile: Profile | null, place: PlaceCandidate): number {
  if (!profile) return 0.5;
  
  let score = 0.5;
  const categories = place.categories || [];
  
  if (profile.dietary) {
    const dietaryPrefs = Object.keys(profile.dietary).filter(k => profile.dietary![k]);
    for (const pref of dietaryPrefs) {
      if (categories.some(c => c.toLowerCase().includes(pref.toLowerCase()))) {
        score += 0.1;
      }
    }
  }
  
  if (profile.vibe) {
    const vibePrefs = Object.keys(profile.vibe).filter(k => profile.vibe![k]);
    for (const pref of vibePrefs) {
      if (categories.some(c => c.toLowerCase().includes(pref.toLowerCase()))) {
        score += 0.1;
      }
    }
  }
  
  return Math.min(score, 1);
}

// Calculate quality score based on rating and volume
function calculateQualityScore(rating: number | null, ratingsTotal: number | null): number {
  if (rating === null) return 0.5;
  
  const ratingNorm = (rating - 1) / 4;
  const volumeFactor = ratingsTotal 
    ? Math.min(Math.log10(ratingsTotal + 1) / 3, 1) 
    : 0.5;
  
  return ratingNorm * 0.7 + volumeFactor * 0.3;
}

// Generate "why" string based on top scoring factors
function generateWhyString(
  place: PlaceCandidate,
  scores: {
    aiRelevance: number;
    eta: number;
    distance: number;
    profileFit: number;
    quality: number;
  },
  etaSeconds: number | null
): string {
  const factors: { name: string; score: number; description: string }[] = [
    { 
      name: 'match', 
      score: scores.aiRelevance, 
      description: 'Great match for your search' 
    },
    { 
      name: 'nearby', 
      score: scores.eta, 
      description: etaSeconds ? `${Math.round(etaSeconds / 60)} min away` : 'Close by' 
    },
    { 
      name: 'profile', 
      score: scores.profileFit, 
      description: 'Fits your preferences' 
    },
    { 
      name: 'quality', 
      score: scores.quality, 
      description: place.rating ? `${place.rating}★ rating` : 'Well reviewed' 
    },
  ];
  
  factors.sort((a, b) => b.score - a.score);
  const topFactors = factors.slice(0, 2).filter(f => f.score > 0.5);
  
  if (topFactors.length === 0) {
    return 'Recommended nearby';
  }
  
  return topFactors.map(f => f.description).join(' • ');
}

// Translate natural language prompts to Google-searchable keywords
async function translatePromptToKeywords(
  prompt: string,
  lovableApiKey: string,
  supabaseClient: any
): Promise<{ keywords: string; intent: string }> {
  // Mood/vibe words that Google doesn't understand - these MUST be translated
  // Check cache first
  const cacheKey = `translate:${prompt.toLowerCase().trim()}`;
  const cached = await getCacheValue<{ keywords: string; intent: string }>(supabaseClient, cacheKey);
  if (cached) {
    console.log('Using cached translation');
    return cached;
  }

  // Common search keywords that don't need translation
  const commonKeywords = /\b(restaurant|cafe|coffee|bar|food|pizza|sushi|burger|breakfast|lunch|dinner|brunch|hotel|park|museum|gym|spa|beach|shopping|mall)\b/i;
  
  const moodWords = /\b(chill|vibes?|cozy|relaxing|romantic|fun|lively|trendy|quiet|peaceful|aesthetic|cute|fancy|casual|hipster|artsy|authentic|hidden|local|cool|nice|good|great|amazing|awesome|perfect|best|moody|intimate|upscale|lowkey|energetic|buzzing|serene|charming)\b/i;
  
  // Conversational patterns indicating natural language
  const conversationalPatterns = /\b(where|what|how|can|should|want|wanna|need|looking|find|get|take|go|somewhere|place|spot|feel|feeling|tonight|today|right now|mood|craving|bored|hungry|tired)\b/i;
  
  // Personal pronouns indicate natural language
  const personalPronouns = /\b(i|i'm|im|i am|me|my|we|us|our)\b/i;
  
  // Check if prompt contains mood words that Google can't understand
  const containsMoodWords = moodWords.test(prompt);
  const hasCommonKeywords = commonKeywords.test(prompt);
  
  // Skip translation if:
  // 1. Has common keywords (e.g. "coffee", "restaurant") OR
  // 2. (Very short (3 words or less) AND no mood words AND no conversational patterns AND no personal pronouns)
  const isAlreadyKeywords = 
    hasCommonKeywords ||
    (prompt.split(' ').length <= 3 &&
    !containsMoodWords &&
    !conversationalPatterns.test(prompt) &&
    !personalPronouns.test(prompt));
  
  if (isAlreadyKeywords) {
    console.log('Prompt is already keyword-like, skipping translation');
    const result = { keywords: prompt, intent: prompt };
    // Cache async (fire and forget) - 2 hour TTL
    setCacheValue(supabaseClient, cacheKey, result, 2 * 60 * 60 * 1000).then(() => {});
    return result;
  }

  try {
    console.log(`Translating natural language to keywords (containsMoodWords: ${containsMoodWords})...`);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `Extract Google Places search keywords from natural language queries.
Return 2-5 search terms Google Places will understand.

Examples:
- "I wanna date someone, where should I take here" → "romantic restaurant date night"
- "chill spot to hangout with friends" → "cafe lounge bar casual"
- "where can I work on my laptop" → "coffee shop wifi coworking"
- "something quick for lunch" → "fast food lunch restaurant"
- "fancy dinner for anniversary" → "fine dining romantic upscale"
- "fun things to do with kids" → "family entertainment kids activities"

Return ONLY a JSON object: { "keywords": "search terms", "intent": "what user wants" }`
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error('Translation failed, using original prompt');
      return { keywords: prompt, intent: prompt };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON with better error handling
    let jsonStr = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    try {
      // Clean up common JSON issues
      const cleanedJson = jsonStr
        .trim()
        .replace(/,\s*}/g, '}')  // Remove trailing commas before }
        .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
        .replace(/\n/g, ' ')      // Remove newlines that might break strings
        .replace(/\r/g, '');      // Remove carriage returns
      
      const parsed = JSON.parse(cleanedJson);
      const keywords = parsed.keywords || prompt;
      const intent = parsed.intent || prompt;
      
      console.log(`Translated: "${prompt}" → "${keywords}"`);
      const result = { keywords, intent };
      // Cache async (fire and forget) - 2 hour TTL
      setCacheValue(supabaseClient, cacheKey, result, 2 * 60 * 60 * 1000).then(() => {});
      return result;
    } catch (parseError) {
      console.error('Translation JSON parse error:', parseError);
      console.error('Failed JSON string:', jsonStr.substring(0, 200));
      return { keywords: prompt, intent: prompt };
    }
    
  } catch (error) {
    console.error('Translation error:', error);
    return { keywords: prompt, intent: prompt };
  }
}

// Valid filter tags that can be assigned to places
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

// Generate filter_tags for places using AI
async function generateFilterTagsWithAI(
  places: PlaceCandidate[],
  lovableApiKey: string
): Promise<Map<string, string[]>> {
  const tagsMap = new Map<string, string[]>();
  
  if (places.length === 0) return tagsMap;

  // Limit to 30 places per batch to avoid token limits
  const placesToProcess = places.slice(0, 30);

  const placesInfo = placesToProcess.map((p, i) => ({
    index: i,
    place_id: p.place_id,
    name: p.name,
    categories: (p.categories || []).slice(0, 8).join(', '),
    rating: p.rating,
    address: p.address,
  }));

  const systemPrompt = `You analyze places and assign relevant filter tags. For each place, assign ALL tags that apply from this list:
- halal: Halal-certified or serves halal food
- vegetarian-vegan: Vegetarian or vegan options available
- gluten-free: Gluten-free options available
- free-wifi: Free WiFi available for customers
- outdoor-seating: Patio, terrace, garden seating, al fresco dining
- parking: Has parking lot, valet, or dedicated parking
- wheelchair-accessible: Wheelchair accessible entrance and facilities
- pet-friendly: Allows pets, dog-friendly, outdoor pet area
- family-friendly: Kid-safe, welcoming to families, appropriate activities
- late-night: Open after 10pm, 24 hours, midnight operations, bars, clubs
- large-groups: Can accommodate large groups, group dining, event space

Be GENEROUS - if a place could reasonably have a tag based on its name, categories, or typical venue type, include it.`;

  const userPrompt = `Analyze these places and assign filter tags:

${placesInfo.map((p, i) => `${i}. ${p.name} | Categories: ${p.categories || 'Unknown'} | Rating: ${p.rating || 'N/A'}★`).join('\n')}

Respond with JSON: {"tags": [[0, ["tag1", "tag2"]], [1, ["tag1"]], ...]}
Only include places that have at least one tag. Use only tags from the valid list.`;

  try {
    console.log(`Generating filter_tags for ${placesToProcess.length} places...`);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI filter tags error:', response.status);
      return tagsMap;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response with better error handling
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }
    
    let parsed;
    try {
      // Clean up common JSON issues
      const cleanedJson = jsonStr
        .trim()
        .replace(/,\s*}/g, '}')  // Remove trailing commas before }
        .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
        .replace(/\n/g, ' ')      // Remove newlines that might break strings
        .replace(/\r/g, '');      // Remove carriage returns
      
      parsed = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Failed JSON string:', jsonStr.substring(0, 500));
      return tagsMap; // Return empty map on parse failure
    }
    
    const tagResults = parsed.tags || [];
    
    for (const item of tagResults) {
      let idx: number;
      let tags: string[];
      
      if (Array.isArray(item) && item.length >= 2) {
        [idx, tags] = item;
      } else {
        continue;
      }
      
      if (typeof idx === 'number' && idx >= 0 && idx < placesToProcess.length && Array.isArray(tags)) {
        // Filter to only valid tags
        const validTags = tags.filter(t => VALID_FILTER_TAGS.includes(t));
        if (validTags.length > 0) {
          tagsMap.set(placesToProcess[idx].place_id, validTags);
        }
      }
    }
    
    console.log(`Generated tags for ${tagsMap.size} places`);
  } catch (error) {
    console.error('Failed to generate filter tags:', error);
  }

  return tagsMap;
}

async function getAIRelevanceAndSummary(
  prompt: string,
  places: PlaceCandidate[],
  lovableApiKey: string
): Promise<{ relevanceMap: Map<string, number>; summary: string }> {
  const relevanceMap = new Map<string, number>();
  let summary = "";
  
  // For very generic queries, skip strict AI filtering
  const genericQueries = ['places to eat', 'restaurants', 'food', 'cafes', 'coffee', 'bars'];
  const isGenericQuery = genericQueries.some(q => 
    prompt.toLowerCase().includes(q) || q.includes(prompt.toLowerCase())
  );
  
  if (isGenericQuery) {
    console.log('Generic query detected, using category-based scoring');
    places.forEach(p => {
      const categories = (p.categories || []).join(' ').toLowerCase();
      const isFood = categories.includes('restaurant') || categories.includes('cafe') || 
                     categories.includes('food') || categories.includes('bar') ||
                     categories.includes('bakery') || categories.includes('coffee');
      relevanceMap.set(p.place_id, isFood ? 80 : 40);
    });
    const type = prompt.toLowerCase().includes('restaurant') ? 'restaurants' : prompt.toLowerCase().includes('cafe') || prompt.toLowerCase().includes('coffee') ? 'cafes' : 'spots';
    summary = JSON.stringify([
      `Try our best picks because you like "${prompt}"`,
      `Based on your keywords, some places you might find are ${type}, cafes, and local favorites`,
      `I'd suggest you go for the top-rated ${type} that locals love`
    ]);
    return { relevanceMap, summary };
  }

  // Prepare places data for AI
  const placesInfo = places.slice(0, 40).map((p, i) => ({
    index: i,
    name: p.name,
    categories: (p.categories || []).slice(0, 5).join(', '),
    rating: p.rating,
  }));

  const systemPrompt = `You are a friendly local guide. Given a user's search query and places found:
1. Rate each place's relevance on a scale of 0-100
2. Generate EXACTLY 3 bullet points as a JSON array "bullets":
   - Bullet 1: "Try our best picks because you like [user's vibe/interest from their query]"
   - Bullet 2: "Based on your keywords, some places you might find are [category 1], [category 2]" (derive categories from the results)
   - Bullet 3: "I'd suggest you go for [specific AI recommendation based on the results, e.g. a standout place type or experience]"

Keep each bullet under 120 characters. Be specific and reference the user's actual query.
   
SCORING GUIDE:
- 80-100: Excellent match for the search intent
- 60-79: Good match, likely useful
- 40-59: Moderate match, possibly relevant
- 20-39: Weak match
- 0-19: Not relevant

Be GENEROUS for places that could reasonably satisfy the user's intent.`;

  const userPrompt = `Query: "${prompt}"

Places found:
${placesInfo.map((p, i) => `${i}. ${p.name} (${p.categories || 'Unknown'}) - ${p.rating || 'N/A'}★`).join('\n')}

Respond with a JSON object:
{
  "scores": [[index, score], ...] for places scoring 40+,
  "bullets": ["bullet 1", "bullet 2", "bullet 3"]
}`;

  try {
    console.log('Calling Lovable AI for relevance scoring...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      // Handle rate limiting
      if (response.status === 429) {
        console.log('Rate limited, using fallback scoring');
      } else if (response.status === 402) {
        console.log('Credits exhausted, using fallback scoring');
      }
      
      // Fallback: give all places a neutral score
      places.forEach(p => relevanceMap.set(p.place_id, 50));
      summary = JSON.stringify([
        `Try our best picks because you like "${prompt}"`,
        `Based on your keywords, some places you might find are restaurants, cafes, and bars`,
        `I'd suggest you go for the highest-rated spots nearby`
      ]);
      return { relevanceMap, summary };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response length:', content.length);
    
    // Extract JSON from response with better error handling
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    // Find object or array in response
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }
    
    try {
      // Clean up common JSON issues
      const cleanedJson = jsonStr
        .trim()
        .replace(/,\s*}/g, '}')  // Remove trailing commas before }
        .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
        .replace(/\n/g, ' ')      // Remove newlines that might break strings
        .replace(/\r/g, '');      // Remove carriage returns
      
      const parsed = JSON.parse(cleanedJson);
      
      // Extract scores
      const scores = parsed.scores || parsed.relevance || [];
      if (Array.isArray(scores)) {
        for (const item of scores) {
          let idx: number, score: number;
          
          if (Array.isArray(item)) {
            [idx, score] = item;
          } else if (typeof item === 'object') {
            idx = item.index ?? item.idx ?? item.i;
            score = item.score ?? item.relevance ?? item.s;
          } else {
            continue;
          }
          
          if (typeof idx === 'number' && typeof score === 'number' && idx >= 0 && idx < places.length) {
            relevanceMap.set(places[idx].place_id, score);
          }
        }
      }
      
      // Extract bullets - convert array to JSON string for transport
      const bullets = parsed.bullets || parsed.summary;
      if (Array.isArray(bullets)) {
        summary = JSON.stringify(bullets);
      } else if (typeof bullets === 'string') {
        summary = bullets;
      } else {
        summary = JSON.stringify([
          `Try our best picks because you like "${prompt}"`,
          `Based on your keywords, we found some great matching spots`,
          `I'd suggest you go for the top-rated options`
        ]);
      }
      
      console.log(`AI scored ${relevanceMap.size}/${places.length} places`);
      
      // If AI returned nothing, fallback
      if (relevanceMap.size === 0) {
        console.log('AI returned no scores, using fallback');
        places.forEach(p => relevanceMap.set(p.place_id, 50));
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      places.forEach(p => relevanceMap.set(p.place_id, 50));
      summary = JSON.stringify([
        `Try our best picks because you like "${prompt}"`,
        `Based on your keywords, we found some great matching spots`,
        `I'd suggest you go for the top-rated options nearby`
      ]);
    }
    
  } catch (error) {
    console.error('AI relevance check failed:', error);
    places.forEach(p => relevanceMap.set(p.place_id, 50));
    summary = JSON.stringify([
      `Try our best picks because you like "${prompt}"`,
      `Based on your keywords, we found some great spots for you`,
      `I'd suggest you go for the highest-rated places nearby`
    ]);
  }

  return { relevanceMap, summary };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    const geoapifyApiKey = Deno.env.get('GEOAPIFY_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!googleMapsApiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!geoapifyApiKey) {
      return new Response(
        JSON.stringify({ error: 'Geoapify API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'Lovable API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Clean expired cache entries periodically (fire and forget, ~10% of requests)
    if (Math.random() < 0.1) {
      cleanExpiredCache(supabaseAdmin).then(() => {});
    }

    // Get auth header for later parallel fetch
    const authHeader = req.headers.get('Authorization');

    // Parse request
    const body: RequestBody = await req.json();
    const { prompt, location_name, radius_m = 4000, mode = 'drive', limit = 50 } = body;
    let { lat, lng } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If location_name provided (but not lat/lng), geocode it
    if (location_name && (lat === undefined || lng === undefined || (lat === 0 && lng === 0))) {
      console.log(`Geocoding location: ${location_name}`);
      
      // Check cache first
      const geoCacheKey = `geocode:${location_name.toLowerCase().trim()}`;
      const cachedGeo = await getCacheValue<{ lat: number; lng: number }>(supabaseAdmin, geoCacheKey);
      if (cachedGeo) {
        lat = cachedGeo.lat;
        lng = cachedGeo.lng;
        console.log(`Using cached geocode for "${location_name}": ${lat}, ${lng}`);
      } else {
        let geocoded = false;

        // Try Geoapify first
        try {
          const geocodeUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(location_name)}&limit=1&apiKey=${geoapifyApiKey}`;
          const geoResponse = await fetch(geocodeUrl);
          const geoData = await geoResponse.json();
          
          if (geoData.features && geoData.features.length > 0) {
            const [geoLng, geoLat] = geoData.features[0].geometry.coordinates;
            lat = geoLat;
            lng = geoLng;
            geocoded = true;
            console.log(`Geoapify geocoded "${location_name}" to: ${lat}, ${lng}`);
          }
        } catch (e) {
          console.error('Geoapify geocoding error:', e);
        }

        // Fallback to Google Geocoding if Geoapify failed
        if (!geocoded) {
          try {
            const googleGeoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location_name)}&key=${googleMapsApiKey}`;
            const googleGeoResponse = await fetch(googleGeoUrl);
            const googleGeoData = await googleGeoResponse.json();
            
            if (googleGeoData.results && googleGeoData.results.length > 0) {
              const loc = googleGeoData.results[0].geometry.location;
              lat = loc.lat;
              lng = loc.lng;
              geocoded = true;
              console.log(`Google geocoded "${location_name}" to: ${lat}, ${lng}`);
            }
          } catch (e) {
            console.error('Google geocoding error:', e);
          }
        }

        if (!geocoded) {
          return new Response(
            JSON.stringify({ error: `Could not find location: ${location_name}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Cache the result for 4 hours (only if geocoding succeeded, fire and forget)
        if (lat !== undefined && lng !== undefined) {
          setCacheValue(supabaseAdmin, geoCacheKey, { lat, lng }, 4 * 60 * 60 * 1000).then(() => {});
        }
      }
    }

    if (lat === undefined || lng === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing location: provide lat/lng or location_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Search:', { prompt, lat: lat.toFixed(4), lng: lng.toFixed(4), radius_m, mode });

    // ============ STEP 0: Translate natural language to keywords ============
    const translationStartTime = Date.now();
    const { keywords, intent } = await translatePromptToKeywords(prompt, lovableApiKey, supabaseAdmin);
    console.log(`⏱️  Translation: ${Date.now() - translationStartTime}ms`);

    // ============ STEP 1: Google Places Text Search (fetch up to 40 places) ============
    const googleStartTime = Date.now();
    const searchUrl = 'https://places.googleapis.com/v1/places:searchText';
    
    let allGooglePlaces: any[] = [];
    let nextPageToken: string | null = null;
    const maxPages = 2; // Reduced from 3 to 2 for faster response

    // Note: searchText only supports locationBias, not locationRestriction
    // We enforce distance limits via post-filtering with haversine
    const strictRadius = radius_m <= 10000;

    for (let page = 0; page < maxPages; page++) {
      const requestBody: any = {
        textQuery: keywords,
        pageSize: 20,
        languageCode: "en",
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: strictRadius ? Math.max(radius_m, 5000) : radius_m
          }
        },
        strictTypeFiltering: strictRadius
      };

      if (nextPageToken) {
        requestBody.pageToken = nextPageToken;
      }

      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleMapsApiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.photos,places.priceLevel,places.currentOpeningHours,places.regularOpeningHours,nextPageToken'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Google Places error:', data);
        if (page === 0) {
          return new Response(
            JSON.stringify({ error: 'Places search failed', details: data.error?.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      }

      const places = data.places || [];
      allGooglePlaces = allGooglePlaces.concat(places);
      nextPageToken = data.nextPageToken || null;

      if (!nextPageToken || allGooglePlaces.length >= 40) break;
      
      if (nextPageToken) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }

    console.log(`⏱️  Google Places: ${allGooglePlaces.length} places in ${Date.now() - googleStartTime}ms`);

    if (allGooglePlaces.length === 0) {
      return new Response(
        JSON.stringify({ places: [], summary: 'No places found matching your search.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ RELEVANCE FILTER: Exclude non-travel categories ============
    const EXCLUDED_CATEGORIES = new Set([
      // Retail/Shopping
      'clothing_store', 'shoe_store', 'jewelry_store', 'electronics_store',
      'furniture_store', 'hardware_store', 'home_goods_store', 'home_improvement_store',
      'department_store', 'shopping_mall', 'convenience_store', 'supermarket',
      'grocery_or_supermarket', 'discount_store', 'wholesale_store', 'liquor_store',
      'pet_store', 'florist', 'book_store', 'sporting_goods_store', 'outdoor_goods_store',
      // Services
      'car_dealer', 'car_rental', 'car_repair', 'car_wash', 'gas_station', 'parking',
      'atm', 'bank', 'insurance_agency', 'real_estate_agency', 'lawyer', 'accounting',
      'electrician', 'plumber', 'locksmith', 'moving_company', 'storage', 'post_office',
      'laundry', 'dry_cleaning', 'tailor', 'travel_agency',
      // Corporate/Industrial
      'corporate_office', 'general_contractor', 'roofing_contractor',
      // Medical
      'hospital', 'doctor', 'dentist', 'pharmacy', 'veterinary_care', 'physiotherapist',
      // Education
      'school', 'primary_school', 'secondary_school', 'university', 'library',
      // Government/Other
      'cemetery', 'funeral_home', 'local_government_office', 'police', 'fire_station',
      'embassy', 'courthouse', 'city_hall', 'place_of_worship', 'church', 'mosque',
      'hindu_temple', 'synagogue',
    ]);

    // Categories that indicate the place IS relevant (override exclusion)
    const INCLUDED_CATEGORIES = new Set([
      'restaurant', 'cafe', 'coffee_shop', 'bar', 'bakery', 'food',
      'meal_takeaway', 'meal_delivery', 'night_club', 'tourist_attraction',
      'park', 'beach', 'natural_feature', 'museum', 'art_gallery',
      'movie_theater', 'bowling_alley', 'amusement_park', 'zoo', 'aquarium',
      'spa', 'gym', 'stadium', 'casino', 'campground', 'rv_park',
      'lodging', 'hotel', 'resort', 'pub', 'gastropub', 'cocktail_bar',
      'hookah_bar', 'live_music_venue', 'event_venue', 'ice_cream_shop',
      'lounge_bar', 'sports_bar', 'wine_bar', 'brunch_restaurant',
      'indonesian_restaurant', 'japanese_restaurant', 'italian_restaurant',
      'indian_restaurant', 'chinese_restaurant', 'thai_restaurant',
      'mexican_restaurant', 'french_restaurant', 'korean_restaurant',
      'vietnamese_restaurant', 'mediterranean_restaurant', 'seafood_restaurant',
      'steak_house', 'pizza_restaurant', 'hamburger_restaurant',
      'vegetarian_restaurant', 'vegan_restaurant', 'ramen_restaurant',
      'sushi_restaurant', 'barbecue_restaurant',
    ]);

    // Name patterns indicating non-travel businesses (common in SE Asia)
    const EXCLUDED_NAME_PATTERNS = /^(PT\s|CV\s|UD\s|TB\s|PD\s)/i;

    // Filter out irrelevant places
    const filteredGooglePlaces = allGooglePlaces.filter((place: any) => {
      const types: string[] = place.types || [];
      const name: string = place.displayName?.text || '';
      
      // Filter by name patterns (corporate entities)
      if (EXCLUDED_NAME_PATTERNS.test(name)) return false;
      
      // If it has ANY included category, keep it
      const hasIncludedCategory = types.some(t => INCLUDED_CATEGORIES.has(t));
      if (hasIncludedCategory) return true;
      
      // If it has ANY excluded category and no included ones, drop it
      const hasExcludedCategory = types.some(t => EXCLUDED_CATEGORIES.has(t));
      if (hasExcludedCategory) return false;

      // If only generic types (point_of_interest, establishment), be suspicious
      const genericOnly = types.every(t => t === 'point_of_interest' || t === 'establishment');
      if (genericOnly) return false;
      
      return true;
    });

    console.log(`Category filter: ${allGooglePlaces.length} → ${filteredGooglePlaces.length} places (removed ${allGooglePlaces.length - filteredGooglePlaces.length} irrelevant)`);

    const dbFetchStartTime = Date.now();

    // Transform to candidates (initial transform without filter_tags)
    const baseCandidates: PlaceCandidate[] = filteredGooglePlaces.map((place: any) => {
      const firstPhoto = place.photos?.[0];
      const priceLevel = place.priceLevel ? 
        ['FREE', 'INEXPENSIVE', 'MODERATE', 'EXPENSIVE', 'VERY_EXPENSIVE'].indexOf(place.priceLevel) : null;
      const isOpenNow = place.currentOpeningHours?.openNow ?? place.regularOpeningHours?.openNow ?? null;
      
      return {
        place_id: place.id,
        name: place.displayName?.text || 'Unknown',
        address: place.formattedAddress || null,
        lat: place.location?.latitude || 0,
        lng: place.location?.longitude || 0,
        categories: place.types || null,
        rating: place.rating || null,
        ratings_total: place.userRatingCount || null,
        photo_name: firstPhoto?.name || null,
        price_level: priceLevel,
        is_open_now: isOpenNow,
      };
    });

    // Fetch existing filter_tags from database for these places
    const placeIds = baseCandidates.map(p => p.place_id);
    const { data: dbPlaces } = await supabaseAdmin
      .from('places')
      .select('place_id, filter_tags, price_level, unique_vibes')
      .in('place_id', placeIds);

    const dbPlaceMap = new Map<string, { filter_tags?: string[] | null; price_level?: number | null; unique_vibes?: string | null }>();
    if (dbPlaces) {
      for (const p of dbPlaces) {
        dbPlaceMap.set(p.place_id, { filter_tags: p.filter_tags, price_level: p.price_level, unique_vibes: p.unique_vibes });
      }
    }
    
    // Identify places missing filter_tags
    const placesNeedingTags = baseCandidates.filter(c => {
      const dbData = dbPlaceMap.get(c.place_id);
      return !dbData?.filter_tags || dbData.filter_tags.length === 0;
    });
    
    console.log(`⏱️  DB fetch: ${Date.now() - dbFetchStartTime}ms - Found ${dbPlaceMap.size} places in DB, ${placesNeedingTags.length} need filter_tags`);

    // Merge existing filter_tags from DB into candidates (don't wait for AI generation)
    const candidates: PlaceCandidate[] = baseCandidates.map(c => {
      const dbData = dbPlaceMap.get(c.place_id);
      const existingTags = dbData?.filter_tags;
      
      return {
        ...c,
        filter_tags: (existingTags && existingTags.length > 0) ? existingTags : null,
        // Use DB price_level if Google didn't provide one
        price_level: c.price_level ?? dbData?.price_level ?? null,
        // Include unique_vibes from DB
        unique_vibes: dbData?.unique_vibes ?? null,
      };
    });

    // ============ PARALLEL STEP 2: Fetch travel times + AI scoring + user data + auth + filter tags ============
    const parallelStartTime = Date.now();

    // Filter candidates with valid coordinates
    const validCandidates = candidates.filter(p => p.lat !== 0 && p.lng !== 0);
    
    // Helper function to calculate haversine distance
    const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371000; // Earth radius in meters
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat / 2) ** 2 +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    
    // Calculate straight-line distances and sort
    const candidatesWithDistance = validCandidates.map(p => ({
      ...p,
      straightLineDistance: haversineDistance(lat, lng, p.lat, p.lng)
    })).sort((a, b) => a.straightLineDistance - b.straightLineDistance);
    
    // Only calculate route matrix for closest 30 places (major optimization)
    const candidatesForRouting = candidatesWithDistance.slice(0, 30);
    console.log(`Routing optimization: ${validCandidates.length} → ${candidatesForRouting.length} candidates`);

    // Parallel operations (including auth fetch now)
    const [travelTimeResult, aiResult, authDataResult, filterTagsResult] = await Promise.all([
      // 2a: Geoapify travel times (only for top 30 nearest candidates)
      (async () => {
        const travelData = new Map<string, { eta: number | null; distance: number | null }>();
        
        try {
          const sources = [{ location: [lng, lat] }];
          const targets = candidatesForRouting.map(p => ({ location: [p.lng, p.lat] }));
          
          const matrixResponse = await fetch(
            `https://api.geoapify.com/v1/routematrix?apiKey=${geoapifyApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mode: mapModeToGeoapify(mode),
                sources,
                targets,
              }),
            }
          );

          if (matrixResponse.ok) {
            const matrixData = await matrixResponse.json();
            if (matrixData.sources_to_targets?.[0]) {
              const results = matrixData.sources_to_targets[0];
              candidatesForRouting.forEach((place, index) => {
                const result = results[index];
                travelData.set(place.place_id, {
                  eta: result?.time ?? null,
                  distance: result?.distance ?? null,
                });
              });
            }
          }
          
          // For places beyond top 30, estimate using straight-line distance
          candidatesWithDistance.slice(30).forEach(place => {
            // Rough estimate: 50 km/h average speed for driving
            const speedMps = mode === 'walk' ? 1.4 : mode === 'bike' ? 5.5 : 13.9;
            const estimatedEta = Math.round(place.straightLineDistance / speedMps);
            travelData.set(place.place_id, {
              eta: estimatedEta,
              distance: Math.round(place.straightLineDistance),
            });
          });
        } catch (e) {
          console.error('Geoapify error:', e);
        }
        
        return travelData;
      })(),

      // 2b: AI relevance scoring + summary (use intent for better context)
      getAIRelevanceAndSummary(intent || prompt, validCandidates, lovableApiKey),

      // 2c: Get authenticated user ID + fetch profile + saved places (moved from earlier sequential code)
      (async () => {
        let userId: string | null = null;
        if (authHeader) {
          try {
            const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
            const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
              global: { headers: { Authorization: authHeader } },
            });
            const { data: { user } } = await supabaseClient.auth.getUser();
            userId = user?.id || null;
          } catch (e) {
            console.error('Auth error:', e);
          }
        }
        
        // Fetch profile and saved places in parallel if user authenticated
        if (userId) {
          const [profileResult, savedPlacesResult] = await Promise.all([
            supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle(),
            supabaseAdmin.from('saved_places').select('place_id').eq('user_id', userId),
          ]);
          return { userId, profile: profileResult.data, savedPlaces: savedPlacesResult.data || [] };
        }
        
        return { userId: null, profile: null, savedPlaces: [] };
      })(),
      
      // 2f: Generate filter_tags for places that need them (non-blocking)
      (async () => {
        const generatedTagsMap = new Map<string, string[]>();
        if (placesNeedingTags.length > 0 && lovableApiKey) {
          try {
            const tags = await generateFilterTagsWithAI(placesNeedingTags, lovableApiKey);
            console.log(`AI generated tags for ${tags.size} places`);
            return tags;
          } catch (e) {
            console.error('Filter tags generation error:', e);
          }
        }
        return generatedTagsMap;
      })(),
    ]);

    console.log(`⏱️  Parallel operations completed in ${Date.now() - parallelStartTime}ms`);

    const travelData = travelTimeResult;
    const { relevanceMap, summary } = aiResult;
    const { userId: authenticatedUserId, profile, savedPlaces } = authDataResult;
    const generatedTagsMap = filterTagsResult;
    
    console.log('User:', authenticatedUserId || 'anonymous');
    
    // Merge generated tags into candidates that didn't have them
    if (generatedTagsMap.size > 0) {
      candidates.forEach((c, idx) => {
        if (!c.filter_tags || c.filter_tags.length === 0) {
          const generated = generatedTagsMap.get(c.place_id);
          if (generated) {
            candidates[idx].filter_tags = generated;
          }
        }
      });
    }

    // ============ STEP 3: Score and rank places ============
    const relevantCandidates = validCandidates.filter(p => relevanceMap.has(p.place_id));
    
    if (relevantCandidates.length === 0) {
      return new Response(
        JSON.stringify({ places: [], summary: 'No places matched your search criteria.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find max values for normalization
    let maxEta = 0;
    let maxDistance = 0;
    travelData.forEach(({ eta, distance }: { eta: number | null; distance: number | null }) => {
      if (eta !== null && eta > maxEta) maxEta = eta;
      if (distance !== null && distance > maxDistance) maxDistance = distance;
    });

    // Score places
    const rankedPlaces: RankedPlace[] = relevantCandidates.map(place => {
      const travel = travelData.get(place.place_id) || { eta: null, distance: null };
      const aiScore = (relevanceMap.get(place.place_id) || 50) / 100;
      const isSaved = savedPlaces.some(sp => sp.place_id === place.place_id);
      
      const scores = {
        aiRelevance: aiScore,
        eta: calculateEtaScore(travel.eta, maxEta),
        distance: calculateDistanceScore(travel.distance, maxDistance),
        profileFit: calculateProfileFit(profile as Profile | null, place),
        behaviorFit: isSaved ? 0.8 : 0.5,
        quality: calculateQualityScore(place.rating, place.ratings_total),
      };

      const totalScore =
        scores.aiRelevance * WEIGHTS.aiRelevance +
        scores.eta * WEIGHTS.eta +
        scores.distance * WEIGHTS.distance +
        scores.profileFit * WEIGHTS.profileFit +
        scores.behaviorFit * WEIGHTS.behaviorFit +
        scores.quality * WEIGHTS.quality;

      const why = generateWhyString(place, scores, travel.eta);

      return {
        ...place,
        eta_seconds: travel.eta,
        distance_meters: travel.distance,
        score: Math.round(totalScore * 100) / 100,
        why,
      };
    });

    // Sort by score descending
    rankedPlaces.sort((a, b) => b.score - a.score);
    const topPlaces = rankedPlaces.slice(0, limit);

    // ============ STEP 4: Upsert places to database (async, don't wait) ============
    const placesToUpsert = filteredGooglePlaces.map((place: any) => {
      const firstPhoto = place.photos?.[0];
      const priceLevel = place.priceLevel ? 
        ['FREE', 'INEXPENSIVE', 'MODERATE', 'EXPENSIVE', 'VERY_EXPENSIVE'].indexOf(place.priceLevel) : null;
      
      // Extract opening hours from regularOpeningHours
      let openingHours = null;
      let isOpenNow = null;
      if (place.regularOpeningHours) {
        isOpenNow = place.regularOpeningHours.openNow ?? place.currentOpeningHours?.openNow ?? null;
        openingHours = {
          open_now: isOpenNow ?? false,
          weekday_text: place.regularOpeningHours.weekdayDescriptions || [],
        };
      } else if (place.currentOpeningHours) {
        isOpenNow = place.currentOpeningHours.openNow ?? null;
      }
      
      return {
        place_id: place.id,
        name: place.displayName?.text || 'Unknown',
        address: place.formattedAddress || null,
        lat: place.location?.latitude || 0,
        lng: place.location?.longitude || 0,
        categories: place.types || null,
        rating: place.rating || null,
        ratings_total: place.userRatingCount || null,
        provider: 'google',
        raw: place,
        photo_name: firstPhoto?.name || null,
        price_level: priceLevel,
        opening_hours: openingHours,
        is_open_now: isOpenNow,
        last_enriched_at: new Date().toISOString(),
      };
    });

    // Fire and forget upsert
    supabaseAdmin.from('places').upsert(placesToUpsert, { onConflict: 'place_id' })
      .then(({ error }) => {
        if (error) console.error('Upsert error:', error);
        else {
          console.log(`Upserted ${placesToUpsert.length} places`);
          
          // Save generated filter_tags AFTER places are upserted
          if (generatedTagsMap.size > 0) {
            Promise.all(
              Array.from(generatedTagsMap.entries()).map(([place_id, filter_tags]) =>
                supabaseAdmin
                  .from('places')
                  .update({ filter_tags })
                  .eq('place_id', place_id)
              )
            ).then((results) => {
              const successCount = results.filter(r => !r.error).length;
              const errorCount = results.filter(r => r.error).length;
              if (successCount > 0) console.log(`Saved filter_tags for ${successCount} places`);
              if (errorCount > 0) console.error(`Failed to save tags for ${errorCount} places`);
            });
          }
        }
      });

    // Log search (fire and forget) - only for authenticated users
    if (authenticatedUserId) {
      supabaseAdmin.from('searches').insert({
        user_id: authenticatedUserId,
        prompt,
        lat,
        lng,
        mode,
        created_at: new Date().toISOString(),
      }).then(({ error }: { error: any }) => {
        if (error) console.error('Search log error:', error);
      });
    }

    const totalTime = Date.now() - startTime;
    console.log(`⏱️  Total: ${topPlaces.length} places in ${totalTime}ms`);

    return new Response(
      JSON.stringify({ places: topPlaces, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
