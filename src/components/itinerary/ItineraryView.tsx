import { ArrowLeft, RotateCcw, Loader2, Save, Pencil } from "lucide-react";
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
  onSave?: () => void;
  onEdit?: () => void;
}

const ItineraryView = ({ itinerary, onBack, onSwap, onReorder, onReplace, isSwapping, isGenerating, onRegenerate, onSave, onEdit }: ItineraryViewProps) => {
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 relative">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Itineraries
        </button>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
          {onSave && (
            <button
              onClick={onSave}
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> Save
            </button>
          )}
          <button
            onClick={onRegenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Regenerate
          </button>
        </div>
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
