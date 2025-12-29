import { useState } from "react";
import { Star, Heart, Clock, MapPin } from "lucide-react";
import { DiscoveredPlace } from "@/hooks/useDiscoverySection";

interface PlaceCardCompactProps {
  place: DiscoveredPlace;
  onSave: (placeId: string) => void;
  isSaved: boolean;
  onClick: () => void;
  featured?: boolean;
}

// Format ETA
const formatEta = (seconds: number | null): string => {
  if (seconds === null) return '';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// Get vibe tag from categories
const getVibeTag = (categories: string[] | null): string | null => {
  if (!categories || categories.length === 0) return null;
  const vibeKeywords = ['Hidden Gem', 'Chill', 'Group-friendly', 'Romantic', 'Family', 'Trendy'];
  const category = categories[0];
  // Simple mapping
  if (category.toLowerCase().includes('bar') || category.toLowerCase().includes('club')) return 'Nightlife';
  if (category.toLowerCase().includes('cafe') || category.toLowerCase().includes('coffee')) return 'Chill';
  if (category.toLowerCase().includes('restaurant')) return 'Group-friendly';
  return null;
};

// Get price display
const getPriceDisplay = (place: DiscoveredPlace): string => {
  // Use rating as proxy for price level if not available
  const priceLevel = Math.min(4, Math.max(1, Math.round((place.rating || 4) / 1.5)));
  return '$'.repeat(priceLevel);
};

const PlaceCardCompact: React.FC<PlaceCardCompactProps> = ({ 
  place, 
  onSave, 
  isSaved, 
  onClick, 
  featured = false 
}) => {
  const [imageError, setImageError] = useState(false);

  const getPlaceholderImage = () => {
    const category = place.categories?.[0]?.toLowerCase() || 'restaurant';
    return `https://source.unsplash.com/400x300/?${category},food&${place.name.slice(0, 3)}`;
  };

  const imageUrl = place.photo_url || getPlaceholderImage();
  const vibeTag = getVibeTag(place.categories);

  return (
    <div 
      className={`flex-shrink-0 cursor-pointer group ${featured ? 'w-[200px]' : 'w-[160px]'}`}
      onClick={onClick}
    >
      {/* Image Container */}
      <div className={`relative rounded-2xl overflow-hidden bg-muted ${featured ? 'aspect-[4/3]' : 'aspect-[3/4]'}`}>
        <img
          src={imageError ? getPlaceholderImage() : imageUrl}
          alt={place.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImageError(true)}
        />

        {/* Save button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave(place.place_id);
          }}
          className="absolute top-2 right-2 p-2 bg-card/90 backdrop-blur-sm rounded-full shadow-soft transition-transform hover:scale-110"
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
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
            <span className="font-medium text-foreground">{place.rating?.toFixed(1) || '4.5'}</span>
          </div>

          <span className="text-border">•</span>

          {/* Price */}
          <span className="text-primary font-medium">{getPriceDisplay(place)}</span>

          <span className="text-border">•</span>

          {/* Distance/Time */}
          <div className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            <span>{place.eta_seconds ? formatEta(place.eta_seconds) : '10 min'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceCardCompact;
