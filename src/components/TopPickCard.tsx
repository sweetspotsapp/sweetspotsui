import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Star, Heart, Navigation, Sparkles, Clock } from "lucide-react";
import { MockPlace } from "./PlaceCardCompact";

interface TopPickCardProps {
  place: MockPlace;
  onSave: (placeId: string) => void;
  isSaved: boolean;
  onClick: () => void;
  showDistance?: boolean;
}

// Get vibe tag from categories or AI category
const getVibeTag = (place: MockPlace): string | null => {
  if (place.ai_category) {
    // Replace underscores with spaces and capitalize first letter
    const formatted = place.ai_category.replace(/_/g, ' ');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
  if (place.vibeTag) return place.vibeTag.replace(/_/g, ' ');
  if (!place.categories || place.categories.length === 0) return null;
  const category = place.categories[0];
  if (category.toLowerCase().includes('bar') || category.toLowerCase().includes('club')) return 'Nightlife';
  if (category.toLowerCase().includes('cafe') || category.toLowerCase().includes('coffee')) return 'Chill';
  if (category.toLowerCase().includes('restaurant')) return 'Restaurant';
  // Replace underscores with spaces
  return category.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const TopPickCard: React.FC<TopPickCardProps> = ({ 
  place, 
  onSave, 
  isSaved, 
  onClick,
  showDistance = true
}) => {
  const [imageError, setImageError] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [flyingClone, setFlyingClone] = useState<{
    src: string;
    startRect: DOMRect;
    endRect: DOMRect;
  } | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const getPlaceholderImage = () => {
    return `https://source.unsplash.com/400x400/?restaurant,food&${place.name.slice(0, 3)}`;
  };

  const imageUrl = place.image || getPlaceholderImage();
  const vibeTag = getVibeTag(place);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isSaved) {
      onSave(place.id);
      return;
    }

    const imageRect = imageRef.current?.getBoundingClientRect();
    const savedTab = document.querySelector('[data-saved-tab]');
    const savedTabRect = savedTab?.getBoundingClientRect();

    if (imageRect && savedTabRect) {
      setFlyingClone({
        src: imageError ? getPlaceholderImage() : imageUrl,
        startRect: imageRect,
        endRect: savedTabRect,
      });
      setIsAnimating(true);

      setTimeout(() => {
        onSave(place.id);
      }, 150);

      setTimeout(() => {
        setIsAnimating(false);
        setFlyingClone(null);
      }, 500);
    } else {
      onSave(place.id);
    }
  };

  return (
    <div 
      className="flex-1 min-w-0 cursor-pointer group"
      onClick={onClick}
    >
      {/* Flying clone portal */}
      {isAnimating && flyingClone && createPortal(
        <div 
          className="fixed z-[9999] rounded-2xl overflow-hidden pointer-events-none animate-fly-to-saved-portal"
          style={{
            top: flyingClone.startRect.top,
            left: flyingClone.startRect.left,
            width: flyingClone.startRect.width,
            height: flyingClone.startRect.height,
            '--fly-end-x': `${flyingClone.endRect.left + flyingClone.endRect.width / 2 - flyingClone.startRect.left - flyingClone.startRect.width / 2}px`,
            '--fly-end-y': `${flyingClone.endRect.top + flyingClone.endRect.height / 2 - flyingClone.startRect.top - flyingClone.startRect.height / 2}px`,
          } as React.CSSProperties}
        >
          <img
            src={flyingClone.src}
            alt={place.name}
            className="w-full h-full object-cover"
          />
        </div>,
        document.body
      )}

      {/* Image Container - taller aspect ratio for prominence */}
      <div 
        ref={imageRef}
        className="relative rounded-2xl overflow-hidden bg-muted aspect-[3/4]"
      >
        <img
          src={imageError ? getPlaceholderImage() : imageUrl}
          alt={place.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImageError(true)}
        />

        {/* Save button */}
        <button
          onClick={handleSave}
          className={`absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center bg-card/90 backdrop-blur-sm rounded-full transition-all duration-200 hover:scale-110 ${
            isSaved ? 'animate-pulse-once' : ''
          }`}
        >
          <Heart 
            className={`w-3.5 h-3.5 transition-all duration-200 ${
              isSaved ? 'fill-primary text-primary scale-110' : 'text-muted-foreground'
            }`} 
          />
        </button>

        {/* Vibe tag only - removed Top Pick badge */}
        {vibeTag && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-1 bg-card/90 backdrop-blur-sm text-xs font-medium text-foreground rounded-full max-w-[100px] truncate block">
              {vibeTag}
            </span>
          </div>
        )}
      </div>

      {/* Info - same structure as PlaceCardCompact */}
      <div className="mt-2.5 space-y-1">
        <h3 className="font-semibold text-foreground text-sm line-clamp-1">{place.name}</h3>
        
        {/* Unique vibes one-liner */}
        {place.unique_vibes && (
          <p className="text-xs text-muted-foreground italic line-clamp-1">
            "{place.unique_vibes}"
          </p>
        )}
        
        {/* Desktop: single row */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-0.5">
            <Star className="w-3.5 h-3.5 text-primary fill-primary" />
            <span className="font-medium text-foreground">{place.rating.toFixed(1)}</span>
          </div>
          {showDistance && (
            <>
              <span className="text-border">•</span>
              <div className="flex items-center gap-0.5">
                <Navigation className="w-3 h-3" />
                <span>{place.distance_km.toFixed(1)} km</span>
              </div>
            </>
          )}
          {place.is_open_now !== null && place.is_open_now !== undefined && (
            <>
              <span className="text-border">•</span>
              <div className="flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                <span className={place.is_open_now ? 'text-green-600' : 'text-red-500'}>
                  {place.is_open_now ? 'Open' : 'Closed'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Mobile: two-column layout */}
        <div className="flex sm:hidden items-start justify-between text-xs text-muted-foreground">
          <div className="space-y-0.5">
            <div className="flex items-center gap-0.5">
              <Star className="w-3.5 h-3.5 text-primary fill-primary" />
              <span className="font-medium text-foreground">{place.rating.toFixed(1)}</span>
            </div>
            {showDistance && (
              <div className="flex items-center gap-0.5">
                <Navigation className="w-3 h-3" />
                <span>{place.distance_km.toFixed(1)} km</span>
              </div>
            )}
          </div>
          {place.is_open_now !== null && place.is_open_now !== undefined && (
            <div className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              <span className={place.is_open_now ? 'text-green-600' : 'text-red-500'}>
                {place.is_open_now ? 'Open' : 'Closed'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopPickCard;
