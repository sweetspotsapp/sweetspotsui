import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import LoginReminderBanner from "./LoginReminderBanner";
import { Menu, Search, ChevronRight, ChevronLeft, ChevronDown, X, Settings, Loader2, MapPin, Sparkles, SlidersHorizontal, IceCreamCone, Map, List } from "lucide-react";
import ProfileSlideMenu from "./ProfileSlideMenu";
import { useApp } from "@/context/AppContext";
import { Input } from "./ui/input";
import SlideOutMenu from "./SlideOutMenu";
import PlaceCardCompact, { MockPlace } from "./PlaceCardCompact";
import TopPickCard from "./TopPickCard";
import TopPicksSection from "./TopPicksSection";
import SaveToBoardDialog from "./saved/SaveToBoardDialog";
import TravelPersonalityFilterModal, { FilterState } from "./TravelPersonalityFilterModal";
import AISummaryCard from "./AISummaryCard";
import { useUnifiedSearch, UnifiedPlace } from "@/hooks/useUnifiedSearch";
import { useLocation } from "@/hooks/useLocation";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { useClientFilters, ExtendedMockPlace } from "@/hooks/useClientFilters";
import LocationPickerModal from "./LocationPickerModal";
import { useSearchLimit } from "@/hooks/useSearchLimit";
import UpgradeModal from "./UpgradeModal";
import { usePlaceSaveCounts } from "@/hooks/usePlaceSaveCounts";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import BoardMapView from "./saved/BoardMapView";
import { useFeedback } from "@/context/FeedbackContext";
import type { RankedPlace } from "@/hooks/useSearch";

// Extended MockPlace with lat/lng for map view
interface MockPlaceWithCoords extends MockPlace {
  lat?: number;
  lng?: number;
  filter_tags?: string[];
  price_level?: number;
  is_open_now?: boolean | null;
  ai_score?: number;
  ratings_total?: number;
  unique_vibes?: string | null;
}

const unifiedToMockPlace = (place: UnifiedPlace): MockPlaceWithCoords => ({
  id: place.place_id,
  name: place.name,
  image: place.photo_url || `https://source.unsplash.com/400x300/?restaurant,cafe&${place.name.slice(0, 3)}`,
  rating: place.rating || 4.0,
  distance_km: place.distance_meters ? Math.round(place.distance_meters / 100) / 10 : 1.0,
  categories: place.categories || [],
  ai_reason: place.why,
  ai_category: place.categories?.[0] || undefined,
  lat: place.lat,
  lng: place.lng,
  filter_tags: place.filter_tags || [],
  price_level: place.price_level,
  is_open_now: place.is_open_now,
  ai_score: place.score,
  ratings_total: place.ratings_total || 0,
  unique_vibes: place.unique_vibes
});

const FILTER_LABELS: Record<string, string> = {
  under_50: "Under $50",
  "50_100": "$50–$100",
  "100_plus": "$100+",
  friends: "With Friends",
  romantic: "Romantic Date",
  family: "Family-Friendly",
  solo: "Solo",
  chill: "Chill & Quiet",
  lively: "Fun & Lively",
  hidden: "Hidden Gems",
  scenic: "Scenic / Nice View",
  pet: "Pet-Friendly",
  late_night: "Late Night",
  outdoor: "Outdoor Seating"
};

interface SectionRowProps {
  title: string;
  places: MockPlaceWithCoords[];
  allPlaces: MockPlaceWithCoords[];
  onPlaceClick: (place: MockPlace) => void;
  toggleSave: (placeId: string) => void;
  isSaved: (placeId: string) => boolean;
  featured?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  onSeeAll?: (allPlaces: MockPlaceWithCoords[]) => void;
  showDistance?: boolean;
  saveCounts?: Record<string, number>;
}

