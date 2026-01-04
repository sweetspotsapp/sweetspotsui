import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Star, Heart, Navigation, Sparkles } from "lucide-react";
import { MockPlace } from "./PlaceCardCompact";

interface TopPickCardProps {
  place: MockPlace;
  onSave: (placeId: string) => void;
  isSaved: boolean;
  onClick: () => void;
}

const getVibeTag = (place: MockPlace): string | null => {
  if (place.ai_category) {
    return place.ai_category.charAt(0).toUpperCase() + place.ai_category.slice(1);
  }
  if (place.vibeTag) return place.vibeTag;
  if (!place.categories || place.categories.length === 0) return null;
  const category = place.categories[0];
  if (category.toLowerCase().includes('bar') || category.toLowerCase().includes('club')) return 'Nightlife';
  if (category.toLowerCase().includes('cafe') || category.toLowerCase().includes('coffee')) return 'Chill';
  if (category.toLowerCase().includes('restaurant')) return 'Restaurant';
  return category.replace(/_/g, ' ').split(' ')[0];
};

const TopPickCard: React.FC<TopPickCardProps> = ({ 
  place, 
  onSave, 
  isSaved, 
  onClick 
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
        className="relative rounded-2xl overflow-hidden bg-muted aspect-[3/4] shadow-lg"
      >
        <img
          src={imageError ? getPlaceholderImage() : imageUrl}
          alt={place.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImageError(true)}
        />

        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Top Pick badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full shadow-md">
            <Sparkles className="w-3 h-3" />
            Top Pick
          </span>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className={`absolute top-3 right-3 p-2.5 bg-card/90 backdrop-blur-sm rounded-full shadow-lg transition-all duration-200 hover:scale-110 ${
            isSaved ? 'animate-pulse-once' : ''
          }`}
        >
          <Heart 
            className={`w-5 h-5 transition-all duration-200 ${
              isSaved ? 'fill-primary text-primary scale-110' : 'text-muted-foreground'
            }`} 
          />
        </button>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {/* Vibe tag */}
          {vibeTag && (
            <span className="inline-block px-2.5 py-1 bg-card/90 backdrop-blur-sm text-xs font-medium text-foreground rounded-full mb-2">
              {vibeTag}
            </span>
          )}
          
          <h3 className="font-bold text-white text-base line-clamp-2 mb-1.5 drop-shadow-md">
            {place.name}
          </h3>
          
          <div className="flex items-center gap-3 text-sm text-white/90">
            {/* Rating */}
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-semibold">{place.rating.toFixed(1)}</span>
            </div>

            {/* Distance */}
            <div className="flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5" />
              <span>{place.distance_km.toFixed(1)} km</span>
            </div>
          </div>

          {/* AI Reason preview */}
          {place.ai_reason && (
            <p className="text-xs text-white/80 mt-2 line-clamp-2 leading-relaxed">
              {place.ai_reason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopPickCard;
