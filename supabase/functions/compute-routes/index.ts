import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RouteRequest {
  routes: Array<{
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
  }>;
  travelMode?: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT';
}

interface RouteResult {
  durationSeconds: number | null;
  distanceMeters: number | null;
  durationText: string;
  distanceText: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!GOOGLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: RouteRequest = await req.json();
    const { routes, travelMode = 'DRIVE' } = body;

    if (!routes || routes.length === 0) {
      return new Response(JSON.stringify({ error: 'No routes provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cap at 10 routes per request to avoid abuse
    const routesToProcess = routes.slice(0, 10);

    // Process routes in parallel
    const results: RouteResult[] = await Promise.all(
      routesToProcess.map(async (route) => {
        try {
          const response = await fetch(
            'https://routes.googleapis.com/directions/v2:computeRoutes',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_API_KEY,
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.localizedValues',
              },
              body: JSON.stringify({
                origin: {
                  location: {
                    latLng: { latitude: route.origin.lat, longitude: route.origin.lng },
                  },
                },
                destination: {
                  location: {
                    latLng: { latitude: route.destination.lat, longitude: route.destination.lng },
                  },
                },
                travelMode,
                routingPreference: travelMode === 'DRIVE' ? 'TRAFFIC_AWARE' : undefined,
              }),
            }
          );

          if (!response.ok) {
            console.error('Routes API error:', await response.text());
            return { durationSeconds: null, distanceMeters: null, durationText: '', distanceText: '' };
          }

          const data = await response.json();
          const routeData = data.routes?.[0];

          if (!routeData) {
            return { durationSeconds: null, distanceMeters: null, durationText: '', distanceText: '' };
          }

          // Parse duration string like "1234s" to seconds
          const durationStr = routeData.duration || '0s';
          const durationSeconds = parseInt(durationStr.replace('s', ''), 10) || null;
          const distanceMeters = routeData.distanceMeters || null;

          // Use localized values if available, else format ourselves
          const localizedDuration = routeData.localizedValues?.duration?.text;
          const localizedDistance = routeData.localizedValues?.distance?.text;

          const durationText = localizedDuration || formatDuration(durationSeconds);
          const distanceText = localizedDistance || formatDistance(distanceMeters);

          return { durationSeconds, distanceMeters, durationText, distanceText };
        } catch (err) {
          console.error('Route computation error:', err);
          return { durationSeconds: null, distanceMeters: null, durationText: '', distanceText: '' };
        }
      })
    );

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Compute routes error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

function formatDistance(meters: number | null): string {
  if (!meters) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
