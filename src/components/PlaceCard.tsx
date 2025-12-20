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
        className="relative w-full rounded-3xl overflow-hidden shadow-card opacity-0 animate-fade-up"
        style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
      >
        {/* Featured Image */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <img 
            src={place.image} 
            alt={place.name}
            className="w-full h-full object-cover"
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
          
          {/* Save button */}
          <button
            className={cn(
              "absolute top-4 right-4 p-3 rounded-full backdrop-blur-md bg-background/20 transition-all duration-300",
              isSaved ? "text-primary bg-primary/20" : "text-primary-foreground/80 hover:text-primary-foreground"
            )}
            onClick={() => setIsSaved(!isSaved)}
          >
            <Heart className={cn("w-6 h-6 transition-all", isSaved && "fill-current scale-110")} />
          </button>
          
          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2">
            <div className="flex gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/90 text-primary-foreground text-sm font-medium backdrop-blur-sm">
                {place.vibeTag}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-background/30 text-primary-foreground text-sm backdrop-blur-sm">
                {place.practicalHint}
              </span>
            </div>
            <h3 className="text-primary-foreground font-bold text-2xl leading-tight">
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
        "group relative flex-shrink-0 w-36 opacity-0 animate-fade-up"
      )}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}
    >
      {/* Poster Card */}
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-soft transition-all duration-300 group-hover:shadow-card group-hover:scale-[1.03]">
        <img 
          src={place.image} 
          alt={place.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />
        
        {/* Save button */}
        <button
          className={cn(
            "absolute top-2 right-2 p-2 rounded-full backdrop-blur-sm bg-background/20 transition-all duration-300 opacity-0 group-hover:opacity-100",
            isSaved && "opacity-100 text-primary bg-primary/20"
          )}
          onClick={(e) => {
            e.stopPropagation();
            setIsSaved(!isSaved);
          }}
        >
          <Heart className={cn("w-4 h-4 transition-all", isSaved && "fill-current")} />
        </button>
        
        {/* Vibe tag */}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary/90 text-secondary-foreground text-xs font-medium backdrop-blur-sm">
            {place.vibeTag}
          </span>
        </div>
        
        {/* Place name */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-primary-foreground font-semibold text-sm leading-tight line-clamp-2">
            {place.name}
          </h3>
          <p className="text-primary-foreground/70 text-xs mt-1">
            {place.practicalHint}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlaceCard;
