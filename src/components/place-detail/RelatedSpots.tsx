import { Star, Navigation, Sparkles } from 'lucide-react';

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
    <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">Similar vibes you'll love</h3>
      </div>
      
      {/* Horizontal Scroll */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {places.map((place, i) => (
          <button
            key={place.id}
            onClick={() => onPlaceClick(place.id)}
            className="flex-shrink-0 w-36 group transition-all duration-300 hover:scale-[1.02]"
            style={{ animationDelay: `${0.3 + i * 0.05}s` }}
          >
            {/* Image */}
            <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden mb-2">
              <img
                src={place.image}
                alt={place.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400';
                }}
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Rating badge */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg">
                <Star className="w-3 h-3 text-primary fill-primary" />
                <span className="text-xs font-semibold text-foreground">{place.rating}</span>
              </div>
            </div>
            
            {/* Info */}
            <div className="space-y-1 text-left">
              <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {place.name}
              </p>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Navigation className="w-3 h-3" />
                <span className="text-xs">{place.distance} km</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RelatedSpots;
