import { Compass, Sparkles } from "lucide-react";

interface WelcomeCTAProps {
  onDiscoverClick: () => void;
}

const WelcomeCTA = ({ onDiscoverClick }: WelcomeCTAProps) => {
  return (
    <div className="space-y-5">
      {/* Hero CTA */}
      <button
        onClick={onDiscoverClick}
        className="w-full relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/15 via-accent/20 to-secondary/30 p-6 text-left group transition-all hover:shadow-lg"
      >
        <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity">
          <Sparkles className="w-16 h-16 text-primary" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
            <Compass className="w-3.5 h-3.5" />
            Start Exploring
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">
            Find your perfect spot
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tell us your vibe — we'll find cafés, restaurants, and hidden gems that match.
          </p>
        </div>
      </button>

      {/* Quick tips */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-xs font-semibold text-foreground mb-0.5">Search by vibe</p>
          <p className="text-[11px] text-muted-foreground leading-snug">"Cozy cafés with good matcha"</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-2xl mb-2">📍</p>
          <p className="text-xs font-semibold text-foreground mb-0.5">Plan a trip</p>
          <p className="text-[11px] text-muted-foreground leading-snug">Turn saved spots into itineraries</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeCTA;
