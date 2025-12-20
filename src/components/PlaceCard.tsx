import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Place } from "@/data/mockPlaces";
import { cn } from "@/lib/utils";

interface PlaceCardProps {
  place: Place;
  index?: number;
}

const PlaceCard = ({ place, index = 0 }: PlaceCardProps) => {
  const [isSaved, setIsSaved] = useState(false);

  return (
    <div 
      className={cn(
        "group relative bg-card rounded-2xl overflow-hidden shadow-soft hover:shadow-card transition-all duration-300 opacity-0 animate-fade-up",
        "hover:scale-[1.02]"
      )}
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={place.image} 
          alt={place.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
        
        {/* Save button */}
        <Button
          variant="save"
          size="icon"
          className={cn(
            "absolute top-3 right-3 backdrop-blur-sm bg-background/20",
            isSaved && "text-primary bg-primary/20"
          )}
          onClick={() => setIsSaved(!isSaved)}
        >
          <Heart className={cn("w-5 h-5 transition-all", isSaved && "fill-current scale-110")} />
        </Button>
        
        {/* Place name overlay */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-primary-foreground font-semibold text-lg leading-tight">
            {place.name}
          </h3>
        </div>
      </div>
      
      {/* Tags */}
      <div className="p-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
          {place.vibeTag}
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-warm-cream text-text-soft text-sm">
          {place.practicalHint}
        </span>
      </div>
    </div>
  );
};

export default PlaceCard;
