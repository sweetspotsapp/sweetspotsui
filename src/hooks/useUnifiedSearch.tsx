import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  unique_vibes?: string | null;
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

// In-flight request deduplication: prevents identical concurrent requests from
// hitting the API twice (e.g. from cascading React effects or StrictMode).
const pendingRequests = new Map<string, Promise<SearchResult | null>>();

import { getPlacePhotoUrl } from '@/lib/photoLoader';

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
      locationName?: string; // e.g., "Tokyo", "Bali" - will geocode to get coordinates
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
        locationName?: string;
        radiusM?: number;
        mode?: 'drive' | 'walk' | 'bike';
        limit?: number;
        skipCache?: boolean;
      }
    ): Promise<SearchResult | null> => {
      const radiusM = options?.radiusM ?? 4000;
      const mode = options?.mode ?? 'drive';
      const limit = options?.limit ?? 30;
      const skipCache = options?.skipCache ?? false;

      setIsSearching(true);
      setError(null);

      try {
        // Get location (use provided, or use locationName for geocoding by backend, or fetch GPS)
        let lat = options?.lat;
        let lng = options?.lng;
        const locationName = options?.locationName;
        
        let resolvedLocationName = locationName;
        if (lat === undefined || lng === undefined) {
          if (!resolvedLocationName) {
            // No location name provided, try GPS — fall back gracefully if denied
            try {
              const location = await getLocation();
              lat = location.lat;
              lng = location.lng;
            } catch {
              // Geo failed — fall back to a default city so the backend has a location to geocode
              console.warn("Geolocation unavailable, falling back to default location");
              resolvedLocationName = "New York";
            }
          }
          // If locationName is provided, let the backend geocode it
        }

        // Store for potential retry
        lastSearchRef.current = { prompt, lat: lat || 0, lng: lng || 0, radiusM, mode };

        // Build cache key (include locationName if used)
        const cacheKeyLocation = resolvedLocationName || `${lat?.toFixed(3)}-${lng?.toFixed(3)}`;
        const cacheKey = `${prompt.toLowerCase().trim()}-${cacheKeyLocation}-${radiusM}`;
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

        // Deduplicate in-flight requests: if an identical request is already
        // in progress, return the same promise instead of firing a second call.
        if (pendingRequests.has(cacheKey)) {
          console.log('Deduplicating in-flight request for:', prompt);
          setIsSearching(false);
          return pendingRequests.get(cacheKey)!;
        }

        console.log('Searching:', { prompt, lat, lng, locationName: resolvedLocationName, radiusM, mode });

        // Build request body - include location_name if provided
        const requestBody: Record<string, unknown> = { 
          prompt, 
          radius_m: radiusM, 
          mode, 
          limit 
        };
        
        if (lat !== undefined && lng !== undefined) {
          requestBody.lat = lat;
          requestBody.lng = lng;
        }
        
        if (resolvedLocationName) {
          requestBody.location_name = resolvedLocationName;
        }

        // Wrap the network call in a tracked promise so the deduplication
        // check above can return the same promise for concurrent identical requests.
        const requestPromise = (async (): Promise<SearchResult> => {
          // Call unified search endpoint
          const { data, error: searchError } = await supabase.functions.invoke(
            'unified-search',
            { body: requestBody }
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
            photo_url: getPlacePhotoUrl(place.place_id),
          }));

          return {
            places: placesWithPhotos,
            summary: data.summary || '',
          };
        })();

        pendingRequests.set(cacheKey, requestPromise);

        let result: SearchResult;
        try {
          result = await requestPromise;
        } finally {
          pendingRequests.delete(cacheKey);
        }

        // Update cache
        searchCache.set(cacheKey, {
          result,
          timestamp: Date.now(),
        });

        // Update state
        setPlaces(result.places);
        setSummary(result.summary);

        console.log(`Found ${result.places.length} places`);

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
    []
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
