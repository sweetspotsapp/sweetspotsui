import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, ChevronRight, X, User, Loader2, MapPin, Sparkles, SlidersHorizontal, IceCreamCone } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Input } from "./ui/input";
import SlideOutMenu from "./SlideOutMenu";
import PlaceCardCompact, { MockPlace } from "./PlaceCardCompact";
import SaveToBoardDialog from "./saved/SaveToBoardDialog";
import TravelPersonalityFilterModal, { FilterState } from "./TravelPersonalityFilterModal";
import AISummaryCard from "./AISummaryCard";
import { useSearch, RankedPlace } from "@/hooks/useSearch";
import { useLocation } from "@/hooks/useLocation";
import { toast } from "sonner";
import { Button } from "./ui/button";

// Extended MockPlace with lat/lng for map view
interface MockPlaceWithCoords extends MockPlace {
  lat?: number;
  lng?: number;
}

// Helper to convert RankedPlace to MockPlace format with coords
const rankedToMockPlace = (place: RankedPlace): MockPlaceWithCoords => ({
  id: place.place_id,
  name: place.name,
  image: place.photo_name 
    ? `https://bqjuoxckvrkykfqpbkpv.supabase.co/functions/v1/place-photo?photo_name=${encodeURIComponent(place.photo_name)}`
    : `https://source.unsplash.com/400x300/?restaurant,cafe&${place.name.slice(0, 3)}`,
  rating: place.rating || 4.0,
  distance_km: place.distance_meters ? Math.round(place.distance_meters / 100) / 10 : 1.0,
  categories: place.categories || [],
  ai_reason: place.ai_reason,
  ai_category: place.ai_category,
  lat: place.lat,
  lng: place.lng,
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
  onPlaceClick: (place: MockPlace) => void;
  toggleSave: (placeId: string) => void;
  isSaved: (placeId: string) => boolean;
  featured?: boolean;
  userLocation?: { lat: number; lng: number } | null;
  onSeeAll?: (title: string, places: MockPlaceWithCoords[]) => void;
}

const SectionRow: React.FC<SectionRowProps> = ({
  title,
  places,
  onPlaceClick,
  toggleSave,
  isSaved,
  featured = false,
  userLocation,
  onSeeAll,
}) => {
  const handleSeeAll = () => {
    if (onSeeAll) {
      onSeeAll(title, places);
    }
  };

  return (
    <div className="mb-8">
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

      <div 
        className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
          scrollSnapType: 'x proximity'
        }}
      >
        {places.map((place) => (
          <PlaceCardCompact
            key={place.id}
            place={place}
            onSave={toggleSave}
            isSaved={isSaved(place.id)}
            onClick={() => onPlaceClick(place)}
            featured={featured}
          />
        ))}
      </div>
    </div>
  );
};

// Session storage key for caching results
const CACHE_KEY = 'sweetspots_search_cache';
const SUMMARY_CACHE_KEY = 'sweetspots_summary_cache';
const CACHE_VERSION_KEY = 'sweetspots_cache_version';
const CACHED_MOOD_KEY = 'sweetspots_cached_mood';
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

const HomePage = () => {
  const navigate = useNavigate();
  const { userMood, setUserMood } = useApp();
  const { search, isSearching, error: searchError, clearError } = useSearch();
  const { location: userLocation } = useLocation();
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
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState(wasSkipMode.current ? "" : (userMood || ""));
  
  // Sync searchValue when userMood changes (from EntryScreen)
  useEffect(() => {
    if (userMood && !searchValue && !wasSkipMode.current) {
      setSearchValue(userMood);
    }
  }, [userMood]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [localSavedIds, setLocalSavedIds] = useState<Set<string>>(new Set());
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
  
  // Save to board dialog state
  const [saveToBoardPlace, setSaveToBoardPlace] = useState<MockPlace | null>(null);
  
  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({ budget: null, vibes: [] });

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
    // Check if the mood has changed since last cache
    const cachedMood = sessionStorage.getItem(CACHED_MOOD_KEY) || "";
    const currentMood = userMood?.trim() || "";
    const moodChanged = currentMood && currentMood !== cachedMood;
    
    // Skip if already loaded and mood hasn't changed (but not if we're in skip mode)
    if (hasLoadedInitial.current && !moodChanged && !wasSkipMode.current) return;
    if (searchResults.length > 0 && !moodChanged && !wasSkipMode.current) {
      hasLoadedInitial.current = true;
      return;
    }
    hasLoadedInitial.current = true;

    const loadInitialPlaces = async () => {
      setIsInitialLoading(true);
      try {
        let searchPrompt: string;
        
        if (wasSkipMode.current) {
          // Use time-based prompt for skip mode
          searchPrompt = getTimeBasedPrompt();
          console.log("Skip mode - using time-based prompt:", searchPrompt);
          // Reset the ref so future navigations don't trigger skip mode
          wasSkipMode.current = false;
        } else {
          // Use the mood from EntryScreen if available, otherwise use default
          searchPrompt = currentMood || "popular restaurants and cafes nearby";
          console.log("Initial search with prompt:", searchPrompt);
          
          // Store the current mood in cache
          if (currentMood) {
            sessionStorage.setItem(CACHED_MOOD_KEY, currentMood);
          }
        }
        
        const result = await search(searchPrompt);
        if (result && result.places.length > 0) {
          setSearchResults(result.places.map(rankedToMockPlace));
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
  }, [search, searchResults.length, userMood]);

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
    if (localSavedIds.has(placeId)) {
      setLocalSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(placeId);
        return next;
      });
    } else {
      const place = getPlaceById(placeId);
      if (place) {
        setSaveToBoardPlace(place);
      }
    }
  }, [localSavedIds, getPlaceById]);

  const handleBoardSaveConfirmed = useCallback(() => {
    if (saveToBoardPlace) {
      setLocalSavedIds((prev) => new Set(prev).add(saveToBoardPlace.id));
    }
    setSaveToBoardPlace(null);
  }, [saveToBoardPlace]);

  const isSaved = useCallback(
    (placeId: string) => localSavedIds.has(placeId),
    [localSavedIds]
  );

  const handlePlaceClick = (place: MockPlace) => {
    navigate(`/place/${place.id}`, { state: { ai_reason: place.ai_reason } });
  };

  const handleSeeAll = (title: string, places: MockPlaceWithCoords[]) => {
    navigate(`/category/${encodeURIComponent(title)}`, {
      state: { places, userLocation },
    });
  };

  // Build search prompt with filters
  const buildSearchPrompt = (basePrompt: string, filters: FilterState): string => {
    let prompt = basePrompt;
    
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
    
    setUserMood(searchValue.trim());
    setNeedsLocationPermission(false);
    
    // Clear old cache before new search to prevent stale data
    setAiSummary(null);
    try {
      sessionStorage.removeItem(CACHE_KEY);
      sessionStorage.removeItem(SUMMARY_CACHE_KEY);
    } catch (e) {
      console.error('Failed to clear cache:', e);
    }
    
    // Build prompt with filters
    const searchPrompt = buildSearchPrompt(searchValue.trim(), appliedFilters);
    console.log("Search with filters:", searchPrompt);
    
    const result = await search(searchPrompt);
    if (result && result.places.length > 0) {
      setSearchResults(result.places.map(rankedToMockPlace));
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
      try {
        sessionStorage.removeItem(CACHE_KEY);
        sessionStorage.removeItem(SUMMARY_CACHE_KEY);
      } catch (e) {
        console.error('Failed to clear cache:', e);
      }
      
      const result = await search(searchPrompt);
      if (result && result.places.length > 0) {
        setSearchResults(result.places.map(rankedToMockPlace));
        setAiSummary(result.summary || null);
        toast.success(`Found ${result.places.length} spots matching your filters!`);
      }
    }
  };

  const handleRetryWithLocation = async () => {
    setNeedsLocationPermission(false);
    setIsInitialLoading(true);
    try {
      const result = await search("popular restaurants and cafes nearby");
      if (result && result.places.length > 0) {
        setSearchResults(result.places.map(rankedToMockPlace));
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

  // Handle applying filters from SlideOutMenu and trigger search
  const handleApplySlideOutFilters = async (filters: Set<string>, distance: number) => {
    // Build filter terms from the selected filter IDs
    const filterTerms: string[] = [];
    
    // Map filter IDs to search terms
    const filterLabels: Record<string, string> = {
      under_50: "budget-friendly under $50",
      "50_100": "mid-range $50-$100",
      "100_plus": "upscale $100+",
      friends: "good for friends",
      romantic: "romantic date spot",
      family: "family-friendly",
      solo: "good for solo",
      chill: "chill and quiet",
      lively: "fun and lively",
      hidden: "hidden gem",
      scenic: "scenic with nice view",
      pet: "pet-friendly",
      late_night: "late night",
      outdoor: "outdoor seating",
    };
    
    filters.forEach(filterId => {
      if (filterLabels[filterId]) {
        filterTerms.push(filterLabels[filterId]);
      }
    });
    
    // Add distance filter to search terms
    if (distance < 25) {
      filterTerms.push(`within ${distance} km`);
    }
    
    // Build the search prompt
    const basePrompt = searchValue.trim() || userMood || "restaurants and cafes nearby";
    const searchPrompt = filterTerms.length > 0 
      ? `${basePrompt}, ${filterTerms.join(", ")}`
      : basePrompt;
    
    console.log("Search with slide-out filters:", searchPrompt, "Distance:", distance);
    
    // Clear cache and run search
    setAiSummary(null);
    try {
      sessionStorage.removeItem(CACHE_KEY);
      sessionStorage.removeItem(SUMMARY_CACHE_KEY);
    } catch (e) {
      console.error('Failed to clear cache:', e);
    }
    
    const result = await search(searchPrompt);
    if (result && result.places.length > 0) {
      // Filter results by distance if specified
      let filteredPlaces = result.places;
      if (distance < 25) {
        filteredPlaces = result.places.filter(place => {
          const placeDistanceKm = place.distance_meters ? place.distance_meters / 1000 : 0;
          return placeDistanceKm <= distance;
        });
      }
      
      if (filteredPlaces.length > 0) {
        setSearchResults(filteredPlaces.map(rankedToMockPlace));
        setAiSummary(result.summary || null);
        toast.success(`Found ${filteredPlaces.length} spots within ${distance} km!`);
      } else {
        setSearchResults([]);
        toast.info(`No places found within ${distance} km. Try increasing the distance.`);
      }
    } else if (result && result.places.length === 0) {
      toast.info("No places found with these filters. Try different options.");
    }
  };

  // Group places by AI category for display - ensuring NO duplicates across sections
  const displaySections = useMemo(() => {
    if (searchResults.length === 0) return [];
    
    const usedPlaceIds = new Set<string>();
    const sections: { title: string; places: MockPlace[]; featured: boolean }[] = [];
    
    // Section 1: Top Picks - Nearest places first (only 2)
    const topPicks = [...searchResults]
      .sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999))
      .slice(0, 2);
    topPicks.forEach(p => usedPlaceIds.add(p.id));
    
    if (topPicks.length > 0) {
      sections.push({
        title: "✨ Top Picks for You",
        places: topPicks,
        featured: true,
      });
    }

    // Group remaining places by category (excluding already used)
    const remainingPlaces = searchResults.filter(p => !usedPlaceIds.has(p.id));
    const categoryGroups: Record<string, MockPlace[]> = {};
    
    remainingPlaces.forEach(place => {
      const category = place.ai_category?.toLowerCase() || 'other';
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(place);
    });

    // Category labels mapping
    const categoryLabels: Record<string, string> = {
      restaurant: "🍽️ Restaurants",
      bar: "🍸 Bars & Nightlife",
      cafe: "☕ Cafes",
      rooftop: "🌆 Rooftop Spots",
      club: "🎉 Clubs & Dancing",
      landmark: "📍 Landmarks",
      park: "🌳 Parks & Outdoors",
      bakery: "🥐 Bakeries",
      lounge: "🛋️ Lounges",
      "street food": "🍜 Street Food",
      warung: "🍛 Warungs",
      food_stall: "🥡 Food Stalls",
      fast_food: "🍔 Fast Food",
      market: "🏪 Markets",
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
    const moreToExplore = searchResults.filter(p => !usedPlaceIds.has(p.id));
    if (moreToExplore.length > 0) {
      sections.push({
        title: "🗺️ More to Explore",
        places: moreToExplore.slice(0, 10),
        featured: false,
      });
    }

    return sections;
  }, [searchResults]);

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

          <h1 className="text-xl font-bold text-foreground tracking-tight">
            SweetSpots
          </h1>

          <button
            onClick={() => navigate("/profile")}
            className="p-2 -mr-2 text-foreground hover:text-primary transition-colors"
          >
            <User className="w-6 h-6" />
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
        onApplyFilters={handleApplySlideOutFilters}
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
        ) : displaySections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Ask me anything to discover amazing places!</p>
          </div>
        ) : (
          <>
            {/* AI Summary Card */}
            {aiSummary && (
              <AISummaryCard summary={aiSummary} />
            )}

            {displaySections.map((section, index) => (
              <SectionRow
                key={index}
                title={section.title}
                places={section.places}
                onPlaceClick={handlePlaceClick}
                toggleSave={handleSaveClick}
                isSaved={isSaved}
                featured={section.featured}
                userLocation={userLocation}
                onSeeAll={handleSeeAll}
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
    </div>
  );
};

export default HomePage;
