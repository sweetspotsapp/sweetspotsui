import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  lovableApiKey: string
): Promise<{ keywords: string; intent: string }> {
  // Mood/vibe words that Google doesn't understand - these MUST be translated
  const moodWords = /\b(chill|vibes?|cozy|relaxing|romantic|fun|lively|trendy|quiet|peaceful|aesthetic|cute|fancy|casual|hipster|artsy|authentic|hidden|local|cool|nice|good|great|amazing|awesome|perfect|best|moody|intimate|upscale|lowkey|energetic|buzzing|serene|charming)\b/i;
  
  // Conversational patterns indicating natural language
  const conversationalPatterns = /\b(where|what|how|can|should|want|wanna|need|looking|find|get|take|go|somewhere|place|spot|feel|feeling|tonight|today|right now|mood|craving|bored|hungry|tired)\b/i;
  
  // Personal pronouns indicate natural language
  const personalPronouns = /\b(i|i'm|im|i am|me|my|we|us|our)\b/i;
  
  // Check if prompt contains mood words that Google can't understand
  const containsMoodWords = moodWords.test(prompt);
  
  // Skip translation only if:
  // 1. Very short (2 words or less) AND
  // 2. No mood words AND
  // 3. No conversational patterns AND
  // 4. No personal pronouns
  const isAlreadyKeywords = 
    prompt.split(' ').length <= 2 &&
    !containsMoodWords &&
    !conversationalPatterns.test(prompt) &&
    !personalPronouns.test(prompt);
  
  if (isAlreadyKeywords) {
    console.log('Prompt is already keyword-like, skipping translation');
    return { keywords: prompt, intent: prompt };
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
    
    // Extract JSON
    let jsonStr = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    const parsed = JSON.parse(jsonStr.trim());
    const keywords = parsed.keywords || prompt;
    const intent = parsed.intent || prompt;
    
    console.log(`Translated: "${prompt}" → "${keywords}"`);
    return { keywords, intent };
    
  } catch (error) {
    console.error('Translation error:', error);
    return { keywords: prompt, intent: prompt };
  }
}

// Valid filter tags that can be assigned to places
const VALID_FILTER_TAGS = [
  'good-for-friends',
  'romantic',
  'family-friendly',
  'good-for-solo',
  'chill-vibe',
  'lively-vibe',
  'hidden-gem',
  'scenic-view',
  'pet-friendly',
  'late-night',
  'outdoor-seating',
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
- good-for-friends: Social venues, group activities, lively atmosphere
- romantic: Date spots, intimate settings, romantic ambiance
- family-friendly: Kid-safe, welcoming to families, appropriate activities
- good-for-solo: Comfortable alone, counter seating, solo-friendly
- chill-vibe: Relaxed, quiet, calm atmosphere
- lively-vibe: Energetic, bustling, exciting atmosphere
- hidden-gem: Lesser-known, unique finds, off beaten path
- scenic-view: Good views, waterfront, rooftop, scenic location
- pet-friendly: Allows pets, outdoor seating areas
- late-night: Open late, nightlife spots, bars
- outdoor-seating: Patio, terrace, al fresco dining

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
    
    // Extract JSON from response
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }
    
    const parsed = JSON.parse(jsonStr.trim());
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
    summary = `Found ${places.length} ${prompt.toLowerCase().includes('restaurant') ? 'restaurants' : prompt.toLowerCase().includes('cafe') || prompt.toLowerCase().includes('coffee') ? 'cafes' : 'spots'} ready to explore. These range from cozy local favorites to popular hangouts with great reviews.`;
    return { relevanceMap, summary };
  }

  // Prepare places data for AI
  const placesInfo = places.slice(0, 40).map((p, i) => ({
    index: i,
    name: p.name,
    categories: (p.categories || []).slice(0, 5).join(', '),
    rating: p.rating,
  }));

  const systemPrompt = `You are a friendly local guide analyzing place recommendations. Given a user's search query and places found:
1. Rate each place's relevance on a scale of 0-100
2. Generate a descriptive, engaging 2-3 sentence summary that:
   - Acknowledges what they're looking for
   - Highlights the variety/quality of options found
   - Mentions standout spots or common themes (e.g., "lots of rooftop options", "mix of cozy cafes and trendy spots")
   
Write summaries like a helpful friend, NOT like a search engine. Be specific and insightful.

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
  "summary": "Your engaging 2-3 sentence analysis of these options for someone looking for ${prompt}"
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
      summary = `Found ${places.length} options for "${prompt}". From highly-rated favorites to hidden gems, there's plenty to explore here.`;
      return { relevanceMap, summary };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response length:', content.length);
    
    // Extract JSON from response
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
      const parsed = JSON.parse(jsonStr.trim());
      
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
      
      // Extract summary
      summary = parsed.summary || parsed.insight || `Found ${relevanceMap.size} great spots for "${prompt}".`;
      
      console.log(`AI scored ${relevanceMap.size}/${places.length} places`);
      
      // If AI returned nothing, fallback
      if (relevanceMap.size === 0) {
        console.log('AI returned no scores, using fallback');
        places.forEach(p => relevanceMap.set(p.place_id, 50));
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      places.forEach(p => relevanceMap.set(p.place_id, 50));
      summary = `Found ${places.length} places matching "${prompt}" nearby.`;
    }
    
  } catch (error) {
    console.error('AI relevance check failed:', error);
    places.forEach(p => relevanceMap.set(p.place_id, 50));
    summary = `Found ${places.length} places nearby.`;
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

    // Optional: Get user if auth header provided (for personalization)
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseClient.auth.getUser();
      userId = user?.id || null;
    }

    console.log('User:', userId || 'anonymous');

    // Parse request
    const body: RequestBody = await req.json();
    const { prompt, location_name, radius_m = 4000, mode = 'drive', limit = 30 } = body;
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
      
      // Use Geoapify Geocoding API
      const geocodeUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(location_name)}&limit=1&apiKey=${geoapifyApiKey}`;
      
      try {
        const geoResponse = await fetch(geocodeUrl);
        const geoData = await geoResponse.json();
        
        if (geoData.features && geoData.features.length > 0) {
          const [geoLng, geoLat] = geoData.features[0].geometry.coordinates;
          lat = geoLat;
          lng = geoLng;
          console.log(`Geocoded "${location_name}" to: ${lat}, ${lng}`);
        } else {
          console.error('Geocoding failed, no results');
          return new Response(
            JSON.stringify({ error: `Could not find location: ${location_name}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (geoError) {
        console.error('Geocoding error:', geoError);
        return new Response(
          JSON.stringify({ error: 'Failed to geocode location' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
    const { keywords, intent } = await translatePromptToKeywords(prompt, lovableApiKey);

    // ============ STEP 1: Google Places Text Search (fetch up to 60 places) ============
    const googleStartTime = Date.now();
    const searchUrl = 'https://places.googleapis.com/v1/places:searchText';
    
    let allGooglePlaces: any[] = [];
    let nextPageToken: string | null = null;
    const maxPages = 3;

    for (let page = 0; page < maxPages; page++) {
      const requestBody: any = {
        textQuery: keywords,  // Use translated keywords instead of raw prompt
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radius_m
          }
        },
        pageSize: 20,
        languageCode: "en"
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

      if (!nextPageToken || allGooglePlaces.length >= 60) break;
      
      if (nextPageToken) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
    }

    console.log(`Google Places: ${allGooglePlaces.length} places in ${Date.now() - googleStartTime}ms`);

    if (allGooglePlaces.length === 0) {
      return new Response(
        JSON.stringify({ places: [], summary: 'No places found matching your search.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ RELEVANCE FILTER: Exclude non-travel categories ============
    // These categories don't fit SweetSpots' travel/food/experience focus
    const EXCLUDED_CATEGORIES = new Set([
      // Retail/Shopping (not experiences)
      'clothing_store',
      'shoe_store',
      'jewelry_store',
      'electronics_store',
      'furniture_store',
      'hardware_store',
      'home_goods_store',
      'home_improvement_store',
      'department_store',
      'shopping_mall',
      'convenience_store',
      'supermarket',
      'grocery_or_supermarket',
      'discount_store',
      'wholesale_store',
      'liquor_store',
      'pet_store',
      'florist',
      'book_store',
      'sporting_goods_store',
      'outdoor_goods_store',
      // Services (not destinations)
      'car_dealer',
      'car_rental',
      'car_repair',
      'car_wash',
      'gas_station',
      'parking',
      'atm',
      'bank',
      'insurance_agency',
      'real_estate_agency',
      'lawyer',
      'accounting',
      'electrician',
      'plumber',
      'locksmith',
      'moving_company',
      'storage',
      'post_office',
      'laundry',
      'dry_cleaning',
      'tailor',
      // Medical (not experiences)
      'hospital',
      'doctor',
      'dentist',
      'pharmacy',
      'veterinary_care',
      'physiotherapist',
      // Education (not experiences)
      'school',
      'primary_school',
      'secondary_school',
      'university',
      'library',
      // Other non-relevant
      'cemetery',
      'funeral_home',
      'local_government_office',
      'police',
      'fire_station',
      'embassy',
      'courthouse',
      'city_hall',
    ]);

    // Categories that indicate the place IS relevant (override exclusion)
    const INCLUDED_CATEGORIES = new Set([
      'restaurant',
      'cafe',
      'coffee_shop',
      'bar',
      'bakery',
      'food',
      'meal_takeaway',
      'meal_delivery',
      'night_club',
      'tourist_attraction',
      'point_of_interest',
      'establishment',
      'park',
      'beach',
      'natural_feature',
      'museum',
      'art_gallery',
      'movie_theater',
      'bowling_alley',
      'amusement_park',
      'zoo',
      'aquarium',
      'spa',
      'gym',
      'stadium',
      'casino',
      'campground',
      'rv_park',
      'lodging',
      'hotel',
      'resort',
    ]);

    // Filter out irrelevant places
    const filteredGooglePlaces = allGooglePlaces.filter((place: any) => {
      const types: string[] = place.types || [];
      
      // If it has ANY included category, keep it
      const hasIncludedCategory = types.some(t => INCLUDED_CATEGORIES.has(t));
      if (hasIncludedCategory) return true;
      
      // If it has ANY excluded category and no included ones, drop it
      const hasExcludedCategory = types.some(t => EXCLUDED_CATEGORIES.has(t));
      if (hasExcludedCategory) return false;
      
      // If uncertain, keep it (could be a unique local spot)
      return true;
    });

    console.log(`Category filter: ${allGooglePlaces.length} → ${filteredGooglePlaces.length} places (removed ${allGooglePlaces.length - filteredGooglePlaces.length} irrelevant)`);

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
    
    console.log(`Found ${dbPlaceMap.size} places in DB, ${placesNeedingTags.length} need filter_tags`);

    // Generate filter_tags for places that don't have them using AI
    let generatedTagsMap = new Map<string, string[]>();
    if (placesNeedingTags.length > 0 && lovableApiKey) {
      generatedTagsMap = await generateFilterTagsWithAI(placesNeedingTags, lovableApiKey);
      console.log(`AI generated tags for ${generatedTagsMap.size} places`);
      
      // Save generated tags to database (fire and forget)
      const tagsToUpdate = Array.from(generatedTagsMap.entries()).map(([place_id, filter_tags]) => ({
        place_id,
        filter_tags,
      }));
      
      if (tagsToUpdate.length > 0) {
        supabaseAdmin.from('places').upsert(tagsToUpdate, { onConflict: 'place_id' })
          .then(({ error }) => {
            if (error) console.error('Failed to save generated tags:', error);
            else console.log(`Saved filter_tags for ${tagsToUpdate.length} places`);
          });
      }
    }

    // Merge filter_tags from DB or AI-generated into candidates
    const candidates: PlaceCandidate[] = baseCandidates.map(c => {
      const dbData = dbPlaceMap.get(c.place_id);
      const existingTags = dbData?.filter_tags;
      const generatedTags = generatedTagsMap.get(c.place_id);
      
      return {
        ...c,
        filter_tags: (existingTags && existingTags.length > 0) ? existingTags : (generatedTags || null),
        // Use DB price_level if Google didn't provide one
        price_level: c.price_level ?? dbData?.price_level ?? null,
        // Include unique_vibes from DB
        unique_vibes: dbData?.unique_vibes ?? null,
      };
    });

    // ============ PARALLEL STEP 2: Fetch travel times + AI scoring + user data ============
    const parallelStartTime = Date.now();

    // Filter candidates with valid coordinates
    const validCandidates = candidates.filter(p => p.lat !== 0 && p.lng !== 0);

    // Parallel operations
    const [travelTimeResult, aiResult, profileResult, savedPlacesResult] = await Promise.all([
      // 2a: Geoapify travel times
      (async () => {
        const travelData = new Map<string, { eta: number | null; distance: number | null }>();
        
        try {
          const sources = [{ location: [lng, lat] }];
          const targets = validCandidates.map(p => ({ location: [p.lng, p.lat] }));
          
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
              validCandidates.forEach((place, index) => {
                const result = results[index];
                travelData.set(place.place_id, {
                  eta: result?.time ?? null,
                  distance: result?.distance ?? null,
                });
              });
            }
          }
        } catch (e) {
          console.error('Geoapify error:', e);
        }
        
        return travelData;
      })(),

      // 2b: AI relevance scoring + summary (use intent for better context)
      getAIRelevanceAndSummary(intent || prompt, validCandidates, lovableApiKey),

      // 2c: User profile (only if authenticated)
      userId 
        ? supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),

      // 2d: Saved places (only if authenticated)
      userId
        ? supabaseAdmin.from('saved_places').select('place_id').eq('user_id', userId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    console.log(`Parallel operations completed in ${Date.now() - parallelStartTime}ms`);

    const travelData = travelTimeResult;
    const { relevanceMap, summary } = aiResult;
    const profile = profileResult.data;
    const savedPlaces: { place_id: string }[] = savedPlacesResult.data || [];

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
    const placesToUpsert = allGooglePlaces.map((place: any) => {
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
        else console.log(`Upserted ${placesToUpsert.length} places`);
      });

    // Log search (fire and forget) - only for authenticated users
    if (userId) {
      supabaseAdmin.from('searches').insert({
        user_id: userId,
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
    console.log(`Total: ${topPlaces.length} places in ${totalTime}ms`);

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
