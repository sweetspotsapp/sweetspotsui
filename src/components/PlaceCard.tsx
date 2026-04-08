import { useState, useEffect } from "react";
import { Heart, Clock, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { getStoragePhotoUrl, getEdgeFunctionPhotoUrl } from "@/lib/photoLoader";
import type { RankedPlace } from "@/hooks/useSearch";

interface PlaceCardProps {
  place: RankedPlace;
  index?: number;
  variant?: "poster" | "featured";
  onClick?: () => void;
}

// Build photo URL — use storage URL directly, let <img> onError handle fallback
const getPhotoUrl = (photoName: string | null, maxWidth = 400, maxHeight = 600): string | null => {
  if (!photoName) return null;
  return getStoragePhotoUrl(photoName, maxWidth, maxHeight);
};

// Fallback placeholder image
const getPlaceholderImage = (name: string, categories?: string[] | null): string => {
  const category = categories?.[0] || "place";
  const encoded = encodeURIComponent(`${category} ${name}`);
  return `https://source.unsplash.com/400x600/?${encoded}`;
};

// Format ETA to human readable
const formatEta = (seconds: number | null): string => {
  if (seconds === null) return "";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
};

// Format distance to human readable
const formatDistance = (meters: number | null): string => {
  if (meters === null) return "";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

// Get vibe tag from categories
const getVibeTag = (categories: string[] | null): string => {
  if (!categories || categories.length === 0) return "Spot";
  const category = categories[0];
  // Clean up Google Places category format
  return category.replace(/_/g, " ").split(" ")[0];
};

const PlaceCard = ({ place, index = 0, variant = "poster", onClick }: PlaceCardProps) => {
  const { isSaved, toggleSave } = useApp();
  const saved = isSaved(place.place_id);
  const [imgSrc, setImgSrc] = useState<string | null>(() => getPhotoUrl(place.photo_name));
  const [triedEdge, setTriedEdge] = useState(false);
  const [imgError, setImgError] = useState(false);
  
  const placeholderUrl = getPlaceholderImage(place.name, place.categories);
  const imageUrl = (!imgError && imgSrc) ? imgSrc : placeholderUrl;
  
  const vibeTag = getVibeTag(place.categories);
  
  const handleImgError = () => {
    if (!triedEdge && place.photo_name) {
      setImgSrc(getEdgeFunctionPhotoUrl(place.photo_name, 400, 600));
      setTriedEdge(true);
    } else {
      setImgError(true);
    }
  };

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleSave(place.place_id);
  };

  if (variant === "featured") {
    return (
      <div 
        className="relative w-full rounded-2xl overflow-hidden shadow-card opacity-0 animate-fade-up cursor-pointer active:scale-[0.98] transition-transform"
        style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
        onClick={onClick}
      >
        {/* Featured Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img 
            src={imageUrl} 
            alt={place.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={handleImgError}
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />
          
          {/* Save button */}
          <button
            className={cn(
              "absolute top-3 right-3 w-5 h-5 flex items-center justify-center rounded-full backdrop-blur-md bg-background/20 transition-all duration-300",
              saved ? "text-primary bg-primary/20" : "text-primary-foreground/80 hover:text-primary-foreground"
            )}
            onClick={handleSaveClick}
          >
            <Heart className={cn("w-3.5 h-3.5 transition-all", saved && "fill-current scale-110")} />
          </button>
          
          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            <div className="flex gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium backdrop-blur-sm capitalize">
                {vibeTag}
              </span>
              {place.eta_seconds && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-background/30 text-primary-foreground text-xs backdrop-blur-sm">
                  <Clock className="w-3 h-3" />
                  {formatEta(place.eta_seconds)}
                </span>
              )}
            </div>
            <h3 className="text-primary-foreground font-bold text-xl leading-tight">
              {place.name}
            </h3>
            {place.why && (
              <p className="text-primary-foreground/80 text-sm">
                {place.why}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "group relative flex-shrink-0 w-36 opacity-0 animate-fade-up cursor-pointer"
      )}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
      onClick={onClick}
    >
      {/* Poster Card - Vertical Rectangle */}
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-soft transition-all duration-300 active:scale-95 bg-muted">
        <img 
          src={imageUrl} 
          alt={place.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={handleImgError}
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/30 to-transparent" />
        
        {/* Save button */}
        <button
          className={cn(
            "absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center rounded-full backdrop-blur-md bg-background/25 transition-all duration-300",
            saved && "text-primary bg-primary/25"
          )}
          onClick={handleSaveClick}
        >
          <Heart className={cn("w-4 h-4", saved && "fill-current")} />
        </button>
        
        {/* Vibe tag */}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary/90 text-secondary-foreground text-[11px] font-medium backdrop-blur-sm capitalize">
            {vibeTag}
          </span>
        </div>
        
        {/* Place info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
          <h3 className="text-primary-foreground font-semibold text-sm leading-tight line-clamp-2">
            {place.name}
          </h3>
          <div className="flex items-center gap-2 text-primary-foreground/80 text-[11px]">
            {place.eta_seconds && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {formatEta(place.eta_seconds)}
              </span>
            )}
            {place.distance_meters && (
              <span className="flex items-center gap-0.5">
                <Navigation className="w-3 h-3" />
                {formatDistance(place.distance_meters)}
              </span>
            )}
          </div>
          {place.rating && (
            <p className="text-primary-foreground/70 text-[10px]">
              ★ {place.rating.toFixed(1)} {place.ratings_total ? `(${place.ratings_total})` : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaceCard;
