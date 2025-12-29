import { Star, Navigation } from 'lucide-react';

interface RelatedPlace {
  id: string;
  name: string;
  image: string;
  rating: number;
  distance: number;
}

interface RelatedSpotsProps {
  places: RelatedPlace[];
  onPlaceClick: (id: string) => void;
}

const RelatedSpots = ({ places, onPlaceClick }: RelatedSpotsProps) => {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground">Similar Vibes Nearby</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {places.map((place) => (
          <button
            key={place.id}
            onClick={() => onPlaceClick(place.id)}
            className="flex-shrink-0 w-32 group"
          >
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2 bg-muted">
              <img
                src={place.image}
                alt={place.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://source.unsplash.com/400x500/?restaurant,cafe`;
                }}
              />
            </div>
            <h4 className="font-medium text-sm text-foreground truncate text-left">{place.name}</h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-primary text-primary" />
                <span>{place.rating}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <Navigation className="w-3 h-3" />
                <span>{place.distance} km</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RelatedSpots;
