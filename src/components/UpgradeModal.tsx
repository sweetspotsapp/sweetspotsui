import { Sparkles, Zap, Infinity, MapPin, X } from "lucide-react";
import { Button } from "./ui/button";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

const UpgradeModal = ({ open, onClose }: UpgradeModalProps) => {
  if (!open) return null;

  const perks = [
    { icon: Infinity, label: "Unlimited vibe searches" },
    { icon: Zap, label: "Faster, priority results" },
    { icon: MapPin, label: "Unlimited trip plans per month" },
    { icon: Sparkles, label: "Early access to new features" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-card rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-muted/80 text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="px-6 pt-8 pb-4 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            You've used all your searches today
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Upgrade to keep discovering — no limits, no waiting.
          </p>
        </div>

        {/* Perks */}
        <div className="px-6 space-y-3">
          {perks.map((perk) => (
            <div key={perk.label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <perk.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-foreground">{perk.label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pt-6 pb-8 space-y-2.5">
          <Button className="w-full h-12 rounded-2xl text-base font-semibold gap-2" size="lg">
            <Sparkles className="w-4 h-4" />
            Upgrade to Pro — $5.99/mo
          </Button>
          <button
            onClick={onClose}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
