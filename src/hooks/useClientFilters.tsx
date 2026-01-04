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

// Map UI filter IDs to stored filter_tags
const FILTER_TAG_MAP: Record<string, string> = {
  friends: 'good-for-friends',
  romantic: 'romantic',
  family: 'family-friendly',
  solo: 'good-for-solo',
  chill: 'chill-vibe',
  lively: 'lively-vibe',
  hidden: 'hidden-gem',
  scenic: 'scenic-view',
  pet: 'pet-friendly',
  late_night: 'late-night',
  outdoor: 'outdoor-seating',
};

export interface ExtendedMockPlace extends MockPlace {
  price_level?: number;
  opening_hours?: unknown;
  filter_tags?: string[];
}

/**
 * Checks if a place matches a specific filter using filter_tags
 */
const matchesFilter = (place: ExtendedMockPlace, filterId: string): boolean => {
  // Handle price filters
  if (PRICE_FILTER_MAP[filterId]) {
    // For price, if place has no price_level, don't exclude it
    if (place.price_level === undefined || place.price_level === null) return true;
    return PRICE_FILTER_MAP[filterId](place.price_level);
  }

  // Handle category/vibe filters using filter_tags
  const expectedTag = FILTER_TAG_MAP[filterId];
  if (!expectedTag) return true; // Unknown filter, don't exclude

  const tags = place.filter_tags;
  
  // If place has no filter_tags, don't match this filter
  if (!tags || tags.length === 0) return false;

  // If place has tags, check if it includes the expected one
  return tags.includes(expectedTag);
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
        (f) => f in FILTER_TAG_MAP
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
