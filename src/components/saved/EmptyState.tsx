import { Compass, Link2, Sparkles, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EmptyStateProps {
  type: "boards" | "places";
  onImportClick?: () => void;
}

const EmptyState = ({ type, onImportClick }: EmptyStateProps) => {
  const navigate = useNavigate();

  if (type === "boards") {
    return (
      <div className="flex flex-col items-center px-5 pt-6 pb-8 animate-fade-in">
        {/* Hero illustration */}
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <MapPin className="w-9 h-9 text-primary" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-400 animate-pulse" />
        </div>

        <h3 className="text-lg font-bold text-foreground mb-1">
          Start your collection
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-[280px] mb-6">
          Save spots you love and organize them into boards for your next trip
        </p>

        {/* Two-path cards */}
        <div className="w-full space-y-3 max-w-sm">
          {/* Path A — Discover */}
          <button
            onClick={() => navigate('/?tab=discover')}
            className="w-full flex items-start gap-4 p-4 rounded-2xl border border-border bg-card 
                       hover:border-primary/40 hover:shadow-md transition-all active:scale-[0.98] text-left"
          >
            <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-semibold text-foreground block mb-0.5">
                Discover on SweetSpots
              </span>
              <span className="text-xs text-muted-foreground leading-relaxed">
                Search by vibe — find hidden gems, cozy cafes, rooftop bars near you
              </span>
            </div>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 px-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Path B — Import from Social */}
          <button
            onClick={() => onImportClick?.()}
            className="w-full flex items-start gap-4 p-4 rounded-2xl border border-border bg-card 
                       hover:border-primary/40 hover:shadow-md transition-all active:scale-[0.98] text-left"
          >
            <div className="w-11 h-11 shrink-0 rounded-xl bg-accent/60 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-foreground" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-semibold text-foreground block mb-0.5">
                Import from Social Media
              </span>
              <span className="text-xs text-muted-foreground leading-relaxed mb-2 block">
                Paste a link from Instagram, TikTok, or Google Maps to save any spot
              </span>
              {/* Platform pills */}
              <div className="flex gap-1.5 flex-wrap">
                {["Instagram", "TikTok", "Google Maps"].map(platform => (
                  <span
                    key={platform}
                    className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium text-muted-foreground"
                  >
                    {platform}
                  </span>
                ))}
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
        <MapPin className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">No saved spots yet</h3>
      <p className="text-xs text-muted-foreground max-w-[220px]">
        Tap the heart on any place to save it here
      </p>
    </div>
  );
};

export default EmptyState;
