import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Location } from './useLocation';

export interface DiscoveredPlace {
  place_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  categories: string[] | null;
  rating: number | null;
  ratings_total: number | null;
  photo_name: string | null;
  eta_seconds: number | null;
  distance_meters: number | null;
  score: number;
  why: string;
  photo_url?: string | null;
}

interface CacheEntry {
  places: DiscoveredPlace[];
  timestamp: number;
}

// Global cache for all sections
const sectionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Generate photo URL using the place-photo proxy
const getPhotoUrl = (photoName: string | null): string | null => {
  if (!photoName) return null;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/place-photo?photo_name=${encodeURIComponent(photoName)}&maxWidthPx=400`;
};

interface UseDiscoverySectionReturn {
  places: DiscoveredPlace[];
  isLoading: boolean;
  error: string | null;
  discover: (prompt: string, origin: Location, mode?: 'drive' | 'walk' | 'bike') => Promise<void>;
  retry: () => void;
}

export const useDiscoverySection = (
  sectionKey: string,
  radiusM: number = 4000
): UseDiscoverySectionReturn => {
  const [places, setPlaces] = useState<DiscoveredPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const lastParamsRef = useRef<{ prompt: string; origin: Location; mode: 'drive' | 'walk' | 'bike' } | null>(null);

  const discover = useCallback(async (
    prompt: string,
    origin: Location,
    mode: 'drive' | 'walk' | 'bike' = 'drive'
  ) => {
    // Store params for retry
    lastParamsRef.current = { prompt, origin, mode };

    // Check cache
    const cacheKey = `${sectionKey}-${prompt}-${origin.lat.toFixed(3)}-${origin.lng.toFixed(3)}`;
    const cached = sectionCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setPlaces(cached.places);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Discover candidates (fetch up to 60 places)
      const { data: discoverData, error: discoverError } = await supabase.functions.invoke(
        'discover_candidates',
        {
          body: { prompt, lat: origin.lat, lng: origin.lng, radius_m: radiusM, max_results: 60 },
        }
      );

      if (discoverError) {
        throw new Error(discoverError.message || 'Failed to discover places');
      }

      if (!discoverData?.place_ids?.length) {
        setPlaces([]);
        setIsLoading(false);
        return;
      }

      const placeIds = discoverData.place_ids as string[];

      // Step 2: Rank with travel time (return up to 60 places)
      const { data: rankData, error: rankError } = await supabase.functions.invoke(
        'rank_with_travel_time',
        {
          body: { prompt, origin, place_ids: placeIds, mode, limit: 60 },
        }
      );

      if (rankError) {
        throw new Error(rankError.message || 'Failed to rank places');
      }

      const rankedPlaces = (rankData?.places || []) as DiscoveredPlace[];

      if (rankedPlaces.length === 0) {
        setPlaces([]);
        setIsLoading(false);
        return;
      }

      // Step 3: Generate photo URLs using the place-photo proxy (no API call needed)
      const placesWithPhotos = rankedPlaces.map(place => ({
        ...place,
        photo_url: getPhotoUrl(place.photo_name),
      }));

      // Cache results
      sectionCache.set(cacheKey, {
        places: placesWithPhotos,
        timestamp: Date.now(),
      });

      setPlaces(placesWithPhotos);
    } catch (err) {
      console.error(`Discovery error for ${sectionKey}:`, err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [sectionKey, radiusM]);

  const retry = useCallback(() => {
    if (lastParamsRef.current) {
      const { prompt, origin, mode } = lastParamsRef.current;
      discover(prompt, origin, mode);
    }
  }, [discover]);

  return {
    places,
    isLoading,
    error,
    discover,
    retry,
  };
};
