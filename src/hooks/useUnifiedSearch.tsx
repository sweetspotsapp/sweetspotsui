import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UnifiedPlace {
  place_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  categories: string[] | null;
  rating: number | null;
  ratings_total: number | null;
  photo_name: string | null;
  eta_seconds: number | null;
  distance_meters: number | null;
  score: number;
  why: string;
  price_level?: number | null;
  filter_tags?: string[] | null;
  photo_url?: string | null;
  is_open_now?: boolean | null;
}

interface SearchResult {
  places: UnifiedPlace[];
  summary: string;
}

interface CacheEntry {
  result: SearchResult;
  timestamp: number;
}

// Global cache with TTL
const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Generate photo URL using the place-photo proxy
const getPhotoUrl = (photoName: string | null): string | null => {
  if (!photoName) return null;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/place-photo?photo_name=${encodeURIComponent(photoName)}&maxWidthPx=400`;
};

// Generate cache key
const getCacheKey = (prompt: string, lat: number, lng: number, radiusM: number): string => {
  return `${prompt.toLowerCase().trim()}-${lat.toFixed(3)}-${lng.toFixed(3)}-${radiusM}`;
};

interface UseUnifiedSearchReturn {
  places: UnifiedPlace[];
  summary: string | null;
  isSearching: boolean;
  error: string | null;
  search: (
    prompt: string,
    options?: {
      lat?: number;
      lng?: number;
      radiusM?: number;
      mode?: 'drive' | 'walk' | 'bike';
      limit?: number;
      skipCache?: boolean;
    }
  ) => Promise<SearchResult | null>;
  clearError: () => void;
  clearResults: () => void;
}

export const useUnifiedSearch = (): UseUnifiedSearchReturn => {
  const [places, setPlaces] = useState<UnifiedPlace[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  
  const lastSearchRef = useRef<{
    prompt: string;
    lat: number;
    lng: number;
    radiusM: number;
    mode: 'drive' | 'walk' | 'bike';
  } | null>(null);

  // Get user's current location
  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.error("Geolocation failed:", err.message, err.code);
          let errorMessage = "Unable to get your location. ";
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage += "Please enable location access in your browser settings.";
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage += "Location information is unavailable.";
              break;
            case err.TIMEOUT:
              errorMessage += "Location request timed out. Please try again.";
              break;
            default:
              errorMessage += "Please enable location access.";
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 300000, // Cache location for 5 minutes
        }
      );
    });
  };

  const search = useCallback(
    async (
      prompt: string,
      options?: {
        lat?: number;
        lng?: number;
        radiusM?: number;
        mode?: 'drive' | 'walk' | 'bike';
        limit?: number;
        skipCache?: boolean;
      }
    ): Promise<SearchResult | null> => {
      if (!session) {
        setError("Please sign in to search");
        return null;
      }

      const radiusM = options?.radiusM ?? 4000;
      const mode = options?.mode ?? 'drive';
      const limit = options?.limit ?? 30;
      const skipCache = options?.skipCache ?? false;

      setIsSearching(true);
      setError(null);

      try {
        // Get location (use provided or fetch current)
        let lat = options?.lat;
        let lng = options?.lng;
        
        if (lat === undefined || lng === undefined) {
          const location = await getLocation();
          lat = location.lat;
          lng = location.lng;
        }

        // Store for potential retry
        lastSearchRef.current = { prompt, lat, lng, radiusM, mode };

        // Check cache
        const cacheKey = getCacheKey(prompt, lat, lng, radiusM);
        if (!skipCache) {
          const cached = searchCache.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            console.log('Cache hit for:', prompt);
            setPlaces(cached.result.places);
            setSummary(cached.result.summary);
            setIsSearching(false);
            return cached.result;
          }
        }

        console.log('Searching:', { prompt, lat: lat.toFixed(4), lng: lng.toFixed(4), radiusM, mode });

        // Call unified search endpoint
        const { data, error: searchError } = await supabase.functions.invoke(
          'unified-search',
          {
            body: { prompt, lat, lng, radius_m: radiusM, mode, limit },
          }
        );

        if (searchError) {
          console.error('Search error:', searchError);
          throw new Error(searchError.message || 'Search failed');
        }

        if (!data) {
          throw new Error('No response from search');
        }

        // Add photo URLs to places
        const placesWithPhotos: UnifiedPlace[] = (data.places || []).map((place: UnifiedPlace) => ({
          ...place,
          photo_url: getPhotoUrl(place.photo_name),
        }));

        const result: SearchResult = {
          places: placesWithPhotos,
          summary: data.summary || '',
        };

        // Update cache
        searchCache.set(cacheKey, {
          result,
          timestamp: Date.now(),
        });

        // Update state
        setPlaces(placesWithPhotos);
        setSummary(result.summary);

        console.log(`Found ${placesWithPhotos.length} places`);

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed';
        console.error('Search error:', message);
        setError(message);
        return null;
      } finally {
        setIsSearching(false);
      }
    },
    [session]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearResults = useCallback(() => {
    setPlaces([]);
    setSummary(null);
  }, []);

  return {
    places,
    summary,
    isSearching,
    error,
    search,
    clearError,
    clearResults,
  };
};

// Export type for compatibility with existing code
export type { UnifiedPlace as RankedPlace };
