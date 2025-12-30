import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, ChevronRight, X, User, Loader2, MapPin, Sparkles } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Input } from "./ui/input";
import SlideOutMenu from "./SlideOutMenu";
import PlaceCardCompact, { MockPlace } from "./PlaceCardCompact";
import SaveToBoardDialog from "./saved/SaveToBoardDialog";
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

const HomePage = () => {
  const navigate = useNavigate();
  const { userMood, setUserMood } = useApp();
  const { search, isSearching, error: searchError, clearError } = useSearch();
  const hasLoadedInitial = useRef(false);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState(userMood || "");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [localSavedIds, setLocalSavedIds] = useState<Set<string>>(new Set());
  const [aiSummary, setAiSummary] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(SUMMARY_CACHE_KEY);
    } catch {
      return null;
    }
  });
  const [searchResults, setSearchResults] = useState<MockPlace[]>(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('Failed to restore cache:', e);
    }
    return [];
  });
  const [isInitialLoading, setIsInitialLoading] = useState(() => {
    try {
      return !sessionStorage.getItem(CACHE_KEY);
    } catch {
      return true;
    }
  });
  const [needsLocationPermission, setNeedsLocationPermission] = useState(false);
  
  // Save to board dialog state
  const [saveToBoardPlace, setSaveToBoardPlace] = useState<MockPlace | null>(null);

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

  // Load initial places on mount
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
        const result = await search("popular restaurants and cafes nearby");
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
  }, [search, searchResults.length]);

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
    navigate(`/place/${place.id}`);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    
    setUserMood(searchValue.trim());
    setNeedsLocationPermission(false);
    
    const result = await search(searchValue.trim());
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

  // Group places by AI category for display
  const displaySections = useMemo(() => {
    if (searchResults.length === 0) return [];
    
    // Group by AI category
    const categoryGroups: Record<string, MockPlace[]> = {};
    const uncategorized: MockPlace[] = [];
    
    searchResults.forEach(place => {
      const category = place.ai_category?.toLowerCase() || 'other';
      if (category && category !== 'other') {
        if (!categoryGroups[category]) {
          categoryGroups[category] = [];
        }
        categoryGroups[category].push(place);
      } else {
        uncategorized.push(place);
      }
    });

    const sections: { title: string; places: MockPlace[]; featured: boolean }[] = [];
    
    // First section: Top Picks (first 5 places)
    if (searchResults.length > 0) {
      sections.push({
        title: "✨ Top Picks for You",
        places: searchResults.slice(0, Math.min(5, searchResults.length)),
        featured: true,
      });
    }

    // Add category sections
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
    };

    Object.entries(categoryGroups).forEach(([category, places]) => {
      if (places.length >= 2) {
        sections.push({
          title: categoryLabels[category] || `${category.charAt(0).toUpperCase() + category.slice(1)}s`,
          places: places.slice(0, 10),
          featured: false,
        });
      }
    });

    // Add remaining places
    if (uncategorized.length > 0 || searchResults.length > 5) {
      const moreToExplore = searchResults.slice(5);
      if (moreToExplore.length > 0) {
        sections.push({
          title: "🗺️ More to Explore",
          places: moreToExplore,
          featured: false,
        });
      }
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
                placeholder="Ask anything: rooftop bars, date spots, hidden gems..."
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
    </div>
  );
};

export default HomePage;
