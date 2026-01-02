import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  prompt: string;
  lat: number;
  lng: number;
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
}

interface RankedPlace extends PlaceCandidate {
  eta_seconds: number | null;
  distance_meters: number | null;
  score: number;
  why: string;
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
  // Check if prompt is already keyword-like (short, no question/conversational words)
  const conversationalWords = /\b(where|what|how|can|should|want|wanna|need|looking|find|get|take|go|somewhere|place|spot)\b/i;
  const isAlreadyKeywords = prompt.split(' ').length <= 5 && !conversationalWords.test(prompt);
  
  if (isAlreadyKeywords) {
    console.log('Prompt is already keyword-like, skipping translation');
    return { keywords: prompt, intent: prompt };
  }

  try {
    console.log('Translating natural language to keywords...');
    
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

// AI-powered semantic relevance check using Lovable AI
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
    summary = `Found ${places.length} spots matching your search nearby.`;
    return { relevanceMap, summary };
  }

  // Prepare places data for AI
  const placesInfo = places.slice(0, 40).map((p, i) => ({
    index: i,
    name: p.name,
    categories: (p.categories || []).slice(0, 5).join(', '),
    rating: p.rating,
  }));

  const systemPrompt = `You are a place relevance evaluator and local guide. Given a user's search query and a list of places:
1. Rate each place's relevance on a scale of 0-100
2. Generate a brief, helpful summary about finding these spots in the area

SCORING GUIDE:
- 80-100: Excellent match for the search intent
- 60-79: Good match, likely useful
- 40-59: Moderate match, possibly relevant
- 20-39: Weak match
- 0-19: Not relevant

Be GENEROUS for places that could reasonably satisfy the user's intent.`;

  const userPrompt = `Query: "${prompt}"

Places:
${placesInfo.map((p, i) => `${i}. ${p.name} (${p.categories || 'Unknown'}) - ${p.rating || 'N/A'}★`).join('\n')}

Respond with a JSON object containing:
1. "scores": array of [index, score] pairs for places scoring 40+
2. "summary": 1-2 sentence helpful insight about these options`;

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
      summary = `Found ${places.length} places matching "${prompt}" nearby.`;
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
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

    // Auth clients
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User:', user.id);

    // Parse request
    const body: RequestBody = await req.json();
    const { prompt, lat, lng, radius_m = 4000, mode = 'drive', limit = 30 } = body;

    if (!prompt || lat === undefined || lng === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: prompt, lat, lng' }),
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
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.photos,places.priceLevel,nextPageToken'
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

    // Transform to candidates
    const candidates: PlaceCandidate[] = allGooglePlaces.map((place: any) => {
      const firstPhoto = place.photos?.[0];
      const priceLevel = place.priceLevel ? 
        ['FREE', 'INEXPENSIVE', 'MODERATE', 'EXPENSIVE', 'VERY_EXPENSIVE'].indexOf(place.priceLevel) : null;
      
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

      // 2c: User profile
      supabaseClient.from('profiles').select('*').eq('id', user.id).maybeSingle(),

      // 2d: Saved places
      supabaseClient.from('saved_places').select('place_id').eq('user_id', user.id),
    ]);

    console.log(`Parallel operations completed in ${Date.now() - parallelStartTime}ms`);

    const travelData = travelTimeResult;
    const { relevanceMap, summary } = aiResult;
    const profile = profileResult.data;
    const savedPlaces = savedPlacesResult.data || [];

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
    travelData.forEach(({ eta, distance }) => {
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
        last_enriched_at: new Date().toISOString(),
      };
    });

    // Fire and forget upsert
    supabaseAdmin.from('places').upsert(placesToUpsert, { onConflict: 'place_id' })
      .then(({ error }) => {
        if (error) console.error('Upsert error:', error);
        else console.log(`Upserted ${placesToUpsert.length} places`);
      });

    // Log search (fire and forget)
    supabaseClient.from('searches').insert({
      user_id: user.id,
      prompt,
      lat,
      lng,
      mode,
      created_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.error('Search log error:', error);
    });

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
