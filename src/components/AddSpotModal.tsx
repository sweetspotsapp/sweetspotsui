import { useState } from "react";
import { X, Link2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddSpotModalProps {
  open: boolean;
  onClose: () => void;
  onUrlSubmit: (url: string) => void;
}

const sources = [
  {
    id: "tiktok",
    label: "TikTok",
    icon: "🎵",
    disabled: true,
    description: "Coming soon",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: "📷",
    disabled: true,
    description: "Coming soon",
  },
  {
    id: "url",
    label: "Paste a URL",
    icon: null,
    IconComponent: Link2,
    disabled: false,
    description: "Google Maps, websites, or any location link",
  },
];

const AddSpotModal = ({ open, onClose, onUrlSubmit }: AddSpotModalProps) => {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!urlInput.trim()) return;
    setIsSubmitting(true);
    await onUrlSubmit(urlInput.trim());
    setIsSubmitting(false);
    setUrlInput("");
    setSelectedSource(null);
  };

  const handleClose = () => {
    setSelectedSource(null);
    setUrlInput("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up sm:animate-fade-up shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Add a spot</h2>
          <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Source Options */}
        {!selectedSource && (
          <div className="space-y-2">
            {sources.map((source) => (
              <button
                key={source.id}
                onClick={() => !source.disabled && setSelectedSource(source.id)}
                disabled={source.disabled}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                  source.disabled
                    ? "border-border/50 bg-muted/30 opacity-50 cursor-not-allowed"
                    : "border-border hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  {source.IconComponent ? (
                    <source.IconComponent className="w-5 h-5 text-foreground" />
                  ) : (
                    <span className="text-lg">{source.icon}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{source.label}</p>
                  <p className="text-xs text-muted-foreground">{source.description}</p>
                </div>
                {!source.disabled && (
                  <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* URL Input */}
        {selectedSource === "url" && (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedSource(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Paste a location URL
              </label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://maps.google.com/..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground 
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 
                           focus:border-primary text-sm"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Supports Google Maps, TikTok, Instagram, and most location links
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!urlInput.trim() || isSubmitting}
              className={cn(
                "w-full py-3 rounded-xl font-medium text-sm transition-all",
                urlInput.trim() && !isSubmitting
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {isSubmitting ? "Finding spot..." : "Find spot"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddSpotModal;
