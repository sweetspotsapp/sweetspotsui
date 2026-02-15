import { useMemo } from "react";
import { MockPlace } from "@/components/PlaceCardCompact";

interface FilterOptions {
  activeFilters: Set<string>;
  maxDistance: number; // in km
  userLat?: number;
  userLng?: number;
}

// Haversine distance in km between two coordinates
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Price level mapping: 1 = cheap, 4 = expensive
const PRICE_FILTER_MAP: Record<string, (priceLevel: number | undefined) => boolean> = {
  under_50: (pl) => pl !== undefined && pl <= 2,
  "50_100": (pl) => pl === 3,
  "100_plus": (pl) => pl !== undefined && pl >= 4,
};

// Map UI filter IDs to stored filter_tags
const FILTER_TAG_MAP: Record<string, string> = {
  halal: 'halal',
  vegetarian: 'vegetarian-vegan',
  gluten_free: 'gluten-free',
  wifi: 'free-wifi',
  outdoor: 'outdoor-seating',
  parking: 'parking',
  wheelchair: 'wheelchair-accessible',
  dog_friendly: 'pet-friendly',
  kid_friendly: 'family-friendly',
  late_night: 'late-night',
  large_groups: 'large-groups',
};

export interface ExtendedMockPlace extends MockPlace {
  price_level?: number;
  opening_hours?: unknown;
  filter_tags?: string[];
  lat?: number;
  lng?: number;
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
  
  // If place has no filter_tags, keep it (don't penalize untagged places)
  if (!tags || tags.length === 0) return true;

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
  const { activeFilters, maxDistance, userLat, userLng } = options;

  return useMemo(() => {
    if (places.length === 0) return [];
    if (activeFilters.size === 0 && maxDistance >= 25) return places;

    return places.filter((place) => {
      // Check distance filter using haversine if user coordinates available
      if (maxDistance < 25) {
        if (userLat !== undefined && userLng !== undefined && place.lat !== undefined && place.lng !== undefined) {
          const straightLineKm = haversineKm(userLat, userLng, place.lat, place.lng);
          if (straightLineKm > maxDistance) return false;
        } else {
          // Fallback to reported distance_km
          const placeDistance = place.distance_km || 0;
          if (placeDistance > maxDistance) return false;
        }
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
  }, [places, activeFilters, maxDistance, userLat, userLng]);
};

export default useClientFilters;
