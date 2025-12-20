import { Heart, MapPin } from "lucide-react";
import { useApp } from "@/context/AppContext";
import PlaceCard from "./PlaceCard";
import PlaceDetail from "./PlaceDetail";
import { useState } from "react";
import type { Place } from "@/data/mockPlaces";

const SavedPage = () => {
  const { savedPlaces } = useApp();
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  return (
    <>
      <div className="min-h-screen bg-background pb-20 max-w-md mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/40">
          <div className="px-4 py-3">
            <h1 className="text-lg font-bold text-foreground">Saved Spots</h1>
            <p className="text-xs text-muted-foreground">Places you want to remember</p>
          </div>
        </header>

        <div className="p-4">
          {savedPlaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Heart className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1">No saved spots yet</h2>
              <p className="text-sm text-muted-foreground max-w-[250px]">
                Tap the heart on any place to save it here for later.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {savedPlaces.length} saved spot{savedPlaces.length !== 1 ? 's' : ''}
              </p>
              
              <div className="grid grid-cols-1 gap-3">
                {savedPlaces.map((place, index) => (
                  <div 
                    key={place.id}
                    className="flex gap-3 p-3 bg-card rounded-xl border border-border shadow-soft cursor-pointer active:scale-[0.98] transition-transform opacity-0 animate-fade-up"
                    style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}
                    onClick={() => setSelectedPlace(place)}
                  >
                    <img 
                      src={place.image} 
                      alt={place.name}
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 py-0.5">
                      <h3 className="font-semibold text-foreground text-sm line-clamp-1">{place.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{place.practicalHint}</p>
                      <div className="flex gap-1.5 mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium">
                          {place.vibeTag}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-warm-cream text-text-soft text-[10px]">
                          {place.category}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedPlace && (
        <PlaceDetail 
          place={selectedPlace} 
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </>
  );
};

export default SavedPage;
