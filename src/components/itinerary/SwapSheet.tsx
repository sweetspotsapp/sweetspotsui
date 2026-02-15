import { X } from "lucide-react";
import type { SwapAlternative } from "@/hooks/useItinerary";

interface SwapSheetProps {
  isOpen: boolean;
  onClose: () => void;
  alternatives: SwapAlternative[];
  onSelect: (alt: SwapAlternative) => void;
  currentName: string;
}

const SwapSheet = ({ isOpen, onClose, alternatives, onSelect, currentName }: SwapSheetProps) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-w-[420px] mx-auto animate-fade-up">
        <div className="bg-card rounded-t-3xl shadow-elevated max-h-[60vh] overflow-hidden flex flex-col">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-6 pt-2 pb-3 flex items-center justify-between border-b border-border">
            <div>
              <h3 className="text-base font-semibold text-foreground">Swap Activity</h3>
              <p className="text-xs text-muted-foreground">Replace "{currentName}"</p>
            </div>
            <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Alternatives */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {alternatives.map((alt, i) => (
              <button
                key={i}
                onClick={() => onSelect(alt)}
                className="w-full text-left px-4 py-3.5 rounded-2xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors space-y-1"
              >
                <span className="text-sm font-medium text-foreground block">{alt.name}</span>
                <p className="text-xs text-muted-foreground line-clamp-2">{alt.description}</p>
                {alt.reasoning && (
                  <p className="text-xs text-primary italic">{alt.reasoning}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default SwapSheet;
