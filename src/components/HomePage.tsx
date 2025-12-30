import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, ChevronRight, X, User, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Input } from "./ui/input";
import SlideOutMenu from "./SlideOutMenu";
import PlaceCardCompact, { MockPlace } from "./PlaceCardCompact";
import SaveToBoardDialog from "./saved/SaveToBoardDialog";
import { usePromptDecomposition } from "@/hooks/usePromptDecomposition";
import { useSearch, RankedPlace } from "@/hooks/useSearch";
import { toast } from "sonner";

// Helper to convert RankedPlace to MockPlace format
const rankedToMockPlace = (place: RankedPlace): MockPlace => ({
  id: place.place_id,
  name: place.name,
  image: place.photo_name 
    ? `https://bqjuoxckvrkykfqpbkpv.supabase.co/functions/v1/place-photo?photo_name=${encodeURIComponent(place.photo_name)}`
    : `https://source.unsplash.com/400x300/?restaurant,food&${place.name.slice(0, 3)}`,
  rating: place.rating || 4.0,
  distance_km: place.distance_meters ? Math.round(place.distance_meters / 100) / 10 : 1.0,
  categories: place.categories || [],
});

// Fallback dummy data for when no search is active
const FALLBACK_PLACES: MockPlace[] = [
  {
    id: "1",
    name: "The Velvet Corner",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop",
    rating: 4.7,
    distance_km: 1.2,
    vibeTag: "Chill",
    categories: ["café"],
  },
  {
    id: "2",
    name: "Bloom Garden Café",
    image: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400&h=300&fit=crop",
    rating: 4.5,
    distance_km: 1.8,
    vibeTag: "Aesthetic",
    categories: ["café"],
  },
  {
    id: "3",
    name: "Midnight Ramen",
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop",
    rating: 4.8,
    distance_km: 0.8,
    vibeTag: "Cozy",
    categories: ["restaurant"],
  },
  {
    id: "4",
    name: "The Quiet Library Bar",
    image: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&h=300&fit=crop",
    rating: 4.6,
    distance_km: 2.3,
    vibeTag: "Intimate",
    categories: ["bar"],
  },
];

// Helper to get shuffled/filtered places based on section type
const getPlacesForSection = (
  type: "exact" | "core" | "secondary" | "similar",
  allPlaces: MockPlace[]
): MockPlace[] => {
  if (allPlaces.length === 0) return [];
  
  // When we have real search results, show all of them in the exact match section
  // and subsets for other sections
  switch (type) {
    case "exact":
      return allPlaces.slice(0, Math.min(8, allPlaces.length));
    case "core":
      return allPlaces.slice(0, Math.min(6, allPlaces.length));
    case "secondary":
      return allPlaces.length > 4 ? allPlaces.slice(4, Math.min(8, allPlaces.length)) : allPlaces.slice(0, Math.min(4, allPlaces.length));
    case "similar":
      return [...allPlaces].sort(() => Math.random() - 0.5).slice(0, Math.min(4, allPlaces.length));
    default:
      return allPlaces.slice(0, Math.min(4, allPlaces.length));
  }
};

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
}) => (
  <div className="mb-8">
    {/* Section Header */}
    <div className="flex items-center justify-between px-4 mb-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <button className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
        See all
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>

    <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
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

const HomePage = () => {
  const navigate = useNavigate();
  const { userMood, setUserMood } = useApp();
  const { search, isSearching, error: searchError, clearError } = useSearch();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState(userMood || "");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [localSavedIds, setLocalSavedIds] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<MockPlace[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Save to board dialog state
  const [saveToBoardPlace, setSaveToBoardPlace] = useState<MockPlace | null>(null);

  // Show search errors as toast
  useEffect(() => {
    if (searchError) {
      toast.error(searchError);
      clearError();
    }
  }, [searchError, clearError]);

  // Get place name helper for dialog - use either search results or fallback
  const allPlaces = useMemo(() => 
    searchResults.length > 0 ? searchResults : FALLBACK_PLACES,
    [searchResults]
  );

  const getPlaceById = useCallback((placeId: string) => {
    return allPlaces.find(p => p.id === placeId);
  }, [allPlaces]);

  // Handle save - opens board dialog for new saves, toggles off for unsave
  const handleSaveClick = useCallback((placeId: string) => {
    if (localSavedIds.has(placeId)) {
      // Unsave - just remove from local state
      setLocalSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(placeId);
        return next;
      });
    } else {
      // Open the save-to-board dialog
      const place = getPlaceById(placeId);
      if (place) {
        setSaveToBoardPlace(place);
      }
    }
  }, [localSavedIds, getPlaceById]);

  // Called when save to board is confirmed
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
    setHasSearched(true);
    
    const result = await search(searchValue.trim());
    if (result && result.places.length > 0) {
      setSearchResults(result.places.map(rankedToMockPlace));
      toast.success(`Found ${result.places.length} places near you!`);
    } else if (result && result.places.length === 0) {
      toast.info("No places found. Try a different search.");
      setSearchResults([]);
    }
  };

  const handleClearSearch = () => {
    setSearchValue("");
    setUserMood("");
    setSearchResults([]);
    setHasSearched(false);
  };

  const removeFilter = (filterId: string) => {
    const newFilters = new Set(activeFilters);
    newFilters.delete(filterId);
    setActiveFilters(newFilters);
  };

  // Use prompt decomposition for dynamic sections
  const decomposedSections = usePromptDecomposition(searchValue);
  
  // Build display sections with places
  const displaySections = useMemo(() => {
    const placesToUse = searchResults.length > 0 ? searchResults : FALLBACK_PLACES;
    return decomposedSections.map((section, index) => ({
      title: section.title,
      places: getPlacesForSection(section.type, placesToUse),
      featured: index === 0, // First section is featured
      type: section.type,
      description: section.description,
    }));
  }, [decomposedSections, searchResults]);

  return (
    <div className="min-h-screen bg-background max-w-[420px] mx-auto relative pb-24">
      {/* Nav Bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Hamburger */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 -ml-2 text-foreground hover:text-primary transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Center: Logo */}
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            SweetSpots
          </h1>

          {/* Right: Profile */}
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
                <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
              )}
              <Input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Try: cheap eats, nice view, chill vibe"
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
        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground text-sm">Finding great spots near you...</p>
          </div>
        ) : displaySections.length === 0 || (hasSearched && searchResults.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <p className="text-muted-foreground">No places found. Try a different search!</p>
          </div>
        ) : (
          displaySections.map((section, index) => (
            <SectionRow
              key={index}
              title={section.title}
              places={section.places}
              onPlaceClick={handlePlaceClick}
              toggleSave={handleSaveClick}
              isSaved={isSaved}
              featured={section.featured}
            />
          ))
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
