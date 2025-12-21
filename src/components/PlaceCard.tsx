import { useState } from "react";
import { Heart } from "lucide-react";
import type { Place } from "@/data/mockPlaces";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

interface PlaceCardProps {
  place: Place;
  index?: number;
  variant?: "poster" | "featured";
  onClick?: () => void;
}

const PlaceCard = ({ place, index = 0, variant = "poster", onClick }: PlaceCardProps) => {
  const { isSaved, toggleSave } = useApp();
  const saved = isSaved(place.id);

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSave(place);
  };

  if (variant === "featured") {
    return (
      <div 
        className="relative w-full rounded-2xl overflow-hidden shadow-card opacity-0 animate-fade-up cursor-pointer active:scale-[0.98] transition-transform"
        style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
        onClick={onClick}
      >
        {/* Featured Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img 
            src={place.image} 
            alt={place.name}
            className="w-full h-full object-cover"
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />
          
          {/* Save button */}
          <button
            className={cn(
              "absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md bg-background/20 transition-all duration-300",
              saved ? "text-primary bg-primary/20" : "text-primary-foreground/80 hover:text-primary-foreground"
            )}
            onClick={handleSaveClick}
          >
            <Heart className={cn("w-5 h-5 transition-all", saved && "fill-current scale-110")} />
          </button>
          
          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            <div className="flex gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/90 text-primary-foreground text-xs font-medium backdrop-blur-sm">
                {place.vibeTag}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-background/30 text-primary-foreground text-xs backdrop-blur-sm">
                {place.practicalHint}
              </span>
            </div>
            <h3 className="text-primary-foreground font-bold text-xl leading-tight">
              {place.name}
            </h3>
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
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-soft transition-all duration-300 active:scale-95">
        <img 
          src={place.image} 
          alt={place.name}
          className="w-full h-full object-cover"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/30 to-transparent" />
        
        {/* Save button */}
        <button
          className={cn(
            "absolute top-2 right-2 p-2 rounded-full backdrop-blur-md bg-background/25 transition-all duration-300",
            saved && "text-primary bg-primary/25"
          )}
          onClick={handleSaveClick}
        >
          <Heart className={cn("w-4 h-4", saved && "fill-current")} />
        </button>
        
        {/* Vibe tag */}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary/90 text-secondary-foreground text-[11px] font-medium backdrop-blur-sm">
            {place.vibeTag}
          </span>
        </div>
        
        {/* Place info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
          <h3 className="text-primary-foreground font-semibold text-sm leading-tight line-clamp-2">
            {place.name}
          </h3>
          <p className="text-primary-foreground/80 text-[11px] line-clamp-1">
            {place.practicalHint}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlaceCard;
