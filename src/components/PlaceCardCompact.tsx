import { useState, useRef } from "react";
import { Star, Heart, Navigation } from "lucide-react";

// Dummy place type for mock data
export interface MockPlace {
  id: string;
  name: string;
  image: string;
  rating: number;
  distance_km: number;
  vibeTag?: string;
  categories?: string[];
}

interface PlaceCardCompactProps {
  place: MockPlace;
  onSave: (placeId: string) => void;
  isSaved: boolean;
  onClick: () => void;
  featured?: boolean;
  savedTabRef?: React.RefObject<HTMLElement>;
}

// Get vibe tag from categories
const getVibeTag = (place: MockPlace): string | null => {
  if (place.vibeTag) return place.vibeTag;
  if (!place.categories || place.categories.length === 0) return null;
  const category = place.categories[0];
  if (category.toLowerCase().includes('bar') || category.toLowerCase().includes('club')) return 'Nightlife';
  if (category.toLowerCase().includes('cafe') || category.toLowerCase().includes('coffee')) return 'Chill';
  if (category.toLowerCase().includes('restaurant')) return 'Group-friendly';
  return null;
};

const PlaceCardCompact: React.FC<PlaceCardCompactProps> = ({ 
  place, 
  onSave, 
  isSaved, 
  onClick, 
  featured = false,
  savedTabRef
}) => {
  const [imageError, setImageError] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationStyle, setAnimationStyle] = useState<React.CSSProperties>({});
  const cardRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const getPlaceholderImage = () => {
    return `https://source.unsplash.com/400x300/?restaurant,food&${place.name.slice(0, 3)}`;
  };

  const imageUrl = place.image || getPlaceholderImage();
  const vibeTag = getVibeTag(place);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If unsaving, just toggle without animation
    if (isSaved) {
      onSave(place.id);
      return;
    }

    // Get positions for the fly animation
    const imageRect = imageRef.current?.getBoundingClientRect();
    const savedTab = document.querySelector('[data-saved-tab]');
    const savedTabRect = savedTab?.getBoundingClientRect();

    if (imageRect && savedTabRect) {
      // Calculate the translation needed
      const translateX = savedTabRect.left + savedTabRect.width / 2 - (imageRect.left + imageRect.width / 2);
      const translateY = savedTabRect.top + savedTabRect.height / 2 - (imageRect.top + imageRect.height / 2);

      setAnimationStyle({
        '--fly-x': `${translateX}px`,
        '--fly-y': `${translateY}px`,
      } as React.CSSProperties);

      setIsAnimating(true);

      // Trigger the save after animation starts
      setTimeout(() => {
        onSave(place.id);
      }, 150);

      // Reset animation state
      setTimeout(() => {
        setIsAnimating(false);
      }, 500);
    } else {
      // Fallback if we can't get positions
      onSave(place.id);
    }
  };

  return (
    <div 
      ref={cardRef}
      className={`flex-shrink-0 cursor-pointer group ${featured ? 'w-[200px]' : 'w-[160px]'}`}
      onClick={onClick}
    >
      {/* Image Container */}
      <div 
        ref={imageRef}
        className={`relative rounded-2xl overflow-hidden bg-muted ${featured ? 'aspect-[4/3]' : 'aspect-[3/4]'}`}
      >
        {/* Animated clone for fly effect */}
        {isAnimating && (
          <div 
            className="absolute inset-0 z-50 rounded-2xl overflow-hidden pointer-events-none animate-fly-to-saved"
            style={animationStyle}
          >
            <img
              src={imageError ? getPlaceholderImage() : imageUrl}
              alt={place.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <img
          src={imageError ? getPlaceholderImage() : imageUrl}
          alt={place.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImageError(true)}
        />

        {/* Save button */}
        <button
          onClick={handleSave}
          className={`absolute top-2 right-2 p-2 bg-card/90 backdrop-blur-sm rounded-full shadow-soft transition-all duration-200 hover:scale-110 ${
            isSaved ? 'animate-pulse-once' : ''
          }`}
        >
          <Heart 
            className={`w-4 h-4 transition-all duration-200 ${
              isSaved ? 'fill-primary text-primary scale-110' : 'text-muted-foreground'
            }`} 
          />
        </button>

        {/* Vibe tag */}
        {vibeTag && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-1 bg-card/90 backdrop-blur-sm text-xs font-medium text-foreground rounded-full">
              {vibeTag}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-2.5 space-y-1">
        <h3 className="font-semibold text-foreground text-sm line-clamp-1">{place.name}</h3>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {/* Rating */}
          <div className="flex items-center gap-0.5">
            <Star className="w-3.5 h-3.5 text-primary fill-primary" />
            <span className="font-medium text-foreground">{place.rating.toFixed(1)}</span>
          </div>

          <span className="text-border">•</span>

          {/* Distance in km */}
          <div className="flex items-center gap-0.5">
            <Navigation className="w-3 h-3" />
            <span>{place.distance_km.toFixed(1)} km</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceCardCompact;