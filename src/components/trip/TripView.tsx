import { useState, useMemo, useEffect, useCallback } from "react";
import { ArrowLeft, RotateCcw, Loader2, Save, Pencil, Map, List, DollarSign, Home, Plane, X, MapPin, Calendar, Users, Compass } from "lucide-react";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import DaySection from "./DaySection";
import TripMapView from "./TripMapView";
import type { TripData, TripDay, SwapAlternative, TripParams } from "@/hooks/useTrip";
import { cn } from "@/lib/utils";

interface TripViewProps {
  tripData: TripData;
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
  onSaveEdits?: (editedTrip: TripData) => void;
}

// Assign stable drag IDs to all activities
function ensureDragIds(trip: TripData): TripData {
  let changed = false;
  const updated = { ...trip, days: trip.days.map(day => ({
    ...day,
    slots: day.slots.map(slot => ({
      ...slot,
      activities: slot.activities.map(act => {
        if (!(act as any)._dragId) {
          changed = true;
          return { ...act, _dragId: crypto.randomUUID() } as any;
        }
        return act;
      }),
    })),
  }))};
  return changed ? updated : trip;
}

const TripView = ({ tripData, tripParams, onBack, onSwap, onReplace, onRemoveActivity, onAddActivity, onDragReorder, isSwapping, isGenerating, onRegenerate, onSave, onSaveEdits }: TripViewProps) => {
  const [showMap, setShowMap] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editSnapshot, setEditSnapshot] = useState<TripData | null>(null);

  // Ensure all activities have stable drag IDs
  useEffect(() => {
    const withIds = ensureDragIds(tripData);
    if (withIds !== tripData && onSaveEdits) {
      onSaveEdits(withIds);
    }
  }, [tripData]);

  // Monitor for drag-and-drop events globally with edge detection
  useEffect(() => {
    if (!isEditing) return;

    return monitorForElements({
      onDrop({ source, location }) {
        const dest = location.current.dropTargets[0];
        if (!dest) return;

        const srcData = source.data as { dayIdx: number; slotIdx: number; actIdx: number };
        const destData = dest.data as { dayIdx: number; slotIdx: number; actIdx: number; isSlot?: boolean };

        // Don't reorder onto itself
        if (srcData.dayIdx === destData.dayIdx && srcData.slotIdx === destData.slotIdx && srcData.actIdx === destData.actIdx) return;

        let toActIdx: number;

        if (destData.isSlot) {
          // Dropped on empty slot area — append to end
          toActIdx = tripData.days[destData.dayIdx]?.slots[destData.slotIdx]?.activities?.length || 0;
        } else {
          // Use closest edge to determine insert position
          const edge = extractClosestEdge(dest.data);
          toActIdx = edge === "bottom" ? destData.actIdx + 1 : destData.actIdx;
        }

        onDragReorder(srcData.dayIdx, srcData.slotIdx, srcData.actIdx, destData.dayIdx, destData.slotIdx, toActIdx);
      },
    });
  }, [isEditing, onDragReorder, tripData]);

  // Auto-scroll when dragging near edges
  useEffect(() => {
    if (!isEditing) return;

    return autoScrollForElements({
      element: document.documentElement,
    });
  }, [isEditing]);

  const handleStartEditing = () => {
    setEditSnapshot(JSON.parse(JSON.stringify(tripData)));
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
    onSaveEdits?.(tripData);
  };

  const handleMoveToDay = useCallback((fromDayIdx: number, fromSlotIdx: number, fromActIdx: number, targetDayIdx: number) => {
    const targetSlotActivities = tripData.days[targetDayIdx]?.slots[0]?.activities?.length || 0;
    onDragReorder(fromDayIdx, fromSlotIdx, fromActIdx, targetDayIdx, 0, targetSlotActivities);
  }, [tripData, onDragReorder]);

  const budgetSummary = useMemo(() => {
    let activitiesTotal = 0;
    const perDay: number[] = [];
    
    for (const day of tripData.days) {
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
  }, [tripData, tripParams]);

  const mapActivities = useMemo(() => {
    const activities: Array<{ name: string; lat: number; lng: number; category: string; dayLabel: string; time: string }> = [];
    for (const day of tripData.days) {
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
  }, [tripData]);

  // Get hero image from first activity with a photo
  const heroImage = useMemo(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    for (const day of tripData.days) {
      for (const slot of day.slots) {
        for (const act of slot.activities) {
          if ((act as any).photoName) {
            return `${supabaseUrl}/functions/v1/place-photo?photo_name=${encodeURIComponent((act as any).photoName)}&maxWidthPx=600`;
          }
        }
      }
    }
    return null;
  }, [tripData]);

  const totalSpots = useMemo(() => {
    return tripData.days.reduce((acc, d) => acc + d.slots.reduce((a, s) => a + s.activities.length, 0), 0);
  }, [tripData]);

  return (
    <div className="max-w-md mx-auto md:max-w-2xl lg:max-w-4xl px-4 md:px-6 lg:px-8 py-4 space-y-5 relative">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Trips
        </button>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancelEditing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={handleSaveEditing}
                className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all"
              >
                <Save className="w-4 h-4" /> Save Changes
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
        <div className="px-4 py-3 rounded-xl bg-primary/10 border-2 border-primary/20">
          <p className="text-xs font-medium text-primary">Editing Mode — Hold and drag activities to rearrange your trip.</p>
        </div>
      )}

      {/* ─── Hero Section: Two-column on desktop, stacked on mobile ─── */}
      {!isEditing && (
        <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-soft">
          <div className="flex flex-col md:flex-row">
            {/* Left: Text info */}
            <div className="flex-1 p-5 md:p-6 flex flex-col justify-center min-w-0">
              {tripParams?.name && (
                <h2 className="text-xl font-bold text-foreground mb-1">{tripParams.name}</h2>
              )}
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-3">
                <MapPin className="w-3.5 h-3.5" />
                {tripParams?.destination}
              </p>

              {/* Summary */}
              {tripData.summary && (
                <p className="text-sm text-foreground/80 leading-relaxed mb-4 line-clamp-3">
                  {tripData.summary}
                </p>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {tripParams?.startDate && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>{tripData.days.length} days</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>{totalSpots} spots</span>
                </div>
                {budgetSummary.grandTotal > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    <span>${budgetSummary.grandTotal.toLocaleString()}</span>
                  </div>
                )}
                {tripParams && tripParams.groupSize > 1 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>{tripParams.groupSize} people</span>
                  </div>
                )}
              </div>

              {/* Vibe pills */}
              {tripParams?.vibes && tripParams.vibes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {tripParams.vibes.slice(0, 4).map(v => (
                    <span key={v} className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{v}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Hero image */}
            <div className="md:w-[45%] aspect-[4/3] md:aspect-auto relative flex-shrink-0">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={tripParams?.name || tripParams?.destination || "Trip"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center min-h-[180px]">
                  <Compass className="w-12 h-12 text-muted-foreground/30" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Budget detail (collapsed into hero, show expanded only if large) */}
      {budgetSummary.activitiesTotal > 0 && !isEditing && (budgetSummary.accommodationTotal > 0 || budgetSummary.flightTotal > 0) && (
        <div className="px-4 py-3 rounded-2xl bg-card border border-border space-y-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Budget Breakdown</span>
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
          <TripMapView activities={mapActivities} />
        </div>
      ) : (
        tripData.days.map((day, dayIndex) => (
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
            onMoveToDay={isEditing ? handleMoveToDay : undefined}
            totalDays={isEditing ? tripData.days : undefined}
          />
        ))
      )}
    </div>
  );
};

export default TripView;
