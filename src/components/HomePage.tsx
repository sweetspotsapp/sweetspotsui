import { ChevronRight, MapPin, RotateCcw, LogOut } from "lucide-react";
import PlaceCard from "./PlaceCard";
import PlaceDetail from "./PlaceDetail";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import type { RankedPlace } from "@/hooks/useSearch";

interface PlaceRowProps {
  title: string;
  subtitle?: string;
  places: RankedPlace[];
  startIndex?: number;
  onPlaceClick: (place: RankedPlace) => void;
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
        <div key={place.place_id} className="snap-start">
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
  const { userMood, userVibes, resetOnboarding, rankedPlaces } = useApp();
  const { signOut } = useAuth();
  const [selectedPlace, setSelectedPlace] = useState<RankedPlace | null>(null);
  
  const featuredPlace = rankedPlaces[0];
  const topPicks = rankedPlaces.slice(1, 6);
  const explorePlaces = rankedPlaces.slice(6, 12);
  const morePlaces = rankedPlaces.slice(12, 20);

  const handleSignOut = async () => {
    await signOut();
  };

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
            <button
              onClick={handleSignOut}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </header>

        <div className="space-y-5 pt-4">
          {/* Featured Pick */}
          {featuredPlace && (
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
          )}

          {/* Top Picks Row */}
          {topPicks.length > 0 && (
            <PlaceRow 
              title="More picks for you" 
              places={topPicks}
              startIndex={1}
              onPlaceClick={setSelectedPlace}
            />
          )}

          {/* Understanding Section */}
          <section className="px-4 opacity-0 animate-fade-up" style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}>
            <div className="bg-card rounded-xl p-3.5 border border-border shadow-soft space-y-2.5">
              <h2 className="text-sm font-semibold text-foreground">
                Your current vibe
              </h2>
              
              {userMood && (
                <p className="text-xs text-muted-foreground italic">
                  "{userMood}"
                </p>
              )}
              
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

              <button 
                onClick={resetOnboarding}
                className="flex items-center gap-1 text-primary text-xs font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                Change what you're looking for
              </button>
            </div>
          </section>

          {/* Exploration Row */}
          {explorePlaces.length > 0 && (
            <PlaceRow 
              title="Worth checking out" 
              subtitle="Popular right now near you"
              places={explorePlaces}
              startIndex={6}
              onPlaceClick={setSelectedPlace}
            />
          )}

          {/* Additional discovery row */}
          {morePlaces.length > 0 && (
            <PlaceRow 
              title="You might also like" 
              places={morePlaces}
              startIndex={12}
              onPlaceClick={setSelectedPlace}
            />
          )}

          {/* Empty state */}
          {rankedPlaces.length === 0 && (
            <div className="px-4 py-12 text-center">
              <p className="text-muted-foreground">No places found yet.</p>
              <button 
                onClick={resetOnboarding}
                className="mt-2 text-primary text-sm font-medium"
              >
                Try a new search
              </button>
            </div>
          )}
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
