import { useState, useMemo } from "react";
import { ArrowLeft, RotateCcw, Loader2, Save, Pencil, Map, List, DollarSign, Home, Plane } from "lucide-react";
import DaySection from "./DaySection";
import ItineraryMapView from "./ItineraryMapView";
import type { ItineraryData, SwapAlternative, TripParams } from "@/hooks/useItinerary";
import { cn } from "@/lib/utils";

interface ItineraryViewProps {
  itinerary: ItineraryData;
  tripParams?: TripParams | null;
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

const ItineraryView = ({ itinerary, tripParams, onBack, onSwap, onReorder, onReplace, isSwapping, isGenerating, onRegenerate, onSave, onEdit }: ItineraryViewProps) => {
  const [showMap, setShowMap] = useState(false);

  // Calculate budget totals
  const budgetSummary = useMemo(() => {
    let activitiesTotal = 0;
    const perDay: number[] = [];
    
    for (const day of itinerary.days) {
      let dayTotal = 0;
      for (const slot of day.slots) {
        for (const act of slot.activities) {
          const cost = act.estimatedCost || 0;
          dayTotal += cost;
          activitiesTotal += cost;
        }
      }
      perDay.push(dayTotal);
    }

    const accommodationTotal = tripParams?.accommodations?.reduce((sum, a) => sum + (a.cost || 0), 0) || 0;
    const flightTotal = tripParams?.flightDetails?.price || 0;
    const groupSize = tripParams?.groupSize || 1;

    return {
      activitiesTotal,
      activitiesPerPerson: activitiesTotal,
      accommodationTotal,
      flightTotal,
      grandTotal: (activitiesTotal * groupSize) + accommodationTotal + flightTotal,
      perDay,
      groupSize,
    };
  }, [itinerary, tripParams]);

  // Collect all activities with lat/lng for map
  const mapActivities = useMemo(() => {
    const activities: Array<{ name: string; lat: number; lng: number; category: string; dayLabel: string; time: string }> = [];
    for (const day of itinerary.days) {
      for (const slot of day.slots) {
        for (const act of slot.activities) {
          if (act.lat && act.lng) {
            activities.push({
              name: act.name,
              lat: act.lat,
              lng: act.lng,
              category: act.category,
              dayLabel: day.label,
              time: slot.time,
            });
          }
        }
      }
    }
    return activities;
  }, [itinerary]);

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

      {/* Trip Name */}
      {tripParams?.name && (
        <h2 className="text-lg font-bold text-foreground">{tripParams.name}</h2>
      )}

      {/* Summary */}
      {itinerary.summary && (
        <div className="px-4 py-3 rounded-2xl bg-primary/5 border border-primary/10">
          <p className="text-sm text-foreground leading-relaxed">{itinerary.summary}</p>
        </div>
      )}

      {/* Budget Summary */}
      {budgetSummary.activitiesTotal > 0 && (
        <div className="px-4 py-3 rounded-2xl bg-card border border-border space-y-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Estimated Budget</span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Activities ({budgetSummary.groupSize} {budgetSummary.groupSize === 1 ? 'person' : 'people'})</span>
              <span className="font-medium text-foreground">${(budgetSummary.activitiesPerPerson * budgetSummary.groupSize).toLocaleString()}</span>
            </div>
            {budgetSummary.accommodationTotal > 0 && (
              <div className="flex justify-between">
                <span className="flex items-center gap-1"><Home className="w-3 h-3" /> Accommodation</span>
                <span className="font-medium text-foreground">
                  {tripParams?.accommodations?.[0]?.currency || '$'}{budgetSummary.accommodationTotal.toLocaleString()}
                </span>
              </div>
            )}
            {budgetSummary.flightTotal > 0 && (
              <div className="flex justify-between">
                <span className="flex items-center gap-1"><Plane className="w-3 h-3" /> Flights</span>
                <span className="font-medium text-foreground">
                  {tripParams?.flightDetails?.currency || '$'}{budgetSummary.flightTotal.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-1.5 border-t border-border/50">
              <span className="font-semibold text-foreground">Estimated Total</span>
              <span className="font-bold text-primary">${budgetSummary.grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Map/List Toggle */}
      {mapActivities.length > 0 && (
        <div className="flex gap-2 p-1 rounded-xl bg-muted/50">
          <button
            onClick={() => setShowMap(false)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
              !showMap ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            )}
          >
            <List className="w-3.5 h-3.5" /> List View
          </button>
          <button
            onClick={() => setShowMap(true)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
              showMap ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            )}
          >
            <Map className="w-3.5 h-3.5" /> Map View
          </button>
        </div>
      )}

      {/* Content */}
      {showMap ? (
        <div className="rounded-2xl overflow-hidden border border-border" style={{ height: '400px' }}>
          <ItineraryMapView activities={mapActivities} />
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};

export default ItineraryView;
