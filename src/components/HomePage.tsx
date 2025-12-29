import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, ChevronRight, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import SlideOutMenu from "./SlideOutMenu";
import PlaceCardCompact, { MockPlace } from "./PlaceCardCompact";

// ============= DUMMY DATA =============
const DUMMY_PLACES: MockPlace[] = [
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
  {
    id: "5",
    name: "Sunrise Bakery",
    image: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=400&h=300&fit=crop",
    rating: 4.4,
    distance_km: 0.5,
    vibeTag: "Friendly",
    categories: ["bakery"],
  },
  {
    id: "6",
    name: "The Green Room",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop",
    rating: 4.3,
    distance_km: 1.4,
    vibeTag: "Trendy",
    categories: ["café"],
  },
  {
    id: "7",
    name: "Starlight Terrace",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
    rating: 4.9,
    distance_km: 3.2,
    vibeTag: "Social",
    categories: ["restaurant"],
  },
  {
    id: "8",
    name: "Neon Nights Lounge",
    image: "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=400&h=300&fit=crop",
    rating: 4.2,
    distance_km: 1.7,
    vibeTag: "Vibrant",
    categories: ["bar"],
  },
  {
    id: "9",
    name: "Sunny Side Up",
    image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=300&fit=crop",
    rating: 4.6,
    distance_km: 0.9,
    vibeTag: "Cheerful",
    categories: ["restaurant"],
  },
  {
    id: "10",
    name: "Avocado Toast Co",
    image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop",
    rating: 4.4,
    distance_km: 1.5,
    vibeTag: "Modern",
    categories: ["café"],
  },
  {
    id: "11",
    name: "24/7 Diner",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
    rating: 4.1,
    distance_km: 1.1,
    vibeTag: "Classic",
    categories: ["restaurant"],
  },
  {
    id: "12",
    name: "The Jazz Cellar",
    image: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&h=300&fit=crop",
    rating: 4.7,
    distance_km: 2.8,
    vibeTag: "Sophisticated",
    categories: ["bar"],
  },
];

// Section configurations
const SECTIONS = [
  { title: "Top picks for you", places: DUMMY_PLACES.slice(0, 4), featured: true },
  { title: "Hidden gems under $50", places: DUMMY_PLACES.slice(4, 8), featured: false },
  { title: "Chill spots nearby", places: DUMMY_PLACES.slice(2, 6), featured: false },
  { title: "Great for friend groups", places: DUMMY_PLACES.slice(6, 10), featured: false },
];

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
      {places.map(place => (
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
  const { userMood, setUserMood, sections: contextSections } = useApp();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(userMood || "");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [localSavedIds, setLocalSavedIds] = useState<Set<string>>(new Set());

  // Local save toggle for dummy data
  const toggleSave = useCallback((placeId: string) => {
    setLocalSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(placeId)) {
        next.delete(placeId);
      } else {
        next.add(placeId);
      }
      return next;
    });
  }, []);

  const isSaved = useCallback((placeId: string) => localSavedIds.has(placeId), [localSavedIds]);

  const handlePlaceClick = (place: MockPlace) => {
    navigate(`/place/${place.id}`);
  };

  const handleFilterSelect = (filter: string) => {
    setActiveFilter(filter === activeFilter ? null : filter || null);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      setUserMood(searchValue.trim());
      // In real implementation, this would refresh results
      console.log("Searching for:", searchValue);
    }
  };

  const handleClearSearch = () => {
    setSearchValue("");
    setUserMood("");
  };

  // Dynamic section titles based on search
  const displaySections = searchValue 
    ? [
        { ...SECTIONS[0], title: `Top picks for "${searchValue.split(',')[0].trim()}"` },
        ...SECTIONS.slice(1)
      ]
    : SECTIONS;

  return (
    <div className="min-h-screen bg-background max-w-[420px] mx-auto relative pb-24">
      {/* Header with Search Bar */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-2 -ml-2 text-foreground hover:text-primary transition-colors flex-shrink-0"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <div className={`relative flex items-center transition-all duration-200 ${
              isSearchFocused ? 'ring-2 ring-primary/50' : ''
            }`}>
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Try: cheap eats, nice view, chill vibe"
                className="pl-9 pr-9 h-10 rounded-full bg-muted/50 border-border/50 text-sm placeholder:text-muted-foreground/70"
              />
              {searchValue && (
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
      </div>

      {/* Slide-out Menu */}
      <SlideOutMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)}
        onFilterSelect={handleFilterSelect}
        activeFilter={activeFilter}
      />

      {/* Main Content */}
      <main className="pt-4">
        {displaySections.map((section, index) => (
          <SectionRow
            key={index}
            title={section.title}
            places={section.places}
            onPlaceClick={handlePlaceClick}
            toggleSave={toggleSave}
            isSaved={isSaved}
            featured={section.featured}
          />
        ))}
      </main>
    </div>
  );
};

export default HomePage;