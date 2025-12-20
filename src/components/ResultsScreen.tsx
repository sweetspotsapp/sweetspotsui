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
  <section className="space-y-3">
    <div className="px-4 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <button className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
        See all
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
    
    {/* Horizontal scroll container */}
    <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {places.map((place, index) => (
        <PlaceCard key={place.id} place={place} index={startIndex + index} variant="poster" />
      ))}
    </div>
  </section>
);

const ResultsScreen = ({ mood, onBack, isVague }: ResultsScreenProps) => {
  const vibes = extractVibes(mood);
  const featuredPlace = primaryPlaces[0];
  const remainingPrimary = primaryPlaces.slice(1);

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="rounded-full h-10 w-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm text-muted-foreground truncate flex-1">
            "{mood}"
          </span>
        </div>
      </header>

      <div className="space-y-6 pt-4">
        {/* Vague input message */}
        {isVague && (
          <div className="mx-4 bg-warm-cream rounded-2xl p-4 border border-border animate-fade-up">
            <p className="text-muted-foreground text-center text-sm">
              No worries — we'll start simple.
            </p>
          </div>
        )}

        {/* Featured Pick */}
        <section className="px-4 space-y-3 opacity-0 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Our top pick for you
            </h2>
            <p className="text-xs text-muted-foreground">Based on what you said</p>
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
        <section className="px-4 opacity-0 animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
          <div className="bg-card rounded-2xl p-4 border border-border shadow-soft space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              Here's what we picked up
            </h2>
            
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Sounds like you're looking for:
              </p>
              <div className="flex flex-wrap gap-2">
                {vibes.map((vibe, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium"
                  >
                    {vibe}
                  </span>
                ))}
              </div>
            </div>

            <Button variant="ghost" size="sm" className="text-primary gap-1 h-8 px-2 -ml-2">
              <Pencil className="w-3.5 h-3.5" />
              Not quite right? Edit this.
            </Button>
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
