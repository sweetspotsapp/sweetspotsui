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

// Weights for scoring
const WEIGHTS = {
  promptRelevance: 0.40,
  eta: 0.25,
  distance: 0.10,
  profileFit: 0.15,
  behaviorFit: 0.05,
  quality: 0.05,
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

// Calculate prompt relevance based on keyword matching
function calculatePromptRelevance(prompt: string, place: Place): number {
  const promptLower = prompt.toLowerCase();
  const promptWords = promptLower.split(/\s+/).filter(w => w.length > 2);
  
  let matchScore = 0;
  const nameLower = (place.name || '').toLowerCase();
  const categoriesLower = (place.categories || []).map(c => c.toLowerCase());
  
  for (const word of promptWords) {
    if (nameLower.includes(word)) {
      matchScore += 2;
    }
    for (const cat of categoriesLower) {
      if (cat.includes(word) || word.includes(cat.replace(/_/g, ' '))) {
        matchScore += 1;
      }
    }
  }
  
  // Normalize to 0-1 range (max reasonable score ~10)
  return Math.min(matchScore / 10, 1);
}

// Calculate ETA score (lower is better)
function calculateEtaScore(etaSeconds: number | null, maxEta: number): number {
  if (etaSeconds === null || maxEta === 0) return 0.5;
  // Invert so shorter ETA = higher score
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
  
  // Check dietary preferences
  if (profile.dietary) {
    const dietaryPrefs = Object.keys(profile.dietary).filter(k => profile.dietary![k]);
    for (const pref of dietaryPrefs) {
      if (categories.some(c => c.toLowerCase().includes(pref.toLowerCase()))) {
        score += 0.1;
      }
    }
  }
  
  // Check vibe preferences
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
  
  // Check if place is saved
  if (savedPlaces.some(sp => sp.place_id === placeId)) {
    score += 0.3;
  }
  
  // Check interactions
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
  
  // Normalize rating (1-5 scale to 0-1)
  const ratingNorm = (rating - 1) / 4;
  
  // Volume factor (log scale, capped at 1000 reviews)
  const volumeFactor = ratingsTotal 
    ? Math.min(Math.log10(ratingsTotal + 1) / 3, 1) 
    : 0.5;
  
  // Weighted combination
  return ratingNorm * 0.7 + volumeFactor * 0.3;
}

// Generate "why" string based on top scoring factors
function generateWhyString(
  place: Place,
  scores: {
    promptRelevance: number;
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
      score: scores.promptRelevance, 
      description: 'Matches your search' 
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
  
  // Sort by score and take top 2
  factors.sort((a, b) => b.score - a.score);
  const topFactors = factors.slice(0, 2).filter(f => f.score > 0.5);
  
  if (topFactors.length === 0) {
    return 'Good match for your search';
  }
  
  return topFactors.map(f => f.description).join(' • ');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const geoapifyApiKey = Deno.env.get('GEOAPIFY_API_KEY');

    if (!geoapifyApiKey) {
      console.error('GEOAPIFY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Geoapify API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Client for user authentication
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Parse request body
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

    // Call Geoapify Route Matrix API
    const geoapifyMode = mapModeToGeoapify(mode);
    const sources = [{ location: [origin.lng, origin.lat] }];
    const targets = validPlaces.map(p => ({ location: [p.lng!, p.lat!] }));

    console.log('Calling Geoapify Route Matrix API...');
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

    const matrixData = await matrixResponse.json();
    
    if (matrixData.error) {
      console.error('Geoapify error:', matrixData.error);
      return new Response(
        JSON.stringify({ error: 'Route matrix API error', details: matrixData.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Route matrix received');

    // Extract travel times and distances
    const travelData: Map<string, { eta: number | null; distance: number | null }> = new Map();
    
    if (matrixData.sources_to_targets && matrixData.sources_to_targets[0]) {
      const results = matrixData.sources_to_targets[0];
      validPlaces.forEach((place, index) => {
        const result = results[index];
        travelData.set(place.place_id, {
          eta: result?.time ?? null,
          distance: result?.distance ?? null,
        });
      });
    }

    // Find max values for normalization
    let maxEta = 0;
    let maxDistance = 0;
    travelData.forEach(({ eta, distance }) => {
      if (eta !== null && eta > maxEta) maxEta = eta;
      if (distance !== null && distance > maxDistance) maxDistance = distance;
    });

    // Score and rank places
    const rankedPlaces: RankedPlace[] = validPlaces.map(place => {
      const travel = travelData.get(place.place_id) || { eta: null, distance: null };
      
      const scores = {
        promptRelevance: calculatePromptRelevance(prompt, place),
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
        scores.promptRelevance * WEIGHTS.promptRelevance +
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

    // Sort by score descending and take top 20
    rankedPlaces.sort((a, b) => b.score - a.score);
    const topPlaces = rankedPlaces.slice(0, 20);

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
