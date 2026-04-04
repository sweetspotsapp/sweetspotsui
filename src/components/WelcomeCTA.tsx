import { Compass, Sparkles, MapPin, Plane } from "lucide-react";

interface WelcomeCTAProps {
  onDiscoverClick: () => void;
  onTripClick?: () => void;
}

const tripTemplates = [
  { destination: "Tokyo", duration: "3 Days", spots: 12, gradient: "from-rose-500/80 to-orange-400/80", emoji: "🗼" },
  { destination: "Bali", duration: "5 Days", spots: 18, gradient: "from-emerald-500/80 to-teal-400/80", emoji: "🌴" },
  { destination: "Paris", duration: "4 Days", spots: 15, gradient: "from-violet-500/80 to-indigo-400/80", emoji: "🗼" },
  { destination: "Istanbul", duration: "3 Days", spots: 10, gradient: "from-amber-500/80 to-yellow-400/80", emoji: "🕌" },
  { destination: "New York", duration: "4 Days", spots: 14, gradient: "from-sky-500/80 to-blue-400/80", emoji: "🗽" },
  { destination: "Bangkok", duration: "3 Days", spots: 11, gradient: "from-pink-500/80 to-fuchsia-400/80", emoji: "🛕" },
];

const WelcomeCTA = ({ onDiscoverClick, onTripClick }: WelcomeCTAProps) => {
  const handleTemplateClick = (destination: string) => {
    sessionStorage.setItem("sweetspots_template_destination", destination);
    onTripClick?.();
  };

  return (
    <div className="space-y-6">
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

      {/* Quick tips — now clickable */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onDiscoverClick}
          className="rounded-xl bg-card border border-border p-4 text-left transition-all hover:border-primary/40 active:scale-[0.98]"
        >
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-xs font-semibold text-foreground mb-0.5">Search by vibe</p>
          <p className="text-[11px] text-muted-foreground leading-snug">"Cozy cafés with good matcha"</p>
        </button>
        <button
          onClick={() => onTripClick?.()}
          className="rounded-xl bg-card border border-border p-4 text-left transition-all hover:border-primary/40 active:scale-[0.98]"
        >
          <p className="text-2xl mb-2">📍</p>
          <p className="text-xs font-semibold text-foreground mb-0.5">Plan a trip</p>
          <p className="text-[11px] text-muted-foreground leading-snug">Turn saved spots into itineraries</p>
        </button>
      </div>

      {/* Popular Itineraries */}
      <div>
        <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <Plane className="w-4 h-4 text-primary" />
          Popular Itineraries
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
          {tripTemplates.map((t) => (
            <button
              key={t.destination}
              onClick={() => handleTemplateClick(t.destination)}
              className="flex-shrink-0 w-36 rounded-xl overflow-hidden transition-all active:scale-[0.97] hover:shadow-md"
            >
              <div className={`relative h-28 bg-gradient-to-br ${t.gradient} flex items-center justify-center`}>
                <span className="text-4xl">{t.emoji}</span>
              </div>
              <div className="bg-card border border-t-0 border-border rounded-b-xl p-3">
                <p className="text-sm font-semibold text-foreground">{t.destination}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                  <span>{t.duration}</span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {t.spots}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WelcomeCTA;
