import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Origin {
  lat: number;
  lng: number;
}

interface RequestBody {
  prompt: string;
  origin: Origin;
  place_ids: string[];
  mode: 'drive' | 'walk' | 'bike';
  limit?: number;
}

interface Place {
  place_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  categories: string[] | null;
  rating: number | null;
  ratings_total: number | null;
  provider: string | null;
  raw: Record<string, unknown> | null;
}

interface RankedPlace extends Place {
  eta_seconds: number | null;
  distance_meters: number | null;
  score: number;
  why: string;
  ai_relevance?: number;
}

interface Profile {
  id: string;
  dietary: Record<string, unknown> | null;
  mobility: Record<string, unknown> | null;
  budget: string | null;
  vibe: Record<string, unknown> | null;
}

interface PlaceInteraction {
  place_id: string;
  action: string;
  weight: number;
}

interface SavedPlace {
  place_id: string;
}

// Updated weights - AI relevance is now most important
const WEIGHTS = {
  aiRelevance: 0.50,      // AI semantic relevance is now the primary factor
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

// AI-powered semantic relevance check using Lovable AI
async function getAIRelevanceScores(
  prompt: string,
  places: Place[],
  lovableApiKey: string
): Promise<Map<string, number>> {
  const relevanceMap = new Map<string, number>();
  
  // Prepare places data for AI
  const placesInfo = places.map(p => ({
    id: p.place_id,
    name: p.name,
    categories: (p.categories || []).slice(0, 5).join(', '),
  }));

  const systemPrompt = `You are a place relevance evaluator. Given a user's search query and a list of places, rate each place's relevance to the query on a scale of 0-100.

IMPORTANT RULES:
- 90-100: Perfect match (e.g., "new year celebration" → nightclub, rooftop bar, party venue)
- 70-89: Good match (e.g., "new year celebration" → restaurant with live music, hotel with event space)
- 50-69: Moderate match (e.g., "new year celebration" → nice restaurant, cafe with ambiance)
- 30-49: Weak match (e.g., "new year celebration" → regular restaurant, basic cafe)
- 0-29: Not relevant (e.g., "new year celebration" → car wash, hardware store, sports field)

Focus on SEMANTIC meaning, not just keywords. Consider:
- The user's likely INTENT behind the search
- What type of experience they're looking for
- Whether the place can actually fulfill that need

Be STRICT - only highly relevant places should score above 70.`;

  const userPrompt = `Search query: "${prompt}"

Places to evaluate:
${placesInfo.map((p, i) => `${i + 1}. "${p.name}" - Categories: ${p.categories || 'Unknown'}`).join('\n')}

Return a JSON object with place IDs as keys and relevance scores (0-100) as values. Only include places with score > 30.
Example format: {"place_id_1": 85, "place_id_2": 72}`;

  try {
    console.log('Calling Lovable AI for semantic relevance...');
    
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
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('Lovable AI error:', response.status);
      // Fallback: give all places a neutral score
      places.forEach(p => relevanceMap.set(p.place_id, 50));
      return relevanceMap;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response received, parsing...');
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    // Try to parse as JSON
    try {
      const scores = JSON.parse(jsonStr.trim());
      
      // Map scores to place IDs
      for (const place of places) {
        const score = scores[place.place_id];
        if (typeof score === 'number' && score > 30) {
          relevanceMap.set(place.place_id, score);
        }
      }
      
      console.log(`AI relevance: ${relevanceMap.size}/${places.length} places passed filter`);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: give all places a neutral score
      places.forEach(p => relevanceMap.set(p.place_id, 50));
    }
    
  } catch (error) {
    console.error('AI relevance check failed:', error);
    // Fallback: give all places a neutral score
    places.forEach(p => relevanceMap.set(p.place_id, 50));
  }

  return relevanceMap;
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
function calculateProfileFit(profile: Profile | null, place: Place): number {
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

// Calculate behavior fit based on past interactions
function calculateBehaviorFit(
  placeId: string,
  interactions: PlaceInteraction[],
  savedPlaces: SavedPlace[]
): number {
  let score = 0.5;
  
  if (savedPlaces.some(sp => sp.place_id === placeId)) {
    score += 0.3;
  }
  
  const placeInteractions = interactions.filter(i => i.place_id === placeId);
  for (const interaction of placeInteractions) {
    if (interaction.action === 'like' || interaction.action === 'visit') {
      score += 0.1 * (interaction.weight || 1);
    } else if (interaction.action === 'dislike') {
      score -= 0.2 * (interaction.weight || 1);
    }
  }
  
  return Math.max(0, Math.min(score, 1));
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
  place: Place,
  scores: {
    aiRelevance: number;
    eta: number;
    distance: number;
    profileFit: number;
    behaviorFit: number;
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
      name: 'favorite', 
      score: scores.behaviorFit, 
      description: 'Based on your activity' 
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    const geoapifyApiKey = Deno.env.get('GEOAPIFY_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!geoapifyApiKey) {
      console.error('GEOAPIFY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Geoapify API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Lovable API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const body: RequestBody = await req.json();
    const { prompt, origin, place_ids, mode } = body;

    if (!prompt || !origin || !place_ids || !mode) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: prompt, origin, place_ids, mode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['drive', 'walk', 'bike'].includes(mode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid mode. Must be drive, walk, or bike' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Rank request:', { prompt, origin, place_ids_count: place_ids.length, mode });

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }
    console.log('User profile fetched:', profile ? 'yes' : 'no');

    // Fetch user interactions
    const { data: interactions, error: interactionsError } = await supabaseClient
      .from('place_interactions')
      .select('place_id, action, weight')
      .eq('user_id', user.id);

    if (interactionsError) {
      console.error('Error fetching interactions:', interactionsError);
    }
    console.log('User interactions fetched:', interactions?.length || 0);

    // Fetch saved places
    const { data: savedPlaces, error: savedError } = await supabaseClient
      .from('saved_places')
      .select('place_id')
      .eq('user_id', user.id);

    if (savedError) {
      console.error('Error fetching saved places:', savedError);
    }
    console.log('Saved places fetched:', savedPlaces?.length || 0);

    // Fetch places
    const { data: places, error: placesError } = await supabaseClient
      .from('places')
      .select('*')
      .in('place_id', place_ids);

    if (placesError) {
      console.error('Error fetching places:', placesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch places', details: placesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!places || places.length === 0) {
      console.log('No places found');
      return new Response(
        JSON.stringify({ places: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Places fetched:', places.length);

    // Filter places with valid coordinates
    const validPlaces = places.filter(p => p.lat !== null && p.lng !== null);
    
    if (validPlaces.length === 0) {
      console.log('No places with valid coordinates');
      return new Response(
        JSON.stringify({ places: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get AI relevance scores - this filters out irrelevant places
    const aiRelevanceScores = await getAIRelevanceScores(prompt, validPlaces, lovableApiKey);
    
    // Filter to only include places that passed AI relevance check
    const relevantPlaces = validPlaces.filter(p => aiRelevanceScores.has(p.place_id));
    console.log(`AI filtered: ${relevantPlaces.length}/${validPlaces.length} places are relevant`);

    if (relevantPlaces.length === 0) {
      console.log('No relevant places found after AI filtering');
      return new Response(
        JSON.stringify({ places: [], message: 'No places matched your search criteria' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Geoapify Route Matrix API only for relevant places
    const geoapifyMode = mapModeToGeoapify(mode);
    const sources = [{ location: [origin.lng, origin.lat] }];
    const targets = relevantPlaces.map(p => ({ location: [p.lng!, p.lat!] }));

    console.log('Calling Geoapify Route Matrix API...');
    
    let travelData: Map<string, { eta: number | null; distance: number | null }> = new Map();
    let matrixSuccess = false;
    
    try {
      const matrixResponse = await fetch(
        `https://api.geoapify.com/v1/routematrix?apiKey=${geoapifyApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: geoapifyMode,
            sources,
            targets,
          }),
        }
      );

      if (!matrixResponse.ok) {
        const errorText = await matrixResponse.text();
        console.error('Geoapify HTTP error:', matrixResponse.status, errorText);
      } else {
        const matrixData = await matrixResponse.json();
        
        if (matrixData.error) {
          console.error('Geoapify API error:', matrixData.error);
        } else if (matrixData.sources_to_targets && matrixData.sources_to_targets[0]) {
          console.log('Route matrix received');
          matrixSuccess = true;
          const results = matrixData.sources_to_targets[0];
          relevantPlaces.forEach((place, index) => {
            const result = results[index];
            travelData.set(place.place_id, {
              eta: result?.time ?? null,
              distance: result?.distance ?? null,
            });
          });
        }
      }
    } catch (matrixError) {
      console.error('Geoapify request failed:', matrixError);
    }
    
    if (!matrixSuccess) {
      console.log('Proceeding without travel time data - ranking by other factors');
    }

    // Find max values for normalization
    let maxEta = 0;
    let maxDistance = 0;
    travelData.forEach(({ eta, distance }) => {
      if (eta !== null && eta > maxEta) maxEta = eta;
      if (distance !== null && distance > maxDistance) maxDistance = distance;
    });

    // Score and rank places
    const rankedPlaces: RankedPlace[] = relevantPlaces.map(place => {
      const travel = travelData.get(place.place_id) || { eta: null, distance: null };
      const aiScore = (aiRelevanceScores.get(place.place_id) || 50) / 100; // Normalize to 0-1
      
      const scores = {
        aiRelevance: aiScore,
        eta: calculateEtaScore(travel.eta, maxEta),
        distance: calculateDistanceScore(travel.distance, maxDistance),
        profileFit: calculateProfileFit(profile as Profile | null, place),
        behaviorFit: calculateBehaviorFit(
          place.place_id,
          (interactions || []) as PlaceInteraction[],
          (savedPlaces || []) as SavedPlace[]
        ),
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
        ai_relevance: aiRelevanceScores.get(place.place_id),
      };
    });

    // Sort by score descending
    rankedPlaces.sort((a, b) => b.score - a.score);
    
    // Apply limit (default to returning all relevant places)
    const limit = body.limit || relevantPlaces.length;
    const topPlaces = rankedPlaces.slice(0, limit);

    console.log('Returning', topPlaces.length, 'ranked places');
    return new Response(
      JSON.stringify({ places: topPlaces }),
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