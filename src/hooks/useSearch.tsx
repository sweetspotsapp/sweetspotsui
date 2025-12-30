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
  ai_reason?: string;
  ai_category?: string;
}

interface SearchResult {
  places: RankedPlace[];
  placeIds: string[];
  summary?: string;
}

interface UseSearchReturn {
  search: (prompt: string, mode?: "drive" | "walk" | "bike") => Promise<SearchResult | null>;
  isSearching: boolean;
  error: string | null;
  clearError: () => void;
}

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
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 300000,
        }
      );
    });
  };

  // Reverse geocode to get city name
  const getCityFromCoords = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data.address?.city || data.address?.town || data.address?.municipality || null;
    } catch {
      return null;
    }
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

        // Step 2: Get city name for context
        const city = await getCityFromCoords(location.lat, location.lng);
        console.log("City context:", city);

        // Step 3: Call AI discover to get smart recommendations
        console.log("Calling ai-discover...");
        const { data: aiData, error: aiError } = await supabase.functions.invoke(
          "ai-discover",
          {
            body: {
              prompt,
              lat: location.lat,
              lng: location.lng,
              city,
            },
          }
        );

        if (aiError) {
          console.error("ai-discover error:", aiError);
          throw new Error(aiError.message || "Failed to get AI recommendations");
        }

        if (!aiData?.places?.length) {
          console.log("No AI recommendations found");
          return { places: [], placeIds: [], summary: aiData?.summary };
        }

        console.log(`AI recommended ${aiData.places.length} places:`, aiData.places.map((p: any) => p.name));

        // Step 4: Enrich places with Google Places data
        console.log("Calling enrich-places...");
        const { data: enrichData, error: enrichError } = await supabase.functions.invoke(
          "enrich-places",
          {
            body: {
              places: aiData.places,
              lat: location.lat,
              lng: location.lng,
            },
          }
        );

        if (enrichError) {
          console.error("enrich-places error:", enrichError);
          throw new Error(enrichError.message || "Failed to enrich places");
        }

        if (!enrichData?.places?.length) {
          console.log("No places could be enriched");
          return { places: [], placeIds: [], summary: aiData.summary };
        }

        console.log(`Enriched ${enrichData.places.length} places`);

        // Step 5: Calculate travel times (optional, for distance sorting)
        const enrichedPlaces = enrichData.places;
        
        // Convert to RankedPlace format with AI data
        const rankedPlaces: RankedPlace[] = enrichedPlaces.map((place: any, index: number) => ({
          place_id: place.place_id,
          name: place.name,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          categories: place.categories,
          rating: place.rating,
          ratings_total: place.ratings_total,
          provider: place.provider,
          photo_name: place.photo_name,
          eta_seconds: null, // Can add travel time calculation later
          distance_meters: place.lat && place.lng ? 
            Math.round(haversineDistance(location.lat, location.lng, place.lat, place.lng)) : null,
          score: 100 - index, // Maintain AI ranking order
          why: place.ai_reason || "",
          ai_reason: place.ai_reason,
          ai_category: place.ai_category,
        }));

        console.log(`Returning ${rankedPlaces.length} places with AI summary`);

        return {
          places: rankedPlaces,
          placeIds: rankedPlaces.map((p) => p.place_id),
          summary: aiData.summary,
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

// Haversine distance calculation in meters
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
