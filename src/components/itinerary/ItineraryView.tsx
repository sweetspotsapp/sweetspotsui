import { useState, useMemo, useCallback } from "react";
import { ArrowLeft, RotateCcw, Loader2, Save, Pencil, Map, List, DollarSign, Home, Plane, X } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import DaySection from "./DaySection";
import ItineraryMapView from "./ItineraryMapView";
import type { ItineraryData, ItineraryDay, SwapAlternative, TripParams } from "@/hooks/useItinerary";
import { cn } from "@/lib/utils";

interface ItineraryViewProps {
  itinerary: ItineraryData;
  tripParams?: TripParams | null;
  onBack: () => void;
  onSwap: (dayIndex: number, slotIndex: number, activityIndex: number) => Promise<SwapAlternative[] | undefined>;
  onReplace: (dayIndex: number, slotIndex: number, activityIndex: number, newActivity: { name: string; description: string; category: string }) => void;
  onRemoveActivity: (dayIndex: number, slotIndex: number, activityIndex: number) => void;
  onAddActivity: (dayIndex: number, slotIndex: number, newActivity: { name: string; placeId?: string; category: string; description: string }) => void;
  onDragReorder: (fromDayIdx: number, fromSlotIdx: number, fromActIdx: number, toDayIdx: number, toSlotIdx: number, toActIdx: number) => void;
  isSwapping: boolean;
  isGenerating: boolean;
  onRegenerate: () => void;
  onSave?: () => void;
  onSaveEdits?: (editedItinerary: ItineraryData) => void;
}

function parseCompositeId(id: string): { dayIdx: number; slotIdx: number; actIdx: number } | null {
  const match = id.match(/^d(\d+)-s(\d+)-a(\d+)$/);
  if (!match) return null;
  return { dayIdx: parseInt(match[1]), slotIdx: parseInt(match[2]), actIdx: parseInt(match[3]) };
}

function parseDroppableId(id: string): { dayIdx: number; slotIdx: number } | null {
  const match = id.match(/^d(\d+)-s(\d+)$/);
  if (!match) return null;
  return { dayIdx: parseInt(match[1]), slotIdx: parseInt(match[2]) };
}

const ItineraryView = ({ itinerary, tripParams, onBack, onSwap, onReplace, onRemoveActivity, onAddActivity, onDragReorder, isSwapping, isGenerating, onRegenerate, onSave, onSaveEdits }: ItineraryViewProps) => {
  const [showMap, setShowMap] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editSnapshot, setEditSnapshot] = useState<ItineraryData | null>(null);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } });
  const sensors = useSensors(pointerSensor, touchSensor);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = parseCompositeId(active.id as string);
    if (!from) return;

    // Over could be another activity or a droppable slot
    const to = parseCompositeId(over.id as string);
    if (to) {
      onDragReorder(from.dayIdx, from.slotIdx, from.actIdx, to.dayIdx, to.slotIdx, to.actIdx);
      return;
    }

    // Dropped on an empty slot droppable
    const slot = parseDroppableId(over.id as string);
    if (slot) {
      const targetSlotLen = itinerary.days[slot.dayIdx]?.slots[slot.slotIdx]?.activities?.length || 0;
      onDragReorder(from.dayIdx, from.slotIdx, from.actIdx, slot.dayIdx, slot.slotIdx, targetSlotLen);
    }
  }, [onDragReorder, itinerary]);

  const handleStartEditing = () => {
    setEditSnapshot(JSON.parse(JSON.stringify(itinerary)));
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    if (editSnapshot && onSaveEdits) {
      onSaveEdits(editSnapshot);
    }
    setIsEditing(false);
    setEditSnapshot(null);
  };

  const handleSaveEditing = () => {
    setIsEditing(false);
    setEditSnapshot(null);
    onSaveEdits?.(itinerary);
  };

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

  const daysContent = (
    <>
      {itinerary.days.map((day, dayIndex) => (
        <DaySection
          key={dayIndex}
          day={day}
          dayIndex={dayIndex}
          onSwap={onSwap}
          onReplace={onReplace}
          isSwapping={isSwapping}
          isEditing={isEditing}
          onRemoveActivity={onRemoveActivity}
          onAddActivity={onAddActivity}
        />
      ))}
    </>
  );

  return (
    <div className="max-w-md mx-auto md:max-w-2xl lg:max-w-4xl px-4 md:px-6 lg:px-8 py-4 space-y-4 relative">
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
          {isEditing ? (
            <>
              <button
                onClick={handleCancelEditing}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                onClick={handleSaveEditing}
                className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleStartEditing}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
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
            </>
          )}
        </div>
      </div>

      {/* Editing banner */}
      {isEditing && (
        <div className="px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-xs text-muted-foreground">Hold and drag activities to rearrange your itinerary.</p>
        </div>
      )}

      {/* Trip Name */}
      {tripParams?.name && !isEditing && (
        <h2 className="text-lg font-bold text-foreground">{tripParams.name}</h2>
      )}

      {/* Summary */}
      {itinerary.summary && !isEditing && (
        <div className="px-4 py-3 rounded-2xl bg-primary/5 border border-primary/10">
          <p className="text-sm text-foreground leading-relaxed">{itinerary.summary}</p>
        </div>
      )}

      {/* Budget Summary */}
      {budgetSummary.activitiesTotal > 0 && !isEditing && (
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
      {mapActivities.length > 0 && !isEditing && (
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
      {showMap && !isEditing ? (
        <div className="rounded-2xl overflow-hidden border border-border" style={{ height: '400px' }}>
          <ItineraryMapView activities={mapActivities} />
        </div>
      ) : isEditing ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {daysContent}
        </DndContext>
      ) : (
        daysContent
      )}
    </div>
  );
};

export default ItineraryView;
