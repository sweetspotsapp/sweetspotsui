import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, ChevronRight, ChevronLeft, ChevronDown, X, Settings, Loader2, MapPin, Sparkles, SlidersHorizontal, IceCreamCone, Lock } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import AuthDialog from "./AuthDialog";
import LocationPickerModal from "./LocationPickerModal";
// Extended MockPlace with lat/lng for map view
interface MockPlaceWithCoords extends MockPlace {
  lat?: number;
  lng?: number;
  filter_tags?: string[];
  price_level?: number;
  is_open_now?: boolean | null;
  ai_score?: number; // AI relevance score from search
  ratings_total?: number; // Total number of reviews
}

// Helper to convert RankedPlace to MockPlace format with coords
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
  ai_score: place.score, // AI relevance score
  ratings_total: place.ratings_total || 0, // Number of reviews
});

// Filter label mapping
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
  outdoor: "Outdoor Seating",
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
}

const SectionRow: React.FC<SectionRowProps> = ({
  title,
  places,
  allPlaces,
  onPlaceClick,
  toggleSave,
  isSaved,
  featured = false,
  userLocation,
  onSeeAll,
  showDistance = true,
}) => {
  const handleSeeAll = () => {
    if (onSeeAll) {
      onSeeAll(allPlaces);
    }
  };

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
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <button 
          onClick={handleSeeAll}
          className="flex items-center gap-1 text-sm text-primary font-medium hover:underline cursor-pointer"
        >
          See all
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="relative">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scrollBy('left')}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-8 h-8 bg-card/95 backdrop-blur-sm rounded-full shadow-lg border border-border opacity-0 group-hover/section:opacity-100 transition-opacity duration-200 hover:bg-card"
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
        )}

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scrollBy('right')}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-8 h-8 bg-card/95 backdrop-blur-sm rounded-full shadow-lg border border-border opacity-0 group-hover/section:opacity-100 transition-opacity duration-200 hover:bg-card"
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        )}

        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {places.map((place) => (
            <PlaceCardCompact
              key={place.id}
              place={place}
              onSave={toggleSave}
              isSaved={isSaved(place.id)}
              onClick={() => onPlaceClick(place)}
              featured={featured}
              showDistance={showDistance}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Session storage key for caching results
const CACHE_KEY = 'sweetspots_search_cache';
const SUMMARY_CACHE_KEY = 'sweetspots_summary_cache';
const CACHE_VERSION_KEY = 'sweetspots_cache_version';
const CACHED_MOOD_KEY = 'sweetspots_cached_mood';
const CACHED_LOCATION_KEY = 'sweetspots_cached_location';
const SKIP_MODE_KEY = 'sweetspots_skip_mode';
const CURRENT_CACHE_VERSION = '2'; // Increment to bust cache

// Get time-based search prompt for "Skip to Home" mode
const getTimeBasedPrompt = (): string => {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 11) {
    return "trending breakfast spots and coffee shops open now";
  } else if (hour >= 11 && hour < 14) {
    return "popular lunch spots and quick eats nearby";
  } else if (hour >= 14 && hour < 17) {
    return "cozy cafes and afternoon hangouts";
  } else if (hour >= 17 && hour < 21) {
    return "best dinner spots and evening restaurants";
  } else {
    return "late night eats, bars, and dessert spots open now";
  }
};

interface HomePageProps {
  onNavigateToProfile?: () => void;
}

const HomePage = ({ onNavigateToProfile }: HomePageProps) => {
  const navigate = useNavigate();
  const { userMood, setUserMood, isSaved: isPlaceSaved, toggleSave: togglePlaceSave, freeActionsUsed, incrementFreeActions, setShowAuthDialog, onboardingData, setOnboardingData } = useApp();
  const { user } = useAuth();
  const { search, isSearching, error: searchError, clearError, summary: searchSummary } = useUnifiedSearch();
  const { location: userLocation, setManualLocation } = useLocation();
  const hasLoadedInitial = useRef(false);

  // Check cache version and clear if outdated
  const getCachedResults = (): MockPlace[] => {
    try {
      const version = sessionStorage.getItem(CACHE_VERSION_KEY);
      if (version !== CURRENT_CACHE_VERSION) {
        // Cache is outdated, clear it
        sessionStorage.removeItem(CACHE_KEY);
        sessionStorage.removeItem(SUMMARY_CACHE_KEY);
        sessionStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
        return [];
      }
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('Failed to restore cache:', e);
    }
    return [];
  };

  // Check if this is skip mode BEFORE initializing state
  const isSkipModeOnMount = useRef(() => {
    const skipMode = sessionStorage.getItem(SKIP_MODE_KEY) === 'true';
    if (skipMode) {
      // Clear all cached data immediately
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
  const [searchValue, setSearchValue] = useState(wasSkipMode.current ? "" : (userMood || ""));
  
  // Sync searchValue when userMood changes (from EntryScreen)
  useEffect(() => {
    if (userMood && !searchValue && !wasSkipMode.current) {
      setSearchValue(userMood);
    }
  }, [userMood]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(() => {
    if (wasSkipMode.current) return null;
    try {
      const version = sessionStorage.getItem(CACHE_VERSION_KEY);
      if (version !== CURRENT_CACHE_VERSION) return null;
      return sessionStorage.getItem(SUMMARY_CACHE_KEY);
    } catch {
      return null;
    }
  });
  const [searchResults, setSearchResults] = useState<MockPlace[]>(() => {
    if (wasSkipMode.current) return [];
    return getCachedResults();
  });
  const [isInitialLoading, setIsInitialLoading] = useState(() => {
    if (wasSkipMode.current) return true;
    return getCachedResults().length === 0;
  });
  const [needsLocationPermission, setNeedsLocationPermission] = useState(false);
  const [maxDistance, setMaxDistance] = useState(25); // Default to max (no filter)
  
  // Save to board dialog state
  const [saveToBoardPlace, setSaveToBoardPlace] = useState<MockPlace | null>(null);
  
  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({ budget: null, vibes: [], placeTypes: [] });
  
  // Auth dialog state for soft wall
  const [showLocalAuthDialog, setShowLocalAuthDialog] = useState(false);
  
  // Location picker modal state
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);

  // Client-side filtering - instant results
  const filteredResults = useClientFilters(
    searchResults as ExtendedMockPlace[],
    { activeFilters, maxDistance }
  );

  // Cache results to session storage
  useEffect(() => {
    if (searchResults.length > 0) {
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(searchResults));
      } catch (e) {
        console.error('Failed to cache results:', e);
      }
    }
  }, [searchResults]);

  // Cache AI summary
  useEffect(() => {
    if (aiSummary) {
      try {
        sessionStorage.setItem(SUMMARY_CACHE_KEY, aiSummary);
      } catch (e) {
        console.error('Failed to cache summary:', e);
      }
    }
  }, [aiSummary]);

  // Load initial places on mount - use userMood from EntryScreen if available
  useEffect(() => {
    // Check if the mood or location has changed since last cache
    const cachedMood = sessionStorage.getItem(CACHED_MOOD_KEY) || "";
    const cachedLocation = sessionStorage.getItem(CACHED_LOCATION_KEY) || "";
    const currentMood = userMood?.trim() || "";
    const currentLocation = onboardingData?.explore_location || "";
    const moodChanged = currentMood && currentMood !== cachedMood;
    const locationChanged = currentLocation && currentLocation !== cachedLocation;
    
    // Skip if already loaded and nothing has changed (but not if we're in skip mode)
    if (hasLoadedInitial.current && !moodChanged && !locationChanged && !wasSkipMode.current) return;
    if (searchResults.length > 0 && !moodChanged && !locationChanged && !wasSkipMode.current) {
      hasLoadedInitial.current = true;
      return;
    }
    hasLoadedInitial.current = true;

    const loadInitialPlaces = async () => {
      setIsInitialLoading(true);
      
      // Clear cache if location or mood changed
      if (locationChanged || moodChanged) {
        console.log("Location or mood changed - clearing cache");
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
          // Use time-based prompt for skip mode
          searchPrompt = getTimeBasedPrompt();
          console.log("Skip mode - using time-based prompt:", searchPrompt);
          // Reset the ref so future navigations don't trigger skip mode
          wasSkipMode.current = false;
        } else {
          // Use the mood from onboarding/context if available, otherwise use default
          searchPrompt = currentMood || "popular restaurants and cafes nearby";
          console.log("Initial search with prompt:", searchPrompt, "location:", currentLocation);
        }
        
        // Store the current mood and location in cache after search starts
        if (currentMood) {
          sessionStorage.setItem(CACHED_MOOD_KEY, currentMood);
        }
        if (currentLocation) {
          sessionStorage.setItem(CACHED_LOCATION_KEY, currentLocation);
        }
        
        // Build search options based on onboarding location
        const searchOptions: { locationName?: string; skipCache?: boolean } = {
          skipCache: moodChanged || locationChanged, // Skip cache if anything changed
        };
        if (currentLocation && currentLocation !== "nearby") {
          searchOptions.locationName = currentLocation;
        }
        
        const result = await search(searchPrompt, searchOptions);
        if (result && result.places.length > 0) {
          setSearchResults(result.places.map(unifiedToMockPlace));
          setAiSummary(result.summary || null);
        }
      } catch (err) {
        console.error("Failed to load initial places:", err);
        if (err instanceof Error && err.message.includes("location")) {
          setNeedsLocationPermission(true);
        }
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadInitialPlaces();
  }, [search, searchResults.length, userMood, onboardingData?.explore_location]);

  // Show search errors as toast
  useEffect(() => {
    if (searchError) {
      if (searchError.includes("location")) {
        setNeedsLocationPermission(true);
      }
      toast.error(searchError);
      clearError();
    }
  }, [searchError, clearError]);

  const getPlaceById = useCallback((placeId: string) => {
    return searchResults.find(p => p.id === placeId);
  }, [searchResults]);

  // Handle save
  const handleSaveClick = useCallback((placeId: string) => {
    if (isPlaceSaved(placeId)) {
      // Unsave directly
      void togglePlaceSave(placeId);
      return;
    }

    const place = getPlaceById(placeId);
    if (place) {
      setSaveToBoardPlace(place);
    }
  }, [isPlaceSaved, togglePlaceSave, getPlaceById]);

  const handleBoardSaveConfirmed = useCallback(() => {
    // Saved state comes from AppContext; just close the dialog.
    setSaveToBoardPlace(null);
  }, []);

  const isSaved = useCallback(
    (placeId: string) => isPlaceSaved(placeId),
    [isPlaceSaved]
  );

  const handlePlaceClick = (place: MockPlace) => {
    // Clicking a place always requires auth if not logged in (after first search)
    if (!user) {
      setShowLocalAuthDialog(true);
      return;
    }
    navigate(`/place/${place.id}`, { state: { ai_reason: place.ai_reason } });
  };

  const handleSeeAll = (allPlaces: MockPlaceWithCoords[]) => {
    // See all requires auth if not logged in
    if (!user) {
      setShowLocalAuthDialog(true);
      return;
    }
    navigate(`/see-all`, {
      state: { places: allPlaces, userLocation, searchQuery: searchValue || userMood },
    });
  };

  // Build search prompt with filters
  const buildSearchPrompt = (basePrompt: string, filters: FilterState): string => {
    let prompt = basePrompt;
    
    // Add place types to prompt
    if (filters.placeTypes.length > 0) {
      prompt += `, ${filters.placeTypes.join(", ")}`;
    }
    
    if (filters.budget) {
      const budgetLabels: Record<string, string> = {
        under_50: "budget-friendly under $50",
        "50_100": "mid-range $50-$100",
        "100_plus": "upscale $100+"
      };
      prompt += `, ${budgetLabels[filters.budget]}`;
    }
    
    if (filters.vibes.length > 0) {
      prompt += `, ${filters.vibes.join(", ")}`;
    }
    
    return prompt;
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    
    // If not logged in and already used free search, show auth
    if (!user && freeActionsUsed >= 1) {
      setShowLocalAuthDialog(true);
      return;
    }
    
    // Increment free actions counter on first search (if not logged in)
    if (!user) {
      incrementFreeActions();
    }
    
    setUserMood(searchValue.trim());
    setNeedsLocationPermission(false);
    
    // Clear old cache and results before new search to prevent stale data
    setAiSummary(null);
    setSearchResults([]); // Clear old results immediately so stale data isn't shown
    try {
      sessionStorage.removeItem(CACHE_KEY);
      sessionStorage.removeItem(SUMMARY_CACHE_KEY);
      sessionStorage.removeItem(CACHED_MOOD_KEY); // Clear cached mood so new search takes effect
    } catch (e) {
      console.error('Failed to clear cache:', e);
    }
    
    // Build prompt with filters
    const searchPrompt = buildSearchPrompt(searchValue.trim(), appliedFilters);
    console.log("Search with filters:", searchPrompt);
    
    // Build search options based on onboarding location
    const searchOptions: { locationName?: string; skipCache?: boolean } = {
      skipCache: true, // Always skip cache on new search to get fresh results
    };
    const exploreLocation = onboardingData?.explore_location;
    if (exploreLocation && exploreLocation !== "nearby") {
      searchOptions.locationName = exploreLocation;
    }
    
    const result = await search(searchPrompt, searchOptions);
    if (result && result.places.length > 0) {
      setSearchResults(result.places.map(unifiedToMockPlace));
      setAiSummary(result.summary || null);
      toast.success(`Found ${result.places.length} spots for you!`);
    } else if (result && result.places.length === 0) {
      toast.info("No places found. Try a different search.");
      setSearchResults([]);
      setAiSummary(result.summary || null);
    }
  };

  const handleFilterConfirm = async (filters: FilterState) => {
    setAppliedFilters(filters);
    
    // Update active filters display
    const newActiveFilters = new Set<string>();
    if (filters.budget) newActiveFilters.add(filters.budget);
    filters.vibes.forEach(v => {
      // Map vibes to filter IDs
      const vibeMap: Record<string, string> = {
        "Chill & relaxation": "chill",
        "Fun With Friends": "friends",
        "Family Time": "family",
        "Hidden gems": "hidden",
        "Nights Life": "late_night",
        "Adventure & outdoors": "outdoor",
      };
      const filterId = vibeMap[v] || v.toLowerCase().replace(/\s+/g, '_');
      newActiveFilters.add(filterId);
    });
    setActiveFilters(newActiveFilters);
    
    // Re-run search with new filters if we have a search term
    if (searchValue.trim() || userMood) {
      const basePrompt = searchValue.trim() || userMood || "popular restaurants and cafes nearby";
      const searchPrompt = buildSearchPrompt(basePrompt, filters);
      
      setAiSummary(null);
      setSearchResults([]); // Clear old results immediately
      try {
        sessionStorage.removeItem(CACHE_KEY);
        sessionStorage.removeItem(SUMMARY_CACHE_KEY);
      } catch (e) {
        console.error('Failed to clear cache:', e);
      }
      
      // Build search options based on onboarding location
      const searchOptions: { locationName?: string; skipCache?: boolean } = {
        skipCache: true, // Always skip cache on filter change
      };
      const exploreLocation = onboardingData?.explore_location;
      if (exploreLocation && exploreLocation !== "nearby") {
        searchOptions.locationName = exploreLocation;
      }
      
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
      // Build search options based on onboarding location
      const searchOptions: { locationName?: string } = {};
      const exploreLocation = onboardingData?.explore_location;
      if (exploreLocation && exploreLocation !== "nearby") {
        searchOptions.locationName = exploreLocation;
      }
      
      const result = await search("popular restaurants and cafes nearby", searchOptions);
      if (result && result.places.length > 0) {
        setSearchResults(result.places.map(unifiedToMockPlace));
        setAiSummary(result.summary || null);
      }
    } catch (err) {
      console.error("Retry failed:", err);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchValue("");
    setUserMood("");
  };

  const removeFilter = (filterId: string) => {
    const newFilters = new Set(activeFilters);
    newFilters.delete(filterId);
    setActiveFilters(newFilters);
  };

  // Handle location change from modal
  const handleLocationChange = (newLocation: string) => {
    // Update onboarding data with new location
    setOnboardingData({
      ...(onboardingData || { trip_intention: null, budget: null, travel_personality: [] }),
      explore_location: newLocation,
    });
    setIsLocationPickerOpen(false);
  };

  // Group places by AI category for display - ensuring NO duplicates across sections
  // Now uses filteredResults for instant client-side filtering
  const displaySections = useMemo(() => {
    if (filteredResults.length === 0) return [];
    
    const usedPlaceIds = new Set<string>();
    const sections: { title: string; places: MockPlace[]; featured: boolean }[] = [];
    
    // Section 1: Top Picks - Smart scoring based on rating, review count, and AI relevance
    // Calculate a composite score for each place
    const scoredPlaces = filteredResults.map(place => {
      const extPlace = place as MockPlaceWithCoords;
      
      // Normalize rating (0-5 scale → 0-1)
      const ratingScore = (extPlace.rating || 0) / 5;
      
      // Normalize review count using log scale (more reviews = higher trust, but diminishing returns)
      // log10(100) ≈ 2, log10(1000) ≈ 3, so we cap at ~4 for very popular places
      const reviewCount = extPlace.ratings_total || 0;
      const reviewScore = reviewCount > 0 ? Math.min(Math.log10(reviewCount + 1) / 4, 1) : 0;
      
      // AI relevance score (already 0-1 from search)
      const aiScore = extPlace.ai_score || 0;
      
      // Distance penalty (closer is better, max 10km considered)
      const distanceKm = extPlace.distance_km || 10;
      const proximityScore = Math.max(0, 1 - (distanceKm / 10));
      
      // Combined score with weights:
      // - Rating: 30% (quality matters)
      // - Review count: 25% (social proof/trust)
      // - AI relevance: 30% (matches search intent)
      // - Proximity: 15% (convenience bonus)
      const compositeScore = 
        (ratingScore * 0.30) + 
        (reviewScore * 0.25) + 
        (aiScore * 0.30) + 
        (proximityScore * 0.15);
      
      return { place, compositeScore, ratingScore, reviewScore, aiScore };
    });
    
    // Sort by composite score (highest first) and take top 2
    const topPicks = scoredPlaces
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, 2)
      .map(item => item.place);
    
    topPicks.forEach(p => usedPlaceIds.add(p.id));
    
    if (topPicks.length > 0) {
      sections.push({
        title: "Top Picks for You",
        places: topPicks,
        featured: true,
      });
    }

    // Group remaining places by category (excluding already used)
    const remainingPlaces = filteredResults.filter(p => !usedPlaceIds.has(p.id));
    const categoryGroups: Record<string, MockPlace[]> = {};
    
    remainingPlaces.forEach(place => {
      const category = place.ai_category?.toLowerCase() || 'other';
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(place);
    });

    // Category labels mapping (no emojis)
    const categoryLabels: Record<string, string> = {
      restaurant: "Restaurants",
      bar: "Bars & Nightlife",
      cafe: "Cafes",
      rooftop: "Rooftop Spots",
      club: "Clubs & Dancing",
      landmark: "Landmarks",
      park: "Parks & Outdoors",
      bakery: "Bakeries",
      lounge: "Lounges",
      "street food": "Street Food",
      warung: "Warungs",
      food_stall: "Food Stalls",
      fast_food: "Fast Food",
      market: "Markets",
    };

    // Sort categories by number of places (most populated first)
    const sortedCategories = Object.entries(categoryGroups)
      .filter(([_, places]) => places.length >= 1)
      .sort((a, b) => b[1].length - a[1].length);

    // Section 2: Primary category (5 places max)
    if (sortedCategories.length > 0) {
      const [category, places] = sortedCategories[0];
      const sectionPlaces = places.slice(0, 5);
      sectionPlaces.forEach(p => usedPlaceIds.add(p.id));
      
      sections.push({
        title: categoryLabels[category] || `${category.charAt(0).toUpperCase() + category.slice(1)}s`,
        places: sectionPlaces,
        featured: false,
      });
    }

    // Section 3: Secondary category (5 places max)
    if (sortedCategories.length > 1) {
      const [category, places] = sortedCategories[1];
      const sectionPlaces = places.filter(p => !usedPlaceIds.has(p.id)).slice(0, 5);
      sectionPlaces.forEach(p => usedPlaceIds.add(p.id));
      
      if (sectionPlaces.length > 0) {
        sections.push({
          title: categoryLabels[category] || `${category.charAt(0).toUpperCase() + category.slice(1)}s`,
          places: sectionPlaces,
          featured: false,
        });
      }
    }

    // Section 4: Third category (5 places max)
    if (sortedCategories.length > 2) {
      const [category, places] = sortedCategories[2];
      const sectionPlaces = places.filter(p => !usedPlaceIds.has(p.id)).slice(0, 5);
      sectionPlaces.forEach(p => usedPlaceIds.add(p.id));
      
      if (sectionPlaces.length > 0) {
        sections.push({
          title: categoryLabels[category] || `${category.charAt(0).toUpperCase() + category.slice(1)}s`,
          places: sectionPlaces,
          featured: false,
        });
      }
    }

    // Section 5: "More to Explore" - remaining unused places
    const moreToExplore = filteredResults.filter(p => !usedPlaceIds.has(p.id));
    if (moreToExplore.length > 0) {
      sections.push({
        title: "More to Explore",
        places: moreToExplore.slice(0, 10),
        featured: false,
      });
    }

    return sections;
  }, [filteredResults]);

  return (
    <div className="min-h-screen bg-background max-w-[420px] mx-auto relative pb-24">
      {/* Nav Bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Filter Button - Top Left */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className={`relative p-2 -ml-2 transition-colors ${
              activeFilters.size > 0 
                ? "text-primary" 
                : "text-foreground hover:text-primary"
            }`}
          >
            <SlidersHorizontal className="w-6 h-6" />
            {activeFilters.size > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                {activeFilters.size}
              </span>
            )}
          </button>

          <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              SweetSpots
            </h1>
            <button
              onClick={() => setIsLocationPickerOpen(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <MapPin className="w-3 h-3" />
              <span>{onboardingData?.explore_location 
                ? (onboardingData.explore_location === "nearby" ? "Nearby" : onboardingData.explore_location)
                : "Set location"
              }</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={() => setIsProfileMenuOpen(true)}
            className="p-2 -mr-2 text-foreground hover:text-primary transition-colors"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div
              className={`relative flex items-center transition-all duration-200 ${
                isSearchFocused ? "ring-2 ring-primary/50 rounded-full" : ""
              }`}
            >
              {isSearching ? (
                <Loader2 className="absolute left-3 w-4 h-4 text-primary animate-spin pointer-events-none" />
              ) : (
                <Sparkles className="absolute left-3 w-4 h-4 text-primary pointer-events-none" />
              )}
              <Input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Ask anything: rooftop bars, date spots..."
                className="pl-9 pr-9 h-10 rounded-full bg-muted/50 border-border/50 text-sm placeholder:text-muted-foreground/70"
                disabled={isSearching}
              />
              {searchValue && !isSearching && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Active Filter Chips */}
        {activeFilters.size > 0 && (
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {Array.from(activeFilters).map((filterId) => (
              <button
                key={filterId}
                onClick={() => removeFilter(filterId)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium whitespace-nowrap hover:bg-primary/20 transition-colors"
              >
                {FILTER_LABELS[filterId] || filterId}
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Slide-out Menu */}
      <SlideOutMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeFilters={activeFilters}
        onFiltersChange={setActiveFilters}
        maxDistance={maxDistance}
        onDistanceChange={setMaxDistance}
        totalPlaces={searchResults.length}
        filteredCount={filteredResults.length}
        isNearbyMode={onboardingData?.explore_location === "nearby"}
      />

      {/* Main Content */}
      <main className="pt-4">
        {isSearching || isInitialLoading ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="relative">
              {/* Ice cream cone with bounce animation */}
              <div className="animate-[bounce_1.5s_ease-in-out_infinite]">
                <IceCreamCone className="w-10 h-10 text-primary drop-shadow-md" strokeWidth={1.5} />
              </div>
              <div className="absolute inset-0 w-10 h-10 border-2 border-primary/20 rounded-full animate-ping" />
              {/* Sprinkle sparkles */}
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
            <p className="text-muted-foreground text-sm mb-4">
              We need your location to find great spots nearby.
            </p>
            <Button onClick={handleRetryWithLocation} className="rounded-full">
              <MapPin className="w-4 h-4 mr-2" />
              Enable Location
            </Button>
          </div>
        ) : displaySections.length === 0 && searchResults.length > 0 ? (
          // Filters resulted in no matches
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <SlidersHorizontal className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-foreground font-medium mb-2">No places match your filters</p>
            <p className="text-muted-foreground text-sm mb-4">
              Try removing some filters or adjusting the distance
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setActiveFilters(new Set());
                setMaxDistance(25);
              }}
              className="rounded-full"
            >
              Clear all filters
            </Button>
          </div>
        ) : displaySections.length === 0 ? (
          // Show auth prompt with blur if user has exceeded free actions
          !user && freeActionsUsed >= 1 ? (
            <div className="relative">
              {/* Blurred placeholder content */}
              <div className="filter blur-md pointer-events-none opacity-60 px-4">
                <div className="space-y-4">
                  <div className="h-48 bg-muted rounded-2xl" />
                  <div className="h-6 bg-muted rounded-lg w-2/3" />
                  <div className="flex gap-3">
                    <div className="h-32 w-40 bg-muted rounded-xl flex-shrink-0" />
                    <div className="h-32 w-40 bg-muted rounded-xl flex-shrink-0" />
                    <div className="h-32 w-40 bg-muted rounded-xl flex-shrink-0" />
                  </div>
                </div>
              </div>
              
              {/* Auth overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                <div className="text-center p-6 max-w-sm">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 text-lg">Sign in to continue exploring</h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    Create a free account to unlock unlimited searches and save your favorite spots
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button 
                      onClick={() => setShowLocalAuthDialog(true)}
                      className="rounded-full w-full"
                    >
                      Sign in or Sign up
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Ask me anything to discover amazing places!</p>
            </div>
          )
        ) : (
          <>
            {/* AI Summary Card */}
            {aiSummary && (
              <AISummaryCard 
                summary={aiSummary} 
                searchQuery={userMood || searchValue}
                location={onboardingData?.explore_location}
              />
            )}

            {/* Top Picks Section - Large vertical cards */}
            {displaySections.find(s => s.featured) && (
              <TopPicksSection
                places={displaySections.find(s => s.featured)!.places}
                onPlaceClick={handlePlaceClick}
                toggleSave={handleSaveClick}
                isSaved={isSaved}
                showDistance={onboardingData?.explore_location === "nearby"}
              />
            )}

            {/* Other Sections - Horizontal scroll rows */}
            {displaySections
              .filter(section => !section.featured)
              .map((section, index) => (
                <SectionRow
                  key={index}
                  title={section.title}
                  places={section.places}
                  allPlaces={searchResults}
                  onPlaceClick={handlePlaceClick}
                  toggleSave={handleSaveClick}
                  isSaved={isSaved}
                  featured={false}
                  userLocation={userLocation}
                  onSeeAll={handleSeeAll}
                  showDistance={onboardingData?.explore_location === "nearby"}
                />
              ))}
          </>
        )}
      </main>

      {/* Save to Board Dialog */}
      {saveToBoardPlace && (
        <SaveToBoardDialog
          placeId={saveToBoardPlace.id}
          placeName={saveToBoardPlace.name}
          onClose={() => setSaveToBoardPlace(null)}
          onSaved={handleBoardSaveConfirmed}
        />
      )}
      
      {/* Filter Modal */}
      <TravelPersonalityFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onConfirm={handleFilterConfirm}
        initialFilters={appliedFilters}
      />

      {/* Profile Slide Menu */}
      <ProfileSlideMenu 
        isOpen={isProfileMenuOpen} 
        onClose={() => setIsProfileMenuOpen(false)}
        onNavigateToProfile={onNavigateToProfile}
      />
      
      {/* Auth Dialog for soft wall */}
      <AuthDialog 
        open={showLocalAuthDialog}
        onOpenChange={setShowLocalAuthDialog}
        onSuccess={() => {
          setShowLocalAuthDialog(false);
          // Clear the free actions counter on successful auth
          try {
            sessionStorage.removeItem('sweetspots_free_actions');
          } catch {}
        }}
      />

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        onSelectLocation={handleLocationChange}
        currentLocation={onboardingData?.explore_location}
      />
    </div>
  );
};

export default HomePage;
