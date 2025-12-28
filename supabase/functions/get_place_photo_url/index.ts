import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  photo_name: string;
  maxWidthPx: number;
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

    // Initialize Supabase client for auth verification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
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

    // Parse request body
    const body: RequestBody = await req.json();
    const { photo_name, maxWidthPx } = body;

    // Return null URL if photo_name is missing
    if (!photo_name) {
      console.log('No photo_name provided, returning null URL');
      return new Response(
        JSON.stringify({ url: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!googleMapsApiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use skipHttpRedirect=true to get the URL instead of the image
    const width = maxWidthPx || 400;
    const photoUrl = `https://places.googleapis.com/v1/${photo_name}/media?maxWidthPx=${width}&skipHttpRedirect=true&key=${googleMapsApiKey}`;
    
    console.log('Fetching photo URL for:', photo_name);
    
    const response = await fetch(photoUrl);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Photo API error:', data);
      return new Response(
        JSON.stringify({ url: null, error: data.error?.message || 'Failed to get photo URL' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The response contains photoUri when skipHttpRedirect=true
    const resultUrl = data.photoUri || null;
    
    console.log('Returning photo URL:', resultUrl ? 'success' : 'null');
    return new Response(
      JSON.stringify({ url: resultUrl }),
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
