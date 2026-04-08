import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import TopPickCard from "./TopPickCard";
import { MockPlace } from "./PlaceCardCompact";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

interface TopPicksSectionProps {
  places: MockPlace[];
  onPlaceClick: (place: MockPlace) => void;
  toggleSave: (placeId: string) => void;
  isSaved: (placeId: string) => boolean;
  showDistance?: boolean;
}

const TopPicksSection: React.FC<TopPicksSectionProps> = ({
  places,
  onPlaceClick,
  toggleSave,
  isSaved,
  showDistance = true,
}) => {
  if (places.length === 0) return null;

  const isMobile = useIsMobile();
  const displayPlaces = places.slice(0, 4);

  return (
    <div className="mb-8 px-4 lg:px-8">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <img src="/sweetspots-logo.svg" alt="SweetSpots" className="w-5 h-5" />
        <h2 className="text-lg font-bold text-foreground">These might be your SweetSpots</h2>
      </div>

      {/* Mobile: swipeable carousel */}
      {isMobile ? (
        <Carousel
          opts={{
            align: "start",
            loop: false,
            containScroll: "trimSnaps",
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-3">
            {displayPlaces.map((place) => (
              <CarouselItem
                key={place.id}
                className={`pl-3 ${displayPlaces.length === 1 ? "basis-[90%]" : "basis-[85%]"}`}
              >
                <TopPickCard
                  place={place}
                  onSave={toggleSave}
                  isSaved={isSaved(place.id)}
                  onClick={() => onPlaceClick(place)}
                  showDistance={showDistance}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      ) : (
        /* Desktop/Tablet: grid layout */
        <div className={cn(
          "grid gap-3 lg:gap-5",
          displayPlaces.length === 1 && "grid-cols-1 max-w-md",
          displayPlaces.length === 2 && "grid-cols-2 max-w-2xl",
          displayPlaces.length === 3 && "grid-cols-2 sm:grid-cols-3 max-w-4xl",
          displayPlaces.length >= 4 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
        )}>
          {displayPlaces.map((place) => (
            <TopPickCard
              key={place.id}
              place={place}
              onSave={toggleSave}
              isSaved={isSaved(place.id)}
              onClick={() => onPlaceClick(place)}
              showDistance={showDistance}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TopPicksSection;
