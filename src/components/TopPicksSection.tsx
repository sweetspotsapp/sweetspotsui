import { Sparkles } from "lucide-react";
import TopPickCard from "./TopPickCard";
import { MockPlace } from "./PlaceCardCompact";

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

  return (
    <div className="mb-8 px-4 lg:px-8">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Top Picks for You</h2>
      </div>

      {/* Cards — 2 on mobile, up to 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {places.slice(0, 4).map((place) => (
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
    </div>
  );
};

export default TopPicksSection;
