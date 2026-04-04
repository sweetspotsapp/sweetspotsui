import { Link2, Instagram, MapPin, ArrowRight } from "lucide-react";

interface ImportBannerProps {
  compact?: boolean;
  onImportPress: () => void;
}

const ImportBanner = ({ compact, onImportPress }: ImportBannerProps) => {
  if (compact) {
    return (
      <button
        onClick={onImportPress}
        className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border/60 bg-card hover:bg-accent/50 transition-all group"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Link2 className="w-4 h-4 text-primary" />
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Import more spots</p>
          <p className="text-xs text-muted-foreground">From TikTok, Instagram, or Google Maps</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </button>
    );
  }

  return (
    <button
      onClick={onImportPress}
      className="w-full rounded-2xl border border-border/60 bg-card p-6 text-left hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            Save your favorite spots
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Paste a link from TikTok, Instagram, or Google Maps — we'll do the rest.
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 ml-4 group-hover:bg-primary/15 transition-colors">
          <ArrowRight className="w-5 h-5 text-primary" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {[
          { icon: Instagram, label: "Instagram" },
          { icon: Link2, label: "TikTok" },
          { icon: MapPin, label: "Maps" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 text-xs font-medium text-muted-foreground"
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </div>
        ))}
      </div>
    </button>
  );
};

export default ImportBanner;
