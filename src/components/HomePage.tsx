import { ChevronRight, MapPin, Pencil } from "lucide-react";
import PlaceCard from "./PlaceCard";
import PlaceDetail from "./PlaceDetail";
import { primaryPlaces, explorationPlaces, extractVibes } from "@/data/mockPlaces";
import { useApp } from "@/context/AppContext";
import { useState } from "react";
import type { Place } from "@/data/mockPlaces";

interface PlaceRowProps {
  title: string;
  subtitle?: string;
  places: typeof primaryPlaces;
  startIndex?: number;
  onPlaceClick: (place: Place) => void;
}

const PlaceRow = ({ title, subtitle, places, startIndex = 0, onPlaceClick }: PlaceRowProps) => (
  <section className="space-y-2.5">
    <div className="px-4 flex items-center justify-between">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      <button className="flex items-center gap-0.5 text-xs text-primary font-medium">
        See all
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
    
    <div 
      className="flex gap-2.5 overflow-x-auto px-4 pb-1 snap-x snap-mandatory" 
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      {places.map((place, index) => (
        <div key={place.id} className="snap-start">
          <PlaceCard 
            place={place} 
            index={startIndex + index} 
            variant="poster"
            onClick={() => onPlaceClick(place)}
          />
        </div>
      ))}
    </div>
  </section>
);

const HomePage = () => {
  const { userMood, userVibes } = useApp();
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  
  const vibes = extractVibes(userMood);
  const featuredPlace = primaryPlaces[0];
  const remainingPrimary = primaryPlaces.slice(1);

  return (
    <>
      <div className="min-h-screen bg-background pb-20 max-w-md mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/40">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <span className="text-base font-semibold text-primary">Sweetspots</span>
            </div>
          </div>
        </header>

        <div className="space-y-5 pt-4">
          {/* Featured Pick */}
          <section className="px-4 space-y-2 opacity-0 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Our top pick for you
              </h2>
              <p className="text-[11px] text-muted-foreground">Based on your vibe</p>
            </div>
            <PlaceCard 
              place={featuredPlace} 
              index={0} 
              variant="featured"
              onClick={() => setSelectedPlace(featuredPlace)}
            />
          </section>

          {/* Primary Picks Row */}
          <PlaceRow 
            title="More picks for you" 
            places={remainingPrimary}
            startIndex={1}
            onPlaceClick={setSelectedPlace}
          />

          {/* Understanding Section */}
          <section className="px-4 opacity-0 animate-fade-up" style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}>
            <div className="bg-card rounded-xl p-3.5 border border-border shadow-soft space-y-2.5">
              <h2 className="text-sm font-semibold text-foreground">
                Your current vibe
              </h2>
              
              <div className="flex flex-wrap gap-1.5">
                {userVibes.map((vibe, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium"
                  >
                    {vibe}
                  </span>
                ))}
              </div>

              <button className="flex items-center gap-1 text-primary text-xs font-medium">
                <Pencil className="w-3 h-3" />
                Change what you're looking for
              </button>
            </div>
          </section>

          {/* Exploration Row */}
          <PlaceRow 
            title="Worth checking out" 
            subtitle="Popular right now near you"
            places={explorationPlaces}
            startIndex={5}
            onPlaceClick={setSelectedPlace}
          />

          {/* Additional discovery row */}
          <PlaceRow 
            title="You might also like" 
            places={[...explorationPlaces].reverse()}
            startIndex={8}
            onPlaceClick={setSelectedPlace}
          />
        </div>
      </div>

      {/* Place Detail Modal */}
      {selectedPlace && (
        <PlaceDetail 
          place={selectedPlace} 
          onClose={() => setSelectedPlace(null)}
          userMood={userMood}
        />
      )}
    </>
  );
};

export default HomePage;
