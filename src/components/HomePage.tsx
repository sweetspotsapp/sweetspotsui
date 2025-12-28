import { useState, useMemo } from "react";
import { Menu, Search, DollarSign, Car, TreePine, Star, Sparkles, Users, Coffee, Utensils, Music, Camera } from "lucide-react";
import { useApp } from "@/context/AppContext";
import PlaceDetail from "./PlaceDetail";
import type { RankedPlace } from "@/hooks/useSearch";

// Keyword to chip mapping
const keywordChipMap: Record<string, { label: string; icon: React.ReactNode; keywords: string[] }> = {
  budget: { label: "Under $50", icon: <DollarSign className="w-4 h-4" />, keywords: ["cheap", "budget", "free", "affordable", "$", "inexpensive", "low cost"] },
  cbd: { label: "Near The CBD", icon: <Car className="w-4 h-4" />, keywords: ["cbd", "city", "downtown", "central", "urban", "metro"] },
  nature: { label: "Nature & Outdoor", icon: <TreePine className="w-4 h-4" />, keywords: ["nature", "outdoor", "park", "garden", "beach", "hiking", "trail", "forest", "green"] },
  friends: { label: "Friend Groups", icon: <Users className="w-4 h-4" />, keywords: ["friends", "group", "hangout", "social", "fun", "party", "gathering"] },
  cafe: { label: "Cafes & Coffee", icon: <Coffee className="w-4 h-4" />, keywords: ["cafe", "coffee", "tea", "brunch", "breakfast"] },
  food: { label: "Food & Dining", icon: <Utensils className="w-4 h-4" />, keywords: ["food", "restaurant", "dining", "eat", "lunch", "dinner", "cuisine"] },
  music: { label: "Music & Nightlife", icon: <Music className="w-4 h-4" />, keywords: ["music", "bar", "nightlife", "club", "live", "concert", "drinks"] },
  photo: { label: "Instagram Worthy", icon: <Camera className="w-4 h-4" />, keywords: ["photo", "instagram", "scenic", "view", "beautiful", "aesthetic", "pretty"] },
};

// Extract chips based on user's mood/prompt
const extractChipsFromMood = (mood: string): { id: string; label: string; icon: React.ReactNode }[] => {
  const lowerMood = mood.toLowerCase();
  const chips: { id: string; label: string; icon: React.ReactNode }[] = [];
  
  Object.entries(keywordChipMap).forEach(([id, { label, icon, keywords }]) => {
    if (keywords.some(kw => lowerMood.includes(kw))) {
      chips.push({ id, label, icon });
    }
  });
  
  // Default chips if none matched
  if (chips.length === 0) {
    chips.push(
      { id: "budget", label: "Under $50", icon: <DollarSign className="w-4 h-4" /> },
      { id: "cbd", label: "Near The CBD", icon: <Car className="w-4 h-4" /> },
      { id: "nature", label: "Nature & Outdoor", icon: <TreePine className="w-4 h-4" /> }
    );
  }
  
  return chips.slice(0, 4); // Max 4 chips
};

// Generate section titles from mood
const generateSectionTitles = (mood: string, vibes: string[]): string[] => {
  const lowerMood = mood.toLowerCase();
  const titles: string[] = [];
  
  if (lowerMood.includes("cheap") || lowerMood.includes("budget") || lowerMood.includes("free")) {
    titles.push("Hidden gems under $50");
  } else {
    titles.push("Top picks for you");
  }
  
  if (lowerMood.includes("cbd") || lowerMood.includes("city") || lowerMood.includes("central")) {
    titles.push("Chill spots near the CBD");
  } else {
    titles.push("Worth exploring nearby");
  }
  
  if (lowerMood.includes("friend") || lowerMood.includes("group") || lowerMood.includes("hangout")) {
    titles.push("Great for friend groups");
  } else {
    titles.push("You might also like");
  }
  
  return titles;
};

interface ChipProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

