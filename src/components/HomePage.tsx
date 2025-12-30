import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, ChevronRight, X, User, Loader2, MapPin, Sparkles, SlidersHorizontal } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Input } from "./ui/input";
import SlideOutMenu from "./SlideOutMenu";
import PlaceCardCompact, { MockPlace } from "./PlaceCardCompact";
import SaveToBoardDialog from "./saved/SaveToBoardDialog";
import TravelPersonalityFilterModal, { FilterState } from "./TravelPersonalityFilterModal";
import { useSearch, RankedPlace } from "@/hooks/useSearch";
import { toast } from "sonner";
import { Button } from "./ui/button";

// Helper to convert RankedPlace to MockPlace format
const rankedToMockPlace = (place: RankedPlace): MockPlace => ({
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
  places: MockPlace[];
  onPlaceClick: (place: MockPlace) => void;
  toggleSave: (placeId: string) => void;
  isSaved: (placeId: string) => boolean;
  featured?: boolean;
}

const SectionRow: React.FC<SectionRowProps> = ({
  title,
  places,
  onPlaceClick,
  toggleSave,
  isSaved,
  featured = false,
}) => {
  const handleSeeAll = () => {
    toast.info(`"See all" for "${title}" coming soon!`);
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
const CURRENT_CACHE_VERSION = '2'; // Increment to bust cache

const HomePage = () => {
  const navigate = useNavigate();
  const { userMood, setUserMood } = useApp();
  const { search, isSearching, error: searchError, clearError } = useSearch();
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

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState(userMood || "");
  
  // Sync searchValue when userMood changes (from EntryScreen)
  useEffect(() => {
    if (userMood && !searchValue) {
      setSearchValue(userMood);
    }
  }, [userMood]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [localSavedIds, setLocalSavedIds] = useState<Set<string>>(new Set());
  const [aiSummary, setAiSummary] = useState<string | null>(() => {
    try {
      const version = sessionStorage.getItem(CACHE_VERSION_KEY);
      if (version !== CURRENT_CACHE_VERSION) return null;
      return sessionStorage.getItem(SUMMARY_CACHE_KEY);
    } catch {
      return null;
    }
  });
  const [searchResults, setSearchResults] = useState<MockPlace[]>(getCachedResults);
  const [isInitialLoading, setIsInitialLoading] = useState(() => {
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
    if (hasLoadedInitial.current) return;
    if (searchResults.length > 0) {
      hasLoadedInitial.current = true;
      return;
    }
    hasLoadedInitial.current = true;

    const loadInitialPlaces = async () => {
      setIsInitialLoading(true);
      try {
        // Use the mood from EntryScreen if available, otherwise use default
        const searchPrompt = userMood && userMood.trim() 
          ? userMood.trim() 
          : "popular restaurants and cafes nearby";
        
        console.log("Initial search with prompt:", searchPrompt);
        
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

  // Group places by AI category for display - ensuring NO duplicates across sections
  const displaySections = useMemo(() => {
    if (searchResults.length === 0) return [];
    
    const usedPlaceIds = new Set<string>();
    const sections: { title: string; places: MockPlace[]; featured: boolean }[] = [];
    
    // Section 1: Top Picks - Nearest places first (sorted by distance)
    const topPicksCount = Math.min(5, Math.ceil(searchResults.length * 0.3));
    const topPicks = [...searchResults]
      .sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999))
      .slice(0, topPicksCount);
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

    // Section 2: Primary category (most places, directly related)
    if (sortedCategories.length > 0) {
      const [category, places] = sortedCategories[0];
      const sectionPlaces = places.slice(0, 6);
      sectionPlaces.forEach(p => usedPlaceIds.add(p.id));
      
      sections.push({
        title: categoryLabels[category] || `${category.charAt(0).toUpperCase() + category.slice(1)}s`,
        places: sectionPlaces,
        featured: false,
      });
    }

    // Section 3: Secondary category (related but different)
    if (sortedCategories.length > 1) {
      const [category, places] = sortedCategories[1];
      const sectionPlaces = places.filter(p => !usedPlaceIds.has(p.id)).slice(0, 6);
      sectionPlaces.forEach(p => usedPlaceIds.add(p.id));
      
      if (sectionPlaces.length > 0) {
        sections.push({
          title: categoryLabels[category] || `${category.charAt(0).toUpperCase() + category.slice(1)}s`,
          places: sectionPlaces,
          featured: false,
        });
      }
    }

    // Section 4: "More to Explore" - remaining unused places
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
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 -ml-2 text-foreground hover:text-primary transition-colors"
          >
            <Menu className="w-6 h-6" />
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

        {/* Search Bar with Filter Button */}
        <div className="px-4 pb-3 flex gap-2">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
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
          
          {/* Filter Button */}
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
              activeFilters.size > 0 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted/50 text-foreground hover:bg-muted"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilters.size > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
                {activeFilters.size}
              </span>
            )}
          </button>
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
      />

      {/* Main Content */}
      <main className="pt-4">
        {isSearching || isInitialLoading ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="relative">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              <div className="absolute inset-0 w-8 h-8 border-2 border-primary/30 rounded-full animate-ping" />
            </div>
            <p className="text-foreground font-medium mt-4">AI is finding the best spots...</p>
            <p className="text-muted-foreground text-sm mt-1">Analyzing your request</p>
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
              <div className="mx-4 mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground leading-relaxed">{aiSummary}</p>
                  </div>
                </div>
              </div>
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
