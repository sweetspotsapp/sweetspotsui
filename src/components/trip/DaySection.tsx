import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { attachClosestEdge, extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import ActivityCard from "./ActivityCard";
import DistanceConnector from "./DistanceConnector";
import { usePlaceAutocomplete } from "@/hooks/usePlaceAutocomplete";
import type { TripDay, Activity, SwapAlternative } from "@/hooks/useTrip";
import type { ActivityStatus } from "@/hooks/useLiveTrip";
import { activityKey } from "@/hooks/useLiveTrip";

interface DaySectionProps {
  day: TripDay;
  dayIndex: number;
  destination?: string;
  onSwap: (dayIndex: number, slotIndex: number, activityIndex: number) => Promise<SwapAlternative[] | undefined>;
  onReplace: (dayIndex: number, slotIndex: number, activityIndex: number, newActivity: { name: string; description: string; category: string }) => void;
  isSwapping: boolean;
  isEditing?: boolean;
  onRemoveActivity?: (dayIndex: number, slotIndex: number, activityIndex: number) => void;
  onAddActivity?: (dayIndex: number, slotIndex: number, newActivity: { name: string; placeId?: string; category: string; description: string }) => void;
  onMoveToDay?: (dayIndex: number, slotIndex: number, activityIndex: number, targetDayIndex: number) => void;
  totalDays?: TripDay[];
  // Live mode props
  isLive?: boolean;
  isToday?: boolean;
  checkedActivities?: Record<string, ActivityStatus>;
  onToggleActivity?: (key: string, status: ActivityStatus) => void;
  onUndoActivity?: (key: string) => void;
}

const TIME_LABELS: Record<string, string> = {
  Morning: "AM",
  Afternoon: "PM",
  Evening: "EVE",
};

interface RouteData {
  durationText: string;
  distanceText: string;
}

/** Check if a place is currently open based on stored opening_hours */
// getOpenStatus placeholder — no opening_hours on Activity type yet

const AddPlaceInput = ({ onAdd }: { onAdd: (place: { name: string; placeId?: string; category: string; description: string }) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { predictions, isLoading, clearPredictions } = usePlaceAutocomplete(query);

  const handleSelect = (prediction: { main_text: string; place_id: string }) => {
    onAdd({
      name: prediction.main_text,
      placeId: prediction.place_id.startsWith("local_") ? undefined : prediction.place_id,
      category: "place",
      description: "",
    });
    setQuery("");
    clearPredictions();
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-primary/30 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add place
      </button>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a place..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button onClick={() => { setIsOpen(false); setQuery(""); clearPredictions(); }} className="p-1.5 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      {predictions.length > 0 && (
        <div className="rounded-lg border border-border bg-card shadow-sm max-h-40 overflow-y-auto">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              onClick={() => handleSelect(p)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 transition-colors border-b border-border/30 last:border-b-0"
            >
              <span className="font-medium text-foreground">{p.main_text}</span>
              {p.secondary_text && <span className="text-muted-foreground ml-1">· {p.secondary_text}</span>}
            </button>
          ))}
        </div>
      )}
      {isLoading && <p className="text-[10px] text-muted-foreground px-1">Searching...</p>}
    </div>
  );
};

// Drop indicator line
const DropIndicator = ({ edge }: { edge: Edge }) => (
  <div
    className={cn(
      "absolute left-2 right-2 h-0.5 bg-primary rounded-full z-20 pointer-events-none",
      edge === "top" ? "-top-[1px]" : "-bottom-[1px]"
    )}
  >
    <div className={cn(
      "absolute w-2 h-2 rounded-full bg-primary -left-1",
      edge === "top" ? "-top-[3px]" : "-top-[3px]"
    )} />
  </div>
);

// Draggable + drop-target wrapper for each activity in edit mode
const DraggableActivityCard = ({
  activity, dayIndex, slotIndex, activityIndex, onSwap, onReplace, isSwapping, onRemoveActivity, onMoveToDay, availableDays, currentDayIndex, destination,
}: {
  activity: Activity;
  dayIndex: number;
  slotIndex: number;
  activityIndex: number;
  onSwap: DaySectionProps["onSwap"];
  onReplace: DaySectionProps["onReplace"];
  isSwapping: boolean;
  onRemoveActivity?: DaySectionProps["onRemoveActivity"];
  onMoveToDay?: (targetDayIndex: number) => void;
  availableDays?: Array<{ dayIndex: number; label: string }>;
  currentDayIndex?: number;
  destination?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return combine(
      draggable({
        element: el,
        getInitialData: () => ({ dayIdx: dayIndex, slotIdx: slotIndex, actIdx: activityIndex }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element: el,
        getData: ({ input, element }) => {
          return attachClosestEdge(
            { dayIdx: dayIndex, slotIdx: slotIndex, actIdx: activityIndex },
            { input, element, allowedEdges: ["top", "bottom"] }
          );
        },
        getIsSticky: () => true,
        onDrag: ({ self }) => {
          const edge = extractClosestEdge(self.data);
          setClosestEdge(edge);
        },
        onDragEnter: ({ self }) => {
          const edge = extractClosestEdge(self.data);
          setClosestEdge(edge);
        },
        onDragLeave: () => setClosestEdge(null),
        onDrop: () => setClosestEdge(null),
      }),
    );
  }, [dayIndex, slotIndex, activityIndex]);

  return (
    <div ref={ref} className="relative">
      {closestEdge && !isDragging && <DropIndicator edge={closestEdge} />}
      <ActivityCard
        activity={activity}
        onSwap={() => onSwap(dayIndex, slotIndex, activityIndex)}
        onReplace={(newAct) => onReplace(dayIndex, slotIndex, activityIndex, newAct)}
        isSwapping={isSwapping}
        isEditing
        onRemove={() => onRemoveActivity?.(dayIndex, slotIndex, activityIndex)}
        isDragging={isDragging}
        onMoveToDay={onMoveToDay}
        availableDays={availableDays}
        currentDayIndex={currentDayIndex}
        destination={destination}
      />
    </div>
  );
};

// Droppable zone for empty slots
const DroppableSlot = ({ dayIndex, slotIndex, children }: { dayIndex: number; slotIndex: number; children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return dropTargetForElements({
      element: el,
      getData: () => ({ dayIdx: dayIndex, slotIdx: slotIndex, actIdx: -1, isSlot: true }),
      canDrop: () => true,
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: () => setIsOver(false),
    });
  }, [dayIndex, slotIndex]);

  return (
    <div ref={ref} className={cn("px-3 py-2 space-y-2 min-h-[2rem] transition-colors", isOver && "bg-primary/5 rounded-lg")}>
      {children}
    </div>
  );
};

const DaySection = ({ day, dayIndex, destination, onSwap, onReplace, isSwapping, isEditing, onRemoveActivity, onAddActivity, onMoveToDay, totalDays, isLive, isToday, checkedActivities, onToggleActivity, onUndoActivity }: DaySectionProps) => {
  // Default: expand the first day (or today's day in live mode), collapse upcoming days
  const [isOpen, setIsOpen] = useState(isLive ? !!isToday : dayIndex === 0);
  const [routeDataMap, setRouteDataMap] = useState<Map<string, RouteData>>(new Map());

  useEffect(() => {
    const pairs: Array<{ key: string; origin: { lat: number; lng: number }; destination: { lat: number; lng: number } }> = [];
    const allActivities: Array<{ lat?: number; lng?: number }> = [];

    for (const slot of day.slots) {
      for (const activity of slot.activities) {
        allActivities.push(activity);
      }
    }

    for (let i = 0; i < allActivities.length - 1; i++) {
      const from = allActivities[i];
      const to = allActivities[i + 1];
      if (from.lat && from.lng && to.lat && to.lng) {
        pairs.push({
          key: `${from.lat},${from.lng}->${to.lat},${to.lng}`,
          origin: { lat: from.lat, lng: from.lng },
          destination: { lat: to.lat, lng: to.lng },
        });
      }
    }

    if (pairs.length === 0) return;

    const fetchRoutes = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compute-routes`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              routes: pairs.map(p => ({ origin: p.origin, destination: p.destination })),
              travelMode: 'DRIVE',
            }),
          }
        );

        if (!response.ok) return;

        const data = await response.json();
        const newMap = new Map<string, RouteData>();
        
        if (data.results) {
          pairs.forEach((pair, idx) => {
            const result = data.results[idx];
            if (result?.durationText) {
              newMap.set(pair.key, {
                durationText: result.durationText,
                distanceText: result.distanceText,
              });
            }
          });
        }

        if (newMap.size > 0) {
          setRouteDataMap(newMap);
        }
      } catch (err) {
        console.log('Routes API fallback to Haversine:', err);
      }
    };

    fetchRoutes();
  }, [day]);

  const getRouteData = (fromLat?: number, fromLng?: number, toLat?: number, toLng?: number): RouteData | undefined => {
    if (!fromLat || !fromLng || !toLat || !toLng) return undefined;
    return routeDataMap.get(`${fromLat},${fromLng}->${toLat},${toLng}`);
  };

  const allActivities = day.slots.flatMap(s => s.activities);
  const spotsCount = allActivities.length;
  const dayTotal = allActivities.reduce((sum, a) => sum + (a.estimatedCost || 0), 0);
  // Cost range: ±15% buffer to reflect typical variability
  const costLow = dayTotal > 0 ? Math.round(dayTotal * 0.85) : 0;
  const costHigh = dayTotal > 0 ? Math.round(dayTotal * 1.15) : 0;
  // Top 3 unique vibe categories for the day
  const vibeCategories = Array.from(
    new Set(allActivities.map(a => a.category).filter(Boolean))
  ).slice(0, 3);

  // For live mode: find first unchecked activity as "current"
  const findFirstUnchecked = (): string | null => {
    if (!isLive || !isToday || !checkedActivities) return null;
    for (let si = 0; si < day.slots.length; si++) {
      for (let ai = 0; ai < day.slots[si].activities.length; ai++) {
        const key = activityKey(dayIndex, si, ai);
        if (!checkedActivities[key]) return key;
      }
    }
    return null;
  };
  const currentActivityKey = findFirstUnchecked();

  // Live mode progress for this day
  const liveProgress = (() => {
    if (!isLive || !checkedActivities) return null;
    let total = 0, done = 0;
    day.slots.forEach((slot, si) => {
      slot.activities.forEach((_, ai) => {
        const key = activityKey(dayIndex, si, ai);
        const status = checkedActivities[key];
        if (status === "cancelled") return;
        total++;
        if (status === "done" || status === "skipped") done++;
      });
    });
    return { done, total };
  })();

  const isActive = !!(isLive && isToday);

  return (
    <div className={cn(
      "rounded-2xl overflow-hidden shadow-card",
      isActive ? "bg-foreground/95 ring-2 ring-primary/40" : "bg-background border border-border"
    )}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
          isActive ? "hover:bg-foreground/5" : "hover:bg-muted/50 border-orange-600 border-solid"
        )}
      >
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center",
          isActive ? "bg-primary text-primary-foreground" : "bg-amber-600"
        )}>
          <span className={cn(
            "text-sm font-bold",
            isActive ? "text-primary-foreground" : "text-slate-50"
          )}>{dayIndex + 1}</span>
        </div>
        <div className="flex-1">
          {isActive && (
            <span className="text-[9px] font-bold text-primary-foreground bg-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider inline-block mb-0.5">Today</span>
          )}
          <span className={cn(
            "block font-medium text-sm",
            isActive ? "text-background/80" : "text-foreground/70"
          )}>
            {liveProgress
              ? `${liveProgress.done}/${liveProgress.total} done`
              : `${spotsCount} ${spotsCount === 1 ? "spot" : "spots"}`}
            {!liveProgress && dayTotal > 0 && ` · $${costLow}-${costHigh}/pp`}
          </span>
          {!isOpen && !liveProgress && vibeCategories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {vibeCategories.map((vibe) => (
                <span
                  key={vibe}
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
                    isActive
                      ? "bg-background/15 text-background/90"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {vibe}
                </span>
              ))}
            </div>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className={cn("w-4 h-4 shrink-0", isActive ? "text-background/60" : "text-foreground/60")} />
        ) : (
          <ChevronDown className={cn("w-4 h-4 shrink-0", isActive ? "text-background/60" : "text-foreground/60")} />
        )}
      </button>

      {isOpen && (
        <div className={cn("border-t", isActive ? "border-background/10" : "border-border")}>
          {day.slots.map((slot, slotIndex) => {
            const prevSlot = slotIndex > 0 ? day.slots[slotIndex - 1] : null;
            const prevLastActivity = prevSlot?.activities?.[prevSlot.activities.length - 1];
            const firstActivity = slot.activities?.[0];

            const crossSlotRoute = getRouteData(
              prevLastActivity?.lat, prevLastActivity?.lng,
              firstActivity?.lat, firstActivity?.lng
            );

            return (
              <div key={slotIndex}>
                {prevLastActivity && firstActivity && !isEditing && (
                  <div className={cn("border-t", isActive ? "border-background/10" : "border-border")}>
                    <DistanceConnector
                      fromLat={prevLastActivity.lat}
                      fromLng={prevLastActivity.lng}
                      toLat={firstActivity.lat}
                      toLng={firstActivity.lng}
                      durationText={crossSlotRoute?.durationText}
                      distanceText={crossSlotRoute?.distanceText}
                      isOnDark={isActive}
                    />
                  </div>
                )}

                <div className={cn(slotIndex > 0 && !prevLastActivity && (isActive ? "border-t border-foreground/10" : "border-t border-border"))}>
                  <div className={cn("px-4 py-2", isActive ? "bg-foreground/5" : "bg-muted/50")}>
                    <span className={cn(
                      "text-xs font-semibold uppercase tracking-wider text-left",
                      isActive ? "text-primary" : "text-foreground/60"
                    )}>
                      {TIME_LABELS[slot.time] || "—"} {slot.time}
                    </span>
                  </div>

                  {isEditing ? (
                    <DroppableSlot dayIndex={dayIndex} slotIndex={slotIndex}>
                      {slot.activities.map((activity, activityIndex) => (
                        <DraggableActivityCard
                          key={(activity as any)._dragId || `${dayIndex}-${slotIndex}-${activityIndex}`}
                          activity={activity}
                          dayIndex={dayIndex}
                          slotIndex={slotIndex}
                          activityIndex={activityIndex}
                          onSwap={onSwap}
                          onReplace={onReplace}
                          isSwapping={isSwapping}
                          onRemoveActivity={onRemoveActivity}
                          onMoveToDay={onMoveToDay ? (targetDayIdx) => onMoveToDay(dayIndex, slotIndex, activityIndex, targetDayIdx) : undefined}
                          availableDays={totalDays?.map((d, i) => ({ dayIndex: i, label: d.label }))}
                          currentDayIndex={dayIndex}
                          destination={destination}
                        />
                      ))}
                      {onAddActivity && (
                        <AddPlaceInput onAdd={(place) => onAddActivity(dayIndex, slotIndex, place)} />
                      )}
                    </DroppableSlot>
                  ) : (
                    <div className="px-3 py-2 space-y-2">
                      {slot.activities.map((activity, activityIndex) => {
                        const nextActivity = slot.activities[activityIndex + 1];
                        const routeData = getRouteData(
                          activity.lat, activity.lng,
                          nextActivity?.lat, nextActivity?.lng
                        );

                        let globalIdx = activityIndex;
                        for (let si = 0; si < slotIndex; si++) {
                          globalIdx += day.slots[si].activities.length;
                        }

                        const key = activityKey(dayIndex, slotIndex, activityIndex);
                        const liveStatus = checkedActivities?.[key] || null;
                        const isCurrent = key === currentActivityKey;

                        return (
                          <div key={activityIndex}>
                            <ActivityCard
                              activity={activity}
                              onSwap={() => onSwap(dayIndex, slotIndex, activityIndex)}
                              onReplace={(newAct) => onReplace(dayIndex, slotIndex, activityIndex, newAct)}
                              isSwapping={isSwapping}
                              cardIndex={globalIdx}
                              destination={destination}
                              isLive={isLive && isToday}
                              liveStatus={liveStatus}
                              isCurrentActivity={isCurrent}
                              onCheck={() => onToggleActivity?.(key, "done")}
                              onSkip={() => onToggleActivity?.(key, "skipped")}
                              onCancel={() => onToggleActivity?.(key, "cancelled")}
                              onUndo={() => onUndoActivity?.(key)}
                            />
                            {activityIndex < slot.activities.length - 1 && (
                              <DistanceConnector
                                fromLat={activity.lat}
                                fromLng={activity.lng}
                                toLat={nextActivity.lat}
                                toLng={nextActivity.lng}
                                durationText={routeData?.durationText}
                                distanceText={routeData?.distanceText}
                                isOnDark={isActive}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DaySection;
