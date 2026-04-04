import { Link2, Instagram, MapPin } from "lucide-react";

interface ImportBannerProps {
  compact?: boolean;
  onImportPress: () => void;
}

const ImportBanner = ({ compact, onImportPress }: ImportBannerProps) => {
  if (compact) {
    return (
      <button
        onClick={onImportPress}
        className="w-full flex items-center gap-3 p-4 rounded-2xl bg-primary/10 hover:bg-primary/15 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Link2 className="w-5 h-5 text-primary" />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-foreground">Import more spots</p>
          <p className="text-xs text-muted-foreground">From TikTok, Instagram, or Google Maps</p>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onImportPress}
      className="w-full rounded-2xl bg-gradient-to-br from-primary/15 via-accent/20 to-secondary/30 p-6 text-left hover:shadow-md transition-all"
    >
      <h3 className="text-lg font-bold text-foreground mb-2">
        Save your favorite spots
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Paste a link from TikTok, Instagram, or Google Maps and we'll save it for you.
      </p>
      <div className="flex items-center gap-3">
        {[
          { icon: Instagram, label: "Instagram" },
          { icon: Link2, label: "TikTok" },
          { icon: MapPin, label: "Maps" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 text-xs font-medium text-foreground"
          >
            <Icon className="w-3.5 h-3.5 text-primary" />
            {label}
          </div>
        ))}
      </div>
    </button>
  );
};

export default ImportBanner;
