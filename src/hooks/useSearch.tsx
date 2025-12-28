import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface RankedPlace {
  place_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  categories: string[] | null;
  rating: number | null;
  ratings_total: number | null;
  provider: string | null;
  eta_seconds: number | null;
  distance_meters: number | null;
  score: number;
  why: string;
  photo_name: string | null;
}

interface SearchResult {
  places: RankedPlace[];
  placeIds: string[];
}

interface UseSearchReturn {
  search: (prompt: string, mode?: "drive" | "walk" | "bike") => Promise<SearchResult | null>;
  isSearching: boolean;
  error: string | null;
  clearError: () => void;
}

const DEFAULT_RADIUS_M = 5000; // 5km

export const useSearch = (): UseSearchReturn => {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser. Please use a modern browser."));
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
          // Don't silently fallback - tell the user we need their location
          console.error("Geolocation failed:", err.message, err.code);
          let errorMessage = "Unable to get your location. ";
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage += "Please enable location access in your browser settings and try again.";
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage += "Location information is unavailable. Please check your device's location settings.";
              break;
            case err.TIMEOUT:
              errorMessage += "Location request timed out. Please try again.";
              break;
            default:
              errorMessage += "Please enable location access to get recommendations near you.";
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: false, // Less strict for faster response
          timeout: 15000, // 15 seconds
          maximumAge: 300000, // 5 minutes cache
        }
      );
    });
  };

  const search = useCallback(
    async (prompt: string, mode: "drive" | "walk" | "bike" = "drive"): Promise<SearchResult | null> => {
      if (!session) {
        setError("Please sign in to search");
        return null;
      }

      setIsSearching(true);
      setError(null);

      try {
        // Step 1: Get user location
        const location = await getLocation();
        console.log("User location:", location);

        // Step 2: Call discover_candidates
        console.log("Calling discover_candidates...");
        const { data: discoverData, error: discoverError } = await supabase.functions.invoke(
          "discover_candidates",
          {
            body: {
              prompt,
              lat: location.lat,
              lng: location.lng,
              radius_m: DEFAULT_RADIUS_M,
            },
          }
        );

        if (discoverError) {
          console.error("discover_candidates error:", discoverError);
          throw new Error(discoverError.message || "Failed to discover places");
        }

        if (!discoverData?.place_ids?.length) {
          console.log("No places found");
          return { places: [], placeIds: [] };
        }

        console.log(`Found ${discoverData.place_ids.length} candidates`);

        // Step 3: Call rank_with_travel_time
        console.log("Calling rank_with_travel_time...");
        const { data: rankData, error: rankError } = await supabase.functions.invoke(
          "rank_with_travel_time",
          {
            body: {
              prompt,
              origin: location,
              place_ids: discoverData.place_ids,
              mode,
            },
          }
        );

        if (rankError) {
          console.error("rank_with_travel_time error:", rankError);
          throw new Error(rankError.message || "Failed to rank places");
        }

        const rankedPlaces: RankedPlace[] = rankData?.places || [];
        console.log(`Ranked ${rankedPlaces.length} places`);

        return {
          places: rankedPlaces,
          placeIds: rankedPlaces.map((p) => p.place_id),
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Search failed";
        console.error("Search error:", message);
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

  return { search, isSearching, error, clearError };
};
