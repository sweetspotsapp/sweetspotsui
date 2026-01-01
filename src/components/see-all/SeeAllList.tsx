import { useEffect, useRef } from "react";
import { Star, Heart, Navigation } from "lucide-react";
import { MockPlace } from "@/components/PlaceCardCompact";

interface SeeAllListProps {
  places: MockPlace[];
  selectedId: string | null;
  onCardClick: (placeId: string) => void;
  onSave: (placeId: string) => void;
  isSaved: (placeId: string) => boolean;
  onNavigate: (place: MockPlace) => void;
}

const SeeAllList: React.FC<SeeAllListProps> = ({
  places,
  selectedId,
  onCardClick,
  onSave,
  isSaved,
  onNavigate,
}) => {
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scroll to selected card when pin is clicked
  useEffect(() => {
    if (selectedId) {
      const cardElement = cardRefs.current.get(selectedId);
      if (cardElement) {
        cardElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [selectedId]);

  const getPlaceholderImage = (name: string) => {
    return `https://source.unsplash.com/400x300/?restaurant,food&${name.slice(0, 3)}`;
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      {places.map((place) => {
        const isSelected = place.id === selectedId;
        const saved = isSaved(place.id);
        const imageUrl = place.image || getPlaceholderImage(place.name);

        return (
          <div
            key={place.id}
            ref={(el) => {
              if (el) cardRefs.current.set(place.id, el);
            }}
            className={`flex gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
              isSelected
                ? "bg-primary/10 border-2 border-primary shadow-lg"
                : "bg-card border border-border hover:border-primary/50"
            }`}
            onClick={() => onCardClick(place.id)}
          >
            {/* Image */}
            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={imageUrl}
                alt={place.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getPlaceholderImage(place.name);
                }}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm line-clamp-1">
                {place.name}
              </h3>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <div className="flex items-center gap-0.5">
                  <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                  <span className="font-medium text-foreground">
                    {place.rating.toFixed(1)}
                  </span>
                </div>
                <span className="text-border">•</span>
                <div className="flex items-center gap-0.5">
                  <Navigation className="w-3 h-3" />
                  <span>{place.distance_km.toFixed(1)} km</span>
                </div>
              </div>

              {/* AI reason */}
              {place.ai_reason && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {place.ai_reason}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col items-center justify-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSave(place.id);
                }}
                className="p-2 bg-secondary/80 backdrop-blur-sm rounded-full transition-all hover:scale-110"
              >
                <Heart
                  className={`w-4 h-4 ${
                    saved ? "fill-primary text-primary" : "text-muted-foreground"
                  }`}
                />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(place);
                }}
                className="text-xs text-primary font-medium hover:underline"
              >
                View
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SeeAllList;
