import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlaceCard from "./PlaceCard";
import { primaryPlaces, explorationPlaces, extractVibes } from "@/data/mockPlaces";

interface ResultsScreenProps {
  mood: string;
  onBack: () => void;
  isVague: boolean;
}

const ResultsScreen = ({ mood, onBack, isVague }: ResultsScreenProps) => {
  const vibes = extractVibes(mood);

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="px-4 py-4 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm text-muted-foreground truncate flex-1">
            "{mood}"
          </span>
        </div>
      </header>

      <div className="px-4 space-y-8 pt-6">
        {/* Vague input message */}
        {isVague && (
          <div className="bg-warm-cream rounded-2xl p-4 border border-border animate-fade-up">
            <p className="text-muted-foreground text-center">
              No worries — we'll start simple.
            </p>
          </div>
        )}

        {/* SECTION 1: Primary Recommendations */}
        <section className="space-y-4 opacity-0 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Our best picks for you
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Based on what you said
            </p>
          </div>
          
          <div className="grid gap-4">
            {primaryPlaces.map((place, index) => (
              <PlaceCard key={place.id} place={place} index={index} />
            ))}
          </div>
        </section>

        {/* SECTION 2: Understanding & Trust */}
        <section className="opacity-0 animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
          <div className="bg-card rounded-2xl p-5 border border-border shadow-soft space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Here's what we picked up from you
            </h2>
            
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Sounds like you're looking for:
              </p>
              <div className="flex flex-wrap gap-2">
                {vibes.map((vibe, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium"
                  >
                    {vibe}
                  </span>
                ))}
              </div>
            </div>

            <Button variant="ghost" size="sm" className="text-primary gap-2">
              <Pencil className="w-4 h-4" />
              Not quite right? Edit this.
            </Button>
          </div>
        </section>

        {/* SECTION 3: Exploration & Discovery */}
        <section className="space-y-4 opacity-0 animate-fade-up" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              You might also like
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Popular right now near you
            </p>
          </div>
          
          <div className="grid gap-4">
            {explorationPlaces.map((place, index) => (
              <PlaceCard key={place.id} place={place} index={index + 4} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ResultsScreen;
