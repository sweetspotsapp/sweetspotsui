import { X, Heart, MapPin, Clock, Star, Sparkles, Navigation, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useApp } from "@/context/AppContext";
import type { RankedPlace } from "@/hooks/useSearch";

interface PlaceDetailProps {
  place: RankedPlace;
  onClose: () => void;
  userMood?: string;
}

// Generate a placeholder image based on place name
const getPlaceholderImage = (name: string, categories?: string[] | null): string => {
  const category = categories?.[0] || "place";
  const encoded = encodeURIComponent(`${category} ${name}`);
  return `https://source.unsplash.com/800x600/?${encoded}`;
};

// Format ETA to human readable
const formatEta = (seconds: number | null): string => {
  if (seconds === null) return "Unknown";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
};

// Format distance to human readable
const formatDistance = (meters: number | null): string => {
  if (meters === null) return "Unknown";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

// Get vibe tag from categories
const getVibeTag = (categories: string[] | null): string => {
  if (!categories || categories.length === 0) return "Spot";
  return categories[0].replace(/_/g, " ").split(" ")[0];
};

const PlaceDetail = ({ place, onClose, userMood }: PlaceDetailProps) => {
  const { isSaved, toggleSave } = useApp();
  const saved = isSaved(place.place_id);
  const imageUrl = getPlaceholderImage(place.name, place.categories);
  const vibeTag = getVibeTag(place.categories);

  const openInMaps = () => {
    if (place.lat && place.lng) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}&query_place_id=${place.place_id}`,
        "_blank"
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Image */}
      <div className="relative h-[42vh] min-h-[300px] overflow-hidden bg-muted">
        <img 
          src={imageUrl} 
          alt={place.name}
          className="w-full h-full object-cover"
        />
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2.5 rounded-full bg-background/90 backdrop-blur-sm text-foreground shadow-card"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Save button */}
        <button
          onClick={() => toggleSave(place.place_id)}
          className={cn(
            "absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-sm shadow-card transition-all",
            saved 
              ? "bg-primary text-primary-foreground" 
              : "bg-background/90 text-foreground"
          )}
        >
          <Heart className={cn("w-5 h-5", saved && "fill-current")} />
        </button>
      </div>

      {/* Place Header */}
      <div className="px-4 pt-4 pb-2 border-b border-border">
        <div className="flex gap-2 mb-2 flex-wrap">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium capitalize">
            {vibeTag}
          </span>
          {place.rating && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
              <Star className="w-3 h-3 fill-current" />
              {place.rating.toFixed(1)}
              {place.ratings_total && <span className="opacity-70">({place.ratings_total})</span>}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground">{place.name}</h1>
        {place.address && (
          <p className="text-sm text-muted-foreground mt-1">{place.address}</p>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-5 pb-28">
        {/* Quick info */}
        <section className="flex gap-2 flex-wrap">
          {place.eta_seconds && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatEta(place.eta_seconds)}</span>
            </div>
          )}
          {place.distance_meters && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-card border border-border text-foreground text-xs">
              <Navigation className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{formatDistance(place.distance_meters)}</span>
            </div>
          )}
          {place.score && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-card border border-border text-foreground text-xs">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Score: {Math.round(place.score * 100)}%</span>
            </div>
          )}
        </section>

        {/* Why this place section */}
        {place.why && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Why we picked this</h2>
            </div>
            
            <div className="p-3 rounded-xl bg-card border border-border">
              <p className="text-sm text-foreground">{place.why}</p>
            </div>
          </section>
        )}

        {/* Categories */}
        {place.categories && place.categories.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Categories</h2>
            <div className="flex flex-wrap gap-1.5">
              {place.categories.slice(0, 6).map((category, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium capitalize"
                >
                  {category.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
        <div className="max-w-md mx-auto flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 h-12 rounded-xl"
            onClick={() => toggleSave(place.place_id)}
          >
            <Heart className={cn("w-5 h-5 mr-2", saved && "fill-current text-primary")} />
            {saved ? "Saved" : "Save"}
          </Button>
          <Button 
            variant="primary" 
            className="flex-1 h-12 rounded-xl"
            onClick={openInMaps}
          >
            <MapPin className="w-5 h-5 mr-2" />
            Take me there
            <ExternalLink className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlaceDetail;
