import { useMemo } from "react";
import { MockPlace } from "@/components/PlaceCardCompact";

interface FilterOptions {
  activeFilters: Set<string>;
  maxDistance: number; // in km
}

// Price level mapping: 1 = cheap, 4 = expensive
const PRICE_FILTER_MAP: Record<string, (priceLevel: number | undefined) => boolean> = {
  under_50: (pl) => pl !== undefined && pl <= 2,
  "50_100": (pl) => pl === 3,
  "100_plus": (pl) => pl !== undefined && pl >= 4,
};

// Keywords to search in categories and ai_reason for each filter
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  friends: ["group", "friends", "social", "party", "fun"],
  romantic: ["romantic", "date", "intimate", "cozy", "couples"],
  family: ["family", "kid", "child", "children", "family-friendly"],
  solo: ["solo", "quiet", "work", "laptop", "study"],
  chill: ["chill", "quiet", "relaxed", "calm", "peaceful", "cozy"],
  lively: ["lively", "fun", "energetic", "vibrant", "buzzing", "party"],
  hidden: ["hidden", "gem", "secret", "local", "underrated", "off-beat"],
  scenic: ["scenic", "view", "rooftop", "beach", "sunset", "panoramic"],
  pet: ["pet", "dog", "pet-friendly", "dog-friendly"],
  late_night: ["late", "night", "24", "midnight", "late-night"],
  outdoor: ["outdoor", "terrace", "patio", "garden", "alfresco", "outside"],
};

export interface ExtendedMockPlace extends MockPlace {
  price_level?: number;
  opening_hours?: unknown;
}

/**
 * Checks if a place matches a specific filter
 */
const matchesFilter = (place: ExtendedMockPlace, filterId: string): boolean => {
  // Handle price filters
  if (PRICE_FILTER_MAP[filterId]) {
    return PRICE_FILTER_MAP[filterId](place.price_level);
  }

  // Handle category/vibe filters
  const keywords = CATEGORY_KEYWORDS[filterId];
  if (!keywords) return true; // Unknown filter, don't exclude

  // Search in categories array
  const categoriesText = (place.categories || []).join(" ").toLowerCase();
  // Search in ai_reason
  const aiReasonText = (place.ai_reason || "").toLowerCase();
  // Combined text to search
  const searchText = `${categoriesText} ${aiReasonText}`;

  return keywords.some((keyword) => searchText.includes(keyword));
};

/**
 * Client-side filtering hook for instant filter application
 */
export const useClientFilters = (
  places: ExtendedMockPlace[],
  options: FilterOptions
): ExtendedMockPlace[] => {
  const { activeFilters, maxDistance } = options;

  return useMemo(() => {
    if (places.length === 0) return [];
    if (activeFilters.size === 0 && maxDistance >= 25) return places;

    return places.filter((place) => {
      // Check distance filter
      if (maxDistance < 25) {
        const placeDistance = place.distance_km || 0;
        if (placeDistance > maxDistance) return false;
      }

      // Group filters by type for smarter matching
      const priceFilters = Array.from(activeFilters).filter(
        (f) => f in PRICE_FILTER_MAP
      );
      const categoryFilters = Array.from(activeFilters).filter(
        (f) => f in CATEGORY_KEYWORDS
      );

      // Price: if any price filter is selected, place must match at least one
      if (priceFilters.length > 0) {
        const matchesAnyPrice = priceFilters.some((f) => matchesFilter(place, f));
        if (!matchesAnyPrice) return false;
      }

      // Category/vibe filters: place must match ALL selected (AND logic)
      for (const filterId of categoryFilters) {
        if (!matchesFilter(place, filterId)) return false;
      }

      return true;
    });
  }, [places, activeFilters, maxDistance]);
};

export default useClientFilters;
