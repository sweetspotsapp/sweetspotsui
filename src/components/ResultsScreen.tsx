import { ArrowLeft, Pencil, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlaceCard from "./PlaceCard";
import { primaryPlaces, explorationPlaces, extractVibes } from "@/data/mockPlaces";

interface ResultsScreenProps {
  mood: string;
  onBack: () => void;
  isVague: boolean;
}

interface PlaceRowProps {
  title: string;
  subtitle?: string;
  places: typeof primaryPlaces;
  startIndex?: number;
}

const PlaceRow = ({ title, subtitle, places, startIndex = 0 }: PlaceRowProps) => (
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
    
    {/* Horizontal scroll container - optimized for mobile */}
    <div 
      className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-hide" 
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      {places.map((place, index) => (
        <div key={place.id} className="snap-start">
          <PlaceCard place={place} index={startIndex + index} variant="poster" />
        </div>
      ))}
    </div>
  </section>
);

const ResultsScreen = ({ mood, onBack, isVague }: ResultsScreenProps) => {
  const vibes = extractVibes(mood);
  const featuredPlace = primaryPlaces[0];
  const remainingPrimary = primaryPlaces.slice(1);

  return (
    <div className="min-h-screen bg-background pb-6 max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/40">
        <div className="px-3 py-2.5 flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="rounded-full h-9 w-9"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-xs text-muted-foreground truncate flex-1 line-clamp-1">
            "{mood}"
          </span>
        </div>
      </header>

      <div className="space-y-5 pt-4">
        {/* Vague input message */}
        {isVague && (
          <div className="mx-4 bg-warm-cream rounded-xl p-3 border border-border animate-fade-up">
            <p className="text-muted-foreground text-center text-xs">
              No worries — we'll start simple.
            </p>
          </div>
        )}

        {/* Featured Pick */}
        <section className="px-4 space-y-2 opacity-0 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Our top pick for you
            </h2>
            <p className="text-[11px] text-muted-foreground">Based on what you said</p>
          </div>
          <PlaceCard place={featuredPlace} index={0} variant="featured" />
        </section>

        {/* Primary Picks Row */}
        <PlaceRow 
          title="More picks for you" 
          places={remainingPrimary}
          startIndex={1}
        />

        {/* Understanding Section */}
        <section className="px-4 opacity-0 animate-fade-up" style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}>
          <div className="bg-card rounded-xl p-3.5 border border-border shadow-soft space-y-2.5">
            <h2 className="text-sm font-semibold text-foreground">
              Here's what we picked up
            </h2>
            
            <div>
              <p className="text-[11px] text-muted-foreground mb-2">
                Sounds like you're looking for:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {vibes.map((vibe, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium"
                  >
                    {vibe}
                  </span>
                ))}
              </div>
            </div>

            <button className="flex items-center gap-1 text-primary text-xs font-medium">
              <Pencil className="w-3 h-3" />
              Not quite right? Edit this.
            </button>
          </div>
        </section>

        {/* Exploration Row */}
        <PlaceRow 
          title="Worth checking out" 
          subtitle="Popular right now near you"
          places={explorationPlaces}
          startIndex={5}
        />

        {/* Additional discovery row */}
        <PlaceRow 
          title="You might also like" 
          places={[...explorationPlaces].reverse()}
          startIndex={8}
        />
      </div>
    </div>
  );
};

export default ResultsScreen;
