import { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";

const TOOLTIP_KEY = "sweetspots_first_search_seen";

const FirstSearchTooltip = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(TOOLTIP_KEY);
    if (!seen) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(TOOLTIP_KEY, "true");
  };

  if (!visible) return null;

  return (
    <div className="relative mb-4 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
        <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground mb-0.5">Try your first search!</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Type a vibe like "rooftop bars with a view" or tap a chip below to discover spots.
          </p>
        </div>
        <button onClick={dismiss} className="p-1 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default FirstSearchTooltip;
