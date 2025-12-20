import { useState } from "react";
import { Heart } from "lucide-react";
import type { Place } from "@/data/mockPlaces";
import { cn } from "@/lib/utils";

interface PlaceCardProps {
  place: Place;
  index?: number;
  variant?: "poster" | "featured";
}

const PlaceCard = ({ place, index = 0, variant = "poster" }: PlaceCardProps) => {
  const [isSaved, setIsSaved] = useState(false);

  if (variant === "featured") {
    return (
      <div 
        className="relative w-full rounded-2xl overflow-hidden shadow-card opacity-0 animate-fade-up"
        style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
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
              isSaved ? "text-primary bg-primary/20" : "text-primary-foreground/80 hover:text-primary-foreground"
            )}
            onClick={() => setIsSaved(!isSaved)}
          >
            <Heart className={cn("w-5 h-5 transition-all", isSaved && "fill-current scale-110")} />
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
        "group relative flex-shrink-0 w-28 opacity-0 animate-fade-up"
      )}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
    >
      {/* Poster Card */}
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-soft transition-all duration-300 active:scale-95">
        <img 
          src={place.image} 
          alt={place.name}
          className="w-full h-full object-cover"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
        
        {/* Save button - always visible on mobile */}
        <button
          className={cn(
            "absolute top-1.5 right-1.5 p-1.5 rounded-full backdrop-blur-sm bg-background/20 transition-all duration-300",
            isSaved && "text-primary bg-primary/20"
          )}
          onClick={(e) => {
            e.stopPropagation();
            setIsSaved(!isSaved);
          }}
        >
          <Heart className={cn("w-3.5 h-3.5", isSaved && "fill-current")} />
        </button>
        
        {/* Vibe tag */}
        <div className="absolute top-1.5 left-1.5">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-secondary/90 text-secondary-foreground text-[10px] font-medium backdrop-blur-sm">
            {place.vibeTag}
          </span>
        </div>
        
        {/* Place name */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <h3 className="text-primary-foreground font-semibold text-xs leading-tight line-clamp-2">
            {place.name}
          </h3>
          <p className="text-primary-foreground/70 text-[10px] mt-0.5 line-clamp-1">
            {place.practicalHint}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlaceCard;