const SectionRow: React.FC<SectionRowProps> = ({
  title, places, allPlaces, onPlaceClick, toggleSave, isSaved,
  featured = false, userLocation, onSeeAll, showDistance = true, saveCounts = {},
}) => {
  const handleSeeAll = () => { if (onSeeAll) onSeeAll(allPlaces); };
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scrollBy = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === 'left' ? -200 : 200;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className="mb-8 group/section">
      <div className="flex items-center justify-between px-4 lg:px-8 mb-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <button onClick={handleSeeAll} className="flex items-center gap-1 text-sm text-primary font-medium hover:underline cursor-pointer">
          See all <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="lg:hidden relative">
        {showLeftArrow && (
          <button onClick={() => scrollBy('left')} className="absolute left-1 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-8 h-8 bg-card/95 backdrop-blur-sm rounded-full shadow-lg border border-border opacity-0 group-hover/section:opacity-100 transition-opacity duration-200 hover:bg-card">
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
        )}
        {showRightArrow && (
          <button onClick={() => scrollBy('right')} className="absolute right-1 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-8 h-8 bg-card/95 backdrop-blur-sm rounded-full shadow-lg border border-border opacity-0 group-hover/section:opacity-100 transition-opacity duration-200 hover:bg-card">
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        )}
        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          {places.map((place) => (
            <PlaceCardCompact key={place.id} place={place} onSave={toggleSave} isSaved={isSaved(place.id)} onClick={() => onPlaceClick(place)} featured={featured} showDistance={showDistance} saveCount={saveCounts[place.id] || 0} />
          ))}
        </div>
      </div>
      <div className="hidden lg:grid grid-cols-3 lg:grid-cols-4 gap-4 px-8">
        {places.map((place) => (
          <PlaceCardCompact key={place.id} place={place} onSave={toggleSave} isSaved={isSaved(place.id)} onClick={() => onPlaceClick(place)} featured={featured} showDistance={showDistance} saveCount={saveCounts[place.id] || 0} isGridItem />
        ))}
      </div>
    </div>
  );
};

const CACHE_KEY = 'sweetspots_search_cache';
const SUMMARY_CACHE_KEY = 'sweetspots_summary_cache';
const CACHE_VERSION_KEY = 'sweetspots_cache_version';
const CACHED_MOOD_KEY = 'sweetspots_cached_mood';
const CACHED_LOCATION_KEY = 'sweetspots_cached_location';
const SKIP_MODE_KEY = 'sweetspots_skip_mode';
const CURRENT_CACHE_VERSION = '2';

const getTimeBasedPrompt = (): string => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return "trending breakfast spots and coffee shops open now";
  if (hour >= 11 && hour < 14) return "popular lunch spots and quick eats nearby";
  if (hour >= 14 && hour < 17) return "cozy cafes and afternoon hangouts";
  if (hour >= 17 && hour < 21) return "best dinner spots and evening restaurants";
  return "late night eats, bars, and dessert spots open now";
};

interface DiscoverPageProps {
  onNavigateToProfile?: () => void;
}