const Chip: React.FC<ChipProps> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-4 py-2 rounded-full border whitespace-nowrap transition-all
      ${isActive 
        ? 'bg-primary/10 border-primary text-primary' 
        : 'bg-card border-border text-muted-foreground hover:border-primary/50'
      }
      shadow-sm`}
  >
    <span className="text-primary">{icon}</span>
    <span className="text-sm font-medium">{label}</span>
  </button>
);

interface PlaceCardProps {
  place: RankedPlace;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ place }) => {
  const [imageError, setImageError] = useState(false);
  
  // Get photo URL
  const getPhotoUrl = (photoName: string | null): string | null => {
    if (!photoName) return null;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/functions/v1/place-photo?photo=${encodeURIComponent(photoName)}&maxwidth=400&maxheight=500`;
  };
  
  const getPlaceholderImage = (name: string, categories?: string[] | null): string => {
    const category = categories?.[0]?.toLowerCase() || 'place';
    const searchTerms: Record<string, string> = {
      restaurant: 'restaurant,food',
      cafe: 'coffee,cafe',
      bar: 'bar,drinks',
      park: 'park,nature',
      museum: 'museum,art',
      beach: 'beach,ocean',
      default: 'travel,destination'
    };
    const term = Object.entries(searchTerms).find(([key]) => category.includes(key))?.[1] || searchTerms.default;
    return `https://source.unsplash.com/400x500/?${term}&${name.slice(0, 3)}`;
  };
  
  const imageUrl = getPhotoUrl(place.photo_name) || getPlaceholderImage(place.name, place.categories);
  
  // Format price label based on rating as a proxy for price level
  const getPriceLabel = (): string => {
    // Using a simple heuristic since we don't have price_level
    return "free - 50";
  };
  
  return (
    <div className="flex-shrink-0 w-[140px] relative">
      <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-muted">
        <img
          src={imageError ? '/placeholder.svg' : imageUrl}
          alt={place.name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
        {/* Rating badge - bottom left */}
        <div className="absolute bottom-12 left-2">
          <div className="flex items-center gap-1 bg-card/95 backdrop-blur-sm px-2 py-1 rounded-full shadow-soft">
            <Star className="w-3 h-3 text-primary fill-primary" />
            <span className="text-xs font-medium text-foreground">{place.rating || 5}</span>
          </div>
        </div>
      </div>
      {/* Price badge - below image */}
      <div className="mt-2 flex justify-start">
        <div className="flex items-center gap-1 bg-card border border-border px-2 py-1 rounded-full shadow-sm">
          <DollarSign className="w-3 h-3 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">{getPriceLabel()}</span>
        </div>
      </div>
    </div>
  );
};

interface SectionRowProps {
  title: string;
  places: RankedPlace[];
  onPlaceClick: (place: RankedPlace) => void;
}

const SectionRow: React.FC<SectionRowProps> = ({ title, places, onPlaceClick }) => (
  <div className="mb-6">
    <h2 className="text-lg font-semibold text-foreground mb-3 px-4">{title}</h2>
    <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
      {places.map((place) => (
        <div key={place.place_id} onClick={() => onPlaceClick(place)} className="cursor-pointer">
          <PlaceCard place={place} />
        </div>
      ))}
    </div>
  </div>
);

const HomePage = () => {
  const { userMood, userVibes, resetOnboarding, rankedPlaces } = useApp();
  const [selectedPlace, setSelectedPlace] = useState<RankedPlace | null>(null);
  const [activeChip, setActiveChip] = useState<string | null>(null);

  // Generate dynamic chips from user's mood
  const chips = useMemo(() => extractChipsFromMood(userMood), [userMood]);
  
  // Generate section titles
  const sectionTitles = useMemo(() => generateSectionTitles(userMood, userVibes), [userMood, userVibes]);

  // Split places into sections
  const section1Places = rankedPlaces.slice(0, 6);
  const section2Places = rankedPlaces.slice(6, 12);
  const section3Places = rankedPlaces.slice(12, 18);

  return (
    <>
      <div className="min-h-screen bg-background max-w-[420px] mx-auto relative pb-24">
        {/* Top App Bar */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <button className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-primary">SweetSpots</h1>
            <button 
              onClick={resetOnboarding}
              className="p-2 -mr-2 text-primary hover:text-primary/80 transition-colors"
              title="Change Vibe"
            >
              <Sparkles className="w-6 h-6" />
            </button>
          </div>

          {/* Dynamic Chip Row based on user prompt */}
          <div className="flex gap-2 overflow-x-auto px-4 pb-4 scrollbar-hide">
            {chips.map((chip) => (
              <Chip
                key={chip.id}
                icon={chip.icon}
                label={chip.label}
                isActive={activeChip === chip.id}
                onClick={() => setActiveChip(activeChip === chip.id ? null : chip.id)}
              />
            ))}
          </div>
        </div>

        {/* Main Content */}
        <main className="pt-2">
          {section1Places.length > 0 && (
            <SectionRow 
              title={sectionTitles[0]} 
              places={section1Places} 
              onPlaceClick={setSelectedPlace}
            />
          )}
          {section2Places.length > 0 && (
            <SectionRow 
              title={sectionTitles[1]} 
              places={section2Places}
              onPlaceClick={setSelectedPlace}
            />
          )}
          {section3Places.length > 0 && (
            <SectionRow 
              title={sectionTitles[2]} 
              places={section3Places}
              onPlaceClick={setSelectedPlace}
            />
          )}
          
          {rankedPlaces.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="text-muted-foreground">No places found yet.</p>
              <button 
                onClick={resetOnboarding}
                className="mt-2 text-primary text-sm font-medium"
              >
                Try a new search
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Place Detail Modal */}
      {selectedPlace && (
        <PlaceDetail 
          place={selectedPlace} 
          onClose={() => setSelectedPlace(null)}
          userMood={userMood}
        />
      )}
    </>
  );
};

export default HomePage;
