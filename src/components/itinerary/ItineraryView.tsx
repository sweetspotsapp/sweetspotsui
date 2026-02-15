import { ArrowLeft, RotateCcw, Loader2 } from "lucide-react";
import DaySection from "./DaySection";
import type { ItineraryData, SwapAlternative } from "@/hooks/useItinerary";

interface ItineraryViewProps {
  itinerary: ItineraryData;
  onBack: () => void;
  onSwap: (dayIndex: number, slotIndex: number, activityIndex: number) => Promise<SwapAlternative[] | undefined>;
  onReorder: (dayIndex: number, slotIndex: number, fromIdx: number, toIdx: number) => void;
  onReplace: (dayIndex: number, slotIndex: number, activityIndex: number, newActivity: { name: string; description: string; category: string }) => void;
  isSwapping: boolean;
  isGenerating: boolean;
  onRegenerate: () => void;
}

const ItineraryView = ({ itinerary, onBack, onSwap, onReorder, onReplace, isSwapping, isGenerating, onRegenerate }: ItineraryViewProps) => {
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 relative">
      {/* Back + Regenerate */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Edit Trip
        </button>
        <button
          onClick={onRegenerate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          Regenerate
        </button>
      </div>

      {/* Summary */}
      {itinerary.summary && (
        <div className="px-4 py-3 rounded-2xl bg-primary/5 border border-primary/10">
          <p className="text-sm text-foreground leading-relaxed">{itinerary.summary}</p>
        </div>
      )}

      {/* Days */}
      {itinerary.days.map((day, dayIndex) => (
        <DaySection
          key={dayIndex}
          day={day}
          dayIndex={dayIndex}
          onSwap={onSwap}
          onReorder={onReorder}
          onReplace={onReplace}
          isSwapping={isSwapping}
        />
      ))}
    </div>
  );
};

export default ItineraryView;