const DiscoverPage = ({ onNavigateToProfile }: DiscoverPageProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { userMood, setUserMood, isSaved: isPlaceSaved, toggleSave: togglePlaceSave, onboardingData, setOnboardingData } = useApp();
  const { search, isSearching, error: searchError, clearError, summary: searchSummary } = useUnifiedSearch();
  const { location: userLocation, setManualLocation } = useLocation();
  const { searchesLeft, hasReachedLimit, increment: incrementSearchCount } = useSearchLimit();
  const hasLoadedInitial = useRef(false);
  const hasConsumedSearchParam = useRef(false);

  const getCachedResults = (): MockPlace[] => {
    try {
      const version = sessionStorage.getItem(CACHE_VERSION_KEY);
      if (version !== CURRENT_CACHE_VERSION) {
        sessionStorage.removeItem(CACHE_KEY);
        sessionStorage.removeItem(SUMMARY_CACHE_KEY);
        sessionStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
        return [];
      }
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) { console.error('Failed to restore cache:', e); }
    return [];
  };

  const isSkipModeOnMount = useRef(() => {
    const skipMode = sessionStorage.getItem(SKIP_MODE_KEY) === 'true';
    if (skipMode) {
      sessionStorage.removeItem(CACHE_KEY);
      sessionStorage.removeItem(SUMMARY_CACHE_KEY);
      sessionStorage.removeItem(CACHED_MOOD_KEY);
      sessionStorage.removeItem(SKIP_MODE_KEY);
      return true;
    }
    return false;
  });
  const wasSkipMode = useRef(isSkipModeOnMount.current());

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState(wasSkipMode.current ? "" : userMood || "");
  const [showUpgrade, setShowUpgrade] = useState(false);

  const searchHints = useMemo(() => [
    "Try 'rooftop sunset drinks'",
    "Try 'cozy café with wifi'",
    "Try 'hidden gems near me'",
    "Try 'date night vibes'",
    "Try 'brunch with a view'",
    "Try 'late night eats'",
    "Try 'quiet spot to work'",
    "Try 'best coffee in town'",
  ], []);
  const [hintIndex, setHintIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => { setHintIndex((i) => (i + 1) % searchHints.length); }, 3000);
    return () => clearInterval(interval);
  }, [searchHints.length]);

  useEffect(() => {
    if (userMood && !searchValue && !wasSkipMode.current) setSearchValue(userMood);
  }, [userMood]);

  useEffect(() => {
    if (hasConsumedSearchParam.current) return;
    const searchQuery = searchParams.get('search');
    if (searchQuery) {
      hasConsumedSearchParam.current = true;
      setSearchValue(searchQuery);
      setUserMood(searchQuery);
      setSearchParams({}, { replace: true });
      sessionStorage.removeItem(CACHE_KEY);
      sessionStorage.removeItem(SUMMARY_CACHE_KEY);
      sessionStorage.removeItem(CACHED_MOOD_KEY);
    }
  }, [searchParams, setSearchParams, setUserMood]);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(() => {
    if (wasSkipMode.current) return null;
    try {
      const version = sessionStorage.getItem(CACHE_VERSION_KEY);
      if (version !== CURRENT_CACHE_VERSION) return null;
      return sessionStorage.getItem(SUMMARY_CACHE_KEY);
    } catch { return null; }
  });
  const [searchResults, setSearchResults] = useState<MockPlace[]>(() => {
    if (wasSkipMode.current) return [];
    return getCachedResults();
  });
  const placeIds = useMemo(() => searchResults.map((p) => p.id), [searchResults]);
  const saveCounts = usePlaceSaveCounts(placeIds);
  const recentSearches = useRecentSearches();
  const [isInitialLoading, setIsInitialLoading] = useState(() => {
    if (wasSkipMode.current) return true;
    return getCachedResults().length === 0;
  });
  const [needsLocationPermission, setNeedsLocationPermission] = useState(false);
  const [maxDistance, setMaxDistance] = useState(25);
  const [saveToBoardPlace, setSaveToBoardPlace] = useState<MockPlace | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({ budget: null, vibes: [], placeTypes: [] });
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isMapView, setIsMapView] = useState(false);
  const { trackSearch } = useFeedback();

  const filteredResults = useClientFilters(
    searchResults as ExtendedMockPlace[],
    { activeFilters, maxDistance, userLat: userLocation?.lat, userLng: userLocation?.lng }
  );

  useEffect(() => {
    if (searchResults.length > 0) {
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(searchResults)); } catch (e) { console.error('Failed to cache results:', e); }
    }
  }, [searchResults]);

  useEffect(() => {
    if (aiSummary) {
      try { sessionStorage.setItem(SUMMARY_CACHE_KEY, aiSummary); } catch (e) { console.error('Failed to cache summary:', e); }
    }
  }, [aiSummary]);

  useEffect(() => {
    const cachedMood = sessionStorage.getItem(CACHED_MOOD_KEY) || "";
    const cachedLocation = sessionStorage.getItem(CACHED_LOCATION_KEY) || "";
    const currentMood = userMood?.trim() || "";
    const currentLocation = onboardingData?.explore_location || "";
    const moodChanged = currentMood !== "" && currentMood !== cachedMood;
    const locationChanged = currentLocation !== "" && currentLocation !== cachedLocation;

    if (hasLoadedInitial.current && !moodChanged && !locationChanged && !wasSkipMode.current) return;
    if (!wasSkipMode.current && !moodChanged && !locationChanged && searchResults.length > 0) {
      hasLoadedInitial.current = true;
      setIsInitialLoading(false);
      return;
    }
    hasLoadedInitial.current = true;

    const loadInitialPlaces = async () => {
      setIsInitialLoading(true);
      if (locationChanged || moodChanged) {
        sessionStorage.removeItem(CACHE_KEY);
        sessionStorage.removeItem(SUMMARY_CACHE_KEY);
        sessionStorage.removeItem(CACHED_MOOD_KEY);
        sessionStorage.removeItem(CACHED_LOCATION_KEY);
        setSearchResults([]);
        setAiSummary(null);
      }
      try {
        let searchPrompt: string;
        if (wasSkipMode.current) {
          searchPrompt = getTimeBasedPrompt();
          wasSkipMode.current = false;
        } else {
          searchPrompt = currentMood || "popular restaurants and cafes nearby";
        }
        const searchOptions: { locationName?: string; skipCache?: boolean } = { skipCache: moodChanged || locationChanged };
        if (currentLocation && currentLocation !== "nearby") searchOptions.locationName = currentLocation;
        const result = await search(searchPrompt, searchOptions);
        if (result && result.places.length > 0) {
          setSearchResults(result.places.map(unifiedToMockPlace));
          setAiSummary(result.summary || null);
        }
      } catch (err) {
        console.error("Failed to load initial places:", err);
        if (err instanceof Error && err.message.includes("location")) setNeedsLocationPermission(true);
      } finally {
        setIsInitialLoading(false);
      }
    };

    if (currentMood) sessionStorage.setItem(CACHED_MOOD_KEY, currentMood);
    if (currentLocation) sessionStorage.setItem(CACHED_LOCATION_KEY, currentLocation);
    loadInitialPlaces();
  }, [search, userMood, onboardingData?.explore_location]);

  useEffect(() => {
    if (searchError) {
      if (searchError.includes("location")) setNeedsLocationPermission(true);
      toast.error(searchError);
      clearError();
    }
  }, [searchError, clearError]);

  const getPlaceById = useCallback((placeId: string) => searchResults.find((p) => p.id === placeId), [searchResults]);

  const handleSaveClick = useCallback((placeId: string) => {
    if (isPlaceSaved(placeId)) { void togglePlaceSave(placeId); return; }
    const place = getPlaceById(placeId);
    if (place) setSaveToBoardPlace(place);
  }, [isPlaceSaved, togglePlaceSave, getPlaceById]);

  const handleBoardSaveConfirmed = useCallback(() => { setSaveToBoardPlace(null); }, []);
  const isSaved = useCallback((placeId: string) => isPlaceSaved(placeId), [isPlaceSaved]);

  const handlePlaceClick = (place: MockPlace) => {
    navigate(`/place/${place.id}`, { state: { ai_reason: place.ai_reason } });
  };

  const handleSeeAll = (allPlaces: MockPlaceWithCoords[]) => {
    navigate(`/see-all`, { state: { places: allPlaces, userLocation, searchQuery: searchValue || userMood } });
  };

  const buildSearchPrompt = (basePrompt: string, filters: FilterState): string => {
    let prompt = basePrompt;
    if (filters.placeTypes.length > 0) prompt += `, ${filters.placeTypes.join(", ")}`;
    if (filters.budget) {
      const budgetLabels: Record<string, string> = { under_50: "budget-friendly under $50", "50_100": "mid-range $50-$100", "100_plus": "upscale $100+" };
      prompt += `, ${budgetLabels[filters.budget]}`;
    }
    if (filters.vibes.length > 0) prompt += `, ${filters.vibes.join(", ")}`;
    return prompt;
  };

  const searchInFlightRef = useRef(false);
  const lastSearchQueryRef = useRef("");

  const triggerSearch = async (query: string) => {
    if (!query.trim()) return;
    const trimmed = query.trim();
    if (searchInFlightRef.current && trimmed === lastSearchQueryRef.current) return;
    if (hasReachedLimit) { setShowUpgrade(true); return; }

    searchInFlightRef.current = true;
    lastSearchQueryRef.current = trimmed;
    setSearchValue(trimmed);
    setUserMood(trimmed);
    setNeedsLocationPermission(false);
    setAiSummary(null);
    setSearchResults([]);
    try {
      sessionStorage.removeItem(CACHE_KEY);
      sessionStorage.removeItem(SUMMARY_CACHE_KEY);
      sessionStorage.setItem(CACHED_MOOD_KEY, trimmed);
    } catch (e) { console.error('Failed to clear cache:', e); }

    const searchPrompt = buildSearchPrompt(trimmed, appliedFilters);
    const searchOptions: { locationName?: string; skipCache?: boolean } = { skipCache: true };
    const exploreLocation = onboardingData?.explore_location;
    if (exploreLocation && exploreLocation !== "nearby") searchOptions.locationName = exploreLocation;

    try {
      const result = await search(searchPrompt, searchOptions);
      if (result && result.places.length > 0) {
        setSearchResults(result.places.map(unifiedToMockPlace));
        setAiSummary(result.summary || null);
        toast.success(`Found ${result.places.length} spots for you!`);
        incrementSearchCount();
        trackSearch(trimmed);
      } else if (result && result.places.length === 0) {
        toast.info("No places found. Try a different search.");
        setSearchResults([]);
        setAiSummary(result.summary || null);
      }
    } finally {
      searchInFlightRef.current = false;
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await triggerSearch(searchValue);
  };

  const handleFilterConfirm = async (filters: FilterState) => {
    setAppliedFilters(filters);
    const newActiveFilters = new Set<string>();
    if (filters.budget) newActiveFilters.add(filters.budget);
    filters.vibes.forEach((v) => {
      const vibeMap: Record<string, string> = {
        "Chill & relaxation": "chill", "Fun With Friends": "friends", "Family Time": "family",
        "Hidden gems": "hidden", "Nights Life": "late_night", "Adventure & outdoors": "outdoor"
      };
      newActiveFilters.add(vibeMap[v] || v.toLowerCase().replace(/\s+/g, '_'));
    });
    setActiveFilters(newActiveFilters);

    if (searchValue.trim() || userMood) {
      const basePrompt = searchValue.trim() || userMood || "popular restaurants and cafes nearby";
      const searchPrompt = buildSearchPrompt(basePrompt, filters);
      setAiSummary(null);
      setSearchResults([]);
      try { sessionStorage.removeItem(CACHE_KEY); sessionStorage.removeItem(SUMMARY_CACHE_KEY); } catch (e) {}
      const searchOptions: { locationName?: string; skipCache?: boolean } = { skipCache: true };
      const exploreLocation = onboardingData?.explore_location;
      if (exploreLocation && exploreLocation !== "nearby") searchOptions.locationName = exploreLocation;
      const result = await search(searchPrompt, searchOptions);
      if (result && result.places.length > 0) {
        setSearchResults(result.places.map(unifiedToMockPlace));
        setAiSummary(result.summary || null);
        toast.success(`Found ${result.places.length} spots matching your filters!`);
      }
    }
  };

  const handleRetryWithLocation = async () => {
    setNeedsLocationPermission(false);
    setIsInitialLoading(true);
    try {
      const searchOptions: { locationName?: string } = {};
      const exploreLocation = onboardingData?.explore_location;
      if (exploreLocation && exploreLocation !== "nearby") searchOptions.locationName = exploreLocation;
      const result = await search("popular restaurants and cafes nearby", searchOptions);
      if (result && result.places.length > 0) {
        setSearchResults(result.places.map(unifiedToMockPlace));
        setAiSummary(result.summary || null);
      }
    } catch (err) { console.error("Retry failed:", err); }
    finally { setIsInitialLoading(false); }
  };

  const handleClearSearch = () => { setSearchValue(""); setUserMood(""); };
  const removeFilter = (filterId: string) => { const n = new Set(activeFilters); n.delete(filterId); setActiveFilters(n); };

  const handleLocationChange = (newLocation: string) => {
    setOnboardingData({ ...(onboardingData || { trip_intention: null, budget: null, travel_personality: [] }), explore_location: newLocation });
    setIsLocationPickerOpen(false);
  };

  const displaySections = useMemo(() => {
    if (filteredResults.length === 0) return [];
    const usedPlaceIds = new Set<string>();
    const sections: { title: string; places: MockPlace[]; featured: boolean }[] = [];

    const scoredPlaces = filteredResults.map((place) => {
      const extPlace = place as MockPlaceWithCoords;
      const ratingScore = (extPlace.rating || 0) / 5;
      const reviewCount = extPlace.ratings_total || 0;
      const reviewScore = reviewCount > 0 ? Math.min(Math.log10(reviewCount + 1) / 4, 1) : 0;
      const aiScore = extPlace.ai_score || 0;
      const distanceKm = extPlace.distance_km || 10;
      const proximityScore = Math.max(0, 1 - distanceKm / 10);
      const compositeScore = ratingScore * 0.30 + reviewScore * 0.25 + aiScore * 0.30 + proximityScore * 0.15;
      return { place, compositeScore };
    });

    const topPicks = scoredPlaces.sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 2).map((item) => item.place);
    topPicks.forEach((p) => usedPlaceIds.add(p.id));
    if (topPicks.length > 0) sections.push({ title: "Top Picks for You", places: topPicks, featured: true });

    const remainingPlaces = filteredResults.filter((p) => !usedPlaceIds.has(p.id));
    const categoryGroups: Record<string, MockPlace[]> = {};
    remainingPlaces.forEach((place) => {
      const category = place.ai_category?.toLowerCase() || 'other';
      if (!categoryGroups[category]) categoryGroups[category] = [];
      categoryGroups[category].push(place);
    });

    const categoryLabels: Record<string, string> = {
      restaurant: "Restaurants", bar: "Bars & Nightlife", cafe: "Cafes", rooftop: "Rooftop Spots",
      club: "Clubs & Dancing", landmark: "Landmarks", park: "Parks & Outdoors", bakery: "Bakeries",
      lounge: "Lounges", "street food": "Street Food", warung: "Warungs", food_stall: "Food Stalls",
      fast_food: "Fast Food", market: "Markets"
    };

    const sortedCategories = Object.entries(categoryGroups).filter(([_, places]) => places.length >= 1).sort((a, b) => b[1].length - a[1].length);

    for (let i = 0; i < Math.min(3, sortedCategories.length); i++) {
      const [category, places] = sortedCategories[i];
      const sectionPlaces = places.filter((p) => !usedPlaceIds.has(p.id)).slice(0, 8);
      sectionPlaces.forEach((p) => usedPlaceIds.add(p.id));
      if (sectionPlaces.length > 0) {
        sections.push({
          title: categoryLabels[category] || `${category.charAt(0).toUpperCase() + category.slice(1)}s`,
          places: sectionPlaces, featured: false
        });
      }
    }

    const moreToExplore = filteredResults.filter((p) => !usedPlaceIds.has(p.id));
    if (moreToExplore.length > 0) sections.push({ title: "More to Explore", places: moreToExplore.slice(0, 20), featured: false });
    return sections;
  }, [filteredResults]);

  const mapPlaces: RankedPlace[] = useMemo(() => {
    return filteredResults.filter((p) => { const ext = p as MockPlaceWithCoords; return ext.lat && ext.lng; }).map((p) => {
      const ext = p as MockPlaceWithCoords;
      return {
        place_id: p.id, name: p.name, address: null, lat: ext.lat!, lng: ext.lng!,
        categories: p.categories || null, rating: p.rating || null, ratings_total: ext.ratings_total || null,
        provider: null, eta_seconds: null, distance_meters: p.distance_km ? p.distance_km * 1000 : null,
        score: ext.ai_score || 0, why: p.ai_reason || "",
        photo_name: p.image?.includes('place-photo') ? new URL(p.image).searchParams.get('photo_name') : null,
        photos: [], ai_reason: p.ai_reason, ai_category: p.ai_category,
        filter_tags: ext.filter_tags, price_level: ext.price_level
      } as RankedPlace;
    });
  }, [filteredResults]);

  const getPlaceImage = useCallback((place: RankedPlace) => {
    if (place.photo_name) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      return `${supabaseUrl}/functions/v1/place-photo?photo_name=${encodeURIComponent(place.photo_name)}&maxWidthPx=400`;
    }
    const original = filteredResults.find((p) => p.id === place.place_id);
    if (original?.image && !original.image.includes('unsplash')) return original.image;
    return `https://source.unsplash.com/400x300/?restaurant,cafe&${place.name.slice(0, 3)}`;
  }, [filteredResults]);

  const handleMapPlaceClick = useCallback((place: RankedPlace) => {
    navigate(`/place/${place.place_id}`, { state: { ai_reason: place.ai_reason } });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background max-w-[420px] lg:max-w-7xl mx-auto relative pb-24 lg:pb-8">
      {/* Nav Bar */}
      <div className="sticky top-0 lg:top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 lg:border-b-0">
        <div className="flex items-center justify-between px-4 lg:px-8 py-0">
          <button onClick={() => setIsMenuOpen(true)} className={`relative p-2 -ml-2 transition-colors lg:hidden ${activeFilters.size > 0 ? "text-primary" : "text-foreground hover:text-primary"}`}>
            <SlidersHorizontal className="w-6 h-6" />
            {activeFilters.size > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">{activeFilters.size}</span>}
          </button>
          <div className="flex flex-col items-center lg:hidden">
            <h1 className="text-xl font-bold text-primary tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>Discover</h1>
            <button onClick={() => setIsLocationPickerOpen(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              <MapPin className="w-3 h-3" />
              <span>{onboardingData?.explore_location ? (onboardingData.explore_location === "nearby" ? "Nearby" : onboardingData.explore_location) : "Set location"}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          <div className="hidden lg:block flex-1" />
          <button onClick={() => setIsProfileMenuOpen(true)} className="p-2 -mr-2 text-foreground hover:text-primary transition-colors lg:hidden">
            <Settings className="w-6 h-6" />
          </button>
          <div className="hidden lg:block w-10" />
        </div>
      </div>

      {/* Search Bar — mobile */}
      <div className="px-4 py-4 lg:hidden">
        <div className="flex items-center gap-3 max-w-2xl">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <div className={`relative flex items-center transition-all duration-200 ${isSearchFocused ? "ring-2 ring-primary/50 rounded-2xl" : ""}`}>
              {isSearching ? <Loader2 className="absolute left-4 w-5 h-5 text-primary animate-spin pointer-events-none" /> : <Sparkles className="absolute left-4 w-5 h-5 text-primary pointer-events-none" />}
              <Input type="text" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setIsSearchFocused(false)} placeholder={searchHints[hintIndex]} className="pl-11 pr-12 h-14 rounded-2xl bg-muted/50 border-border/50 text-base placeholder:text-muted-foreground/70 shadow-sm" disabled={isSearching} />
              <button type="submit" disabled={isSearching || !searchValue.trim()} className={`absolute right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${searchValue.trim() ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground/50'}`}>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
        {user && searchesLeft <= 3 && (
          <p className="text-xs text-muted-foreground mt-1.5 px-1">
            {hasReachedLimit ? "Daily limit reached — upgrade for unlimited searches ✨" : `${searchesLeft} search${searchesLeft === 1 ? "" : "es"} left today`}
          </p>
        )}
      </div>

      {/* Recent searches */}
      {recentSearches.length > 0 && searchResults.length === 0 && !isSearching && (
        <div className="px-4 pb-2 lg:hidden">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {recentSearches.map((query) => (
              <button key={query} onClick={() => triggerSearch(query)} className="shrink-0 px-3 py-1.5 rounded-full bg-muted/70 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors border border-border/50">{query}</button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile slide-out filter */}
      <div className="lg:hidden">
        <SlideOutMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} activeFilters={activeFilters} onFiltersChange={setActiveFilters} maxDistance={maxDistance} onDistanceChange={setMaxDistance} totalPlaces={searchResults.length} filteredCount={filteredResults.length} isNearbyMode={onboardingData?.explore_location === "nearby"} />
      </div>

      {/* Desktop two-column */}
      <div className="lg:flex lg:gap-0">
        <div className="hidden lg:block">
          <SlideOutMenu isOpen={true} onClose={() => {}} activeFilters={activeFilters} onFiltersChange={setActiveFilters} maxDistance={maxDistance} onDistanceChange={setMaxDistance} totalPlaces={searchResults.length} filteredCount={filteredResults.length} isNearbyMode={onboardingData?.explore_location === "nearby"} alwaysOpen={true} />
        </div>

        <main className="flex-1 min-w-0">
          {/* Desktop Search Bar */}
          <div className="hidden lg:block px-8 py-4">
            <div className="flex items-center gap-3 max-w-2xl mx-auto">
              <button onClick={() => setIsLocationPickerOpen(true)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors border border-border rounded-full px-4 py-3 whitespace-nowrap shrink-0">
                <MapPin className="w-3.5 h-3.5" />
                <span>{onboardingData?.explore_location ? (onboardingData.explore_location === "nearby" ? "Nearby" : onboardingData.explore_location) : "Set location"}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <div className={`relative flex items-center transition-all duration-200 ${isSearchFocused ? "ring-2 ring-primary/50 rounded-2xl" : ""}`}>
                  {isSearching ? <Loader2 className="absolute left-4 w-5 h-5 text-primary animate-spin pointer-events-none" /> : <Sparkles className="absolute left-4 w-5 h-5 text-primary pointer-events-none" />}
                  <Input type="text" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setIsSearchFocused(false)} placeholder={searchHints[hintIndex]} className="pl-11 pr-11 h-16 rounded-2xl bg-muted/50 border-border/50 text-base placeholder:text-muted-foreground/70 shadow-sm" disabled={isSearching} />
                  {searchValue && !isSearching && <button type="button" onClick={handleClearSearch} className="absolute right-4 p-1 text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>}
                </div>
              </form>
            </div>
          </div>

          <LoginReminderBanner />

          {/* Active Filter Chips */}
          {activeFilters.size > 0 && (
            <div className="px-4 lg:px-8 pt-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
              {Array.from(activeFilters).map((filterId) => (
                <button key={filterId} onClick={() => removeFilter(filterId)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium whitespace-nowrap hover:bg-primary/20 transition-colors">
                  {FILTER_LABELS[filterId] || filterId} <X className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}

          {isSearching || isInitialLoading ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="relative">
                <div className="animate-[bounce_1.5s_ease-in-out_infinite]"><IceCreamCone className="w-10 h-10 text-primary drop-shadow-md" strokeWidth={1.5} /></div>
                <div className="absolute inset-0 w-10 h-10 border-2 border-primary/20 rounded-full animate-ping" />
                <Sparkles className="absolute -top-1 -right-2 w-4 h-4 text-amber-400 animate-pulse" />
                <Sparkles className="absolute -bottom-1 -left-2 w-3 h-3 text-pink-400 animate-pulse delay-200" />
              </div>
              <p className="text-foreground font-medium mt-4">Finding your SweetSpots...</p>
              <p className="text-muted-foreground text-sm mt-1">Scooping up the best places</p>
            </div>
          ) : needsLocationPermission ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Enable Location Access</h3>
              <p className="text-muted-foreground text-sm mb-4">We need your location to find great spots nearby.</p>
              <Button onClick={handleRetryWithLocation} className="rounded-full"><MapPin className="w-4 h-4 mr-2" />Enable Location</Button>
            </div>
          ) : displaySections.length === 0 && searchResults.length > 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <SlidersHorizontal className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-foreground font-medium mb-2">No places match your filters</p>
              <p className="text-muted-foreground text-sm mb-4">Try removing some filters or adjusting the distance</p>
              <Button variant="outline" onClick={() => { setActiveFilters(new Set()); setMaxDistance(25); }} className="rounded-full">Clear all filters</Button>
            </div>
          ) : displaySections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Ask me anything to discover amazing places!</p>
            </div>
          ) : (
            <>
              {aiSummary && <AISummaryCard summary={aiSummary} searchQuery={userMood || searchValue} location={onboardingData?.explore_location} />}
              {isMapView && mapPlaces.length > 0 ? (
                <div className="lg:flex lg:flex-col lg:gap-6 lg:px-8">
                  <div className="h-[calc(100vh-280px)] lg:h-[400px] mx-4 lg:mx-0 rounded-xl overflow-hidden border border-border">
                    <BoardMapView places={mapPlaces} userLocation={userLocation} onPlaceClick={handleMapPlaceClick} getPlaceImage={getPlaceImage} />
                  </div>
                  <div className="hidden lg:grid lg:grid-cols-3 lg:gap-4 overflow-y-auto">
                    {filteredResults.slice(0, 30).map((place) => (
                      <PlaceCardCompact key={place.id} place={place} onSave={handleSaveClick} isSaved={isSaved(place.id)} onClick={() => handlePlaceClick(place)} showDistance={true} saveCount={saveCounts[place.id] || 0} isGridItem />
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {displaySections.find((s) => s.featured) && (
                    <TopPicksSection places={displaySections.find((s) => s.featured)!.places} onPlaceClick={handlePlaceClick} toggleSave={handleSaveClick} isSaved={isSaved} showDistance={true} />
                  )}
                  {displaySections.filter((section) => !section.featured).map((section, index) => (
                    <SectionRow key={index} title={section.title} places={section.places} allPlaces={searchResults} onPlaceClick={handlePlaceClick} toggleSave={handleSaveClick} isSaved={isSaved} featured={false} userLocation={userLocation} onSeeAll={handleSeeAll} showDistance={true} saveCounts={saveCounts} />
                  ))}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* Floating Map/List Toggle */}
      {filteredResults.length > 0 && !isSearching && !isInitialLoading && (
        <button onClick={() => setIsMapView(!isMapView)} className="fixed bottom-28 lg:bottom-8 left-1/2 -translate-x-1/2 z-20 inline-flex items-center justify-center w-12 h-12 bg-foreground text-background rounded-full shadow-xl hover:bg-foreground/90 transition-all active:scale-95">
          {isMapView ? <List className="w-5 h-5" /> : <Map className="w-5 h-5" />}
        </button>
      )}

      {saveToBoardPlace && <SaveToBoardDialog placeId={saveToBoardPlace.id} placeName={saveToBoardPlace.name} onClose={() => setSaveToBoardPlace(null)} onSaved={handleBoardSaveConfirmed} />}
      <TravelPersonalityFilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} onConfirm={handleFilterConfirm} initialFilters={appliedFilters} />
      <ProfileSlideMenu isOpen={isProfileMenuOpen} onClose={() => setIsProfileMenuOpen(false)} onNavigateToProfile={onNavigateToProfile} />
      <LocationPickerModal isOpen={isLocationPickerOpen} onClose={() => setIsLocationPickerOpen(false)} onSelectLocation={handleLocationChange} currentLocation={onboardingData?.explore_location} />
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
};

export default DiscoverPage;
