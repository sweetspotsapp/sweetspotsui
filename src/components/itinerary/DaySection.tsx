import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import ActivityCard from "./ActivityCard";
import DistanceConnector from "./DistanceConnector";
import type { ItineraryDay, Activity, SwapAlternative } from "@/hooks/useItinerary";

interface DaySectionProps {
  day: ItineraryDay;
  dayIndex: number;
  onSwap: (dayIndex: number, slotIndex: number, activityIndex: number) => Promise<SwapAlternative[] | undefined>;
  onReplace: (dayIndex: number, slotIndex: number, activityIndex: number, newActivity: { name: string; description: string; category: string }) => void;
  isSwapping: boolean;
  isEditing?: boolean;
  onMoveActivity?: (dayIndex: number, slotIndex: number, activityIndex: number, direction: 'up' | 'down') => void;
  isFirstDay?: boolean;
  isLastDay?: boolean;
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

const DaySection = ({ day, dayIndex, onSwap, onReplace, isSwapping, isEditing, onMoveActivity, isFirstDay, isLastDay }: DaySectionProps) => {
  const [isOpen, setIsOpen] = useState(true);
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

  const dayTotal = day.slots.reduce((total, slot) => 
    total + slot.activities.reduce((sum, a) => sum + (a.estimatedCost || 0), 0), 0
  );

  const isFirstActivity = (slotIndex: number, activityIndex: number) =>
    isFirstDay && slotIndex === 0 && activityIndex === 0;

  const isLastActivity = (slotIndex: number, activityIndex: number) =>
    isLastDay && slotIndex === day.slots.length - 1 && activityIndex === day.slots[slotIndex].activities.length - 1;

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-bold text-primary">{dayIndex + 1}</span>
        </div>
        <div className="flex-1">
          <span className="text-sm font-semibold text-foreground">{day.label}</span>
          <span className="text-xs text-muted-foreground block">
            {day.slots.reduce((acc, s) => acc + s.activities.length, 0)} activities
            {dayTotal > 0 && ` · ~$${dayTotal}/pp`}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border">
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
                  <div className="border-t border-border/30">
                    <DistanceConnector
                      fromLat={prevLastActivity.lat}
                      fromLng={prevLastActivity.lng}
                      toLat={firstActivity.lat}
                      toLng={firstActivity.lng}
                      durationText={crossSlotRoute?.durationText}
                      distanceText={crossSlotRoute?.distanceText}
                    />
                  </div>
                )}

                <div className={cn(slotIndex > 0 && !prevLastActivity && "border-t border-border/50")}>
                  <div className="px-4 py-2 bg-muted/20">
                    <span className="text-xs font-medium text-muted-foreground">
                      {TIME_LABELS[slot.time] || "—"} {slot.time}
                    </span>
                  </div>

                  <div className="px-3 py-2 space-y-2">
                    {slot.activities.map((activity, activityIndex) => {
                      const nextActivity = slot.activities[activityIndex + 1];
                      const routeData = getRouteData(
                        activity.lat, activity.lng,
                        nextActivity?.lat, nextActivity?.lng
                      );

                      return (
                        <div key={activityIndex}>
                          <ActivityCard
                            activity={activity}
                            onSwap={() => onSwap(dayIndex, slotIndex, activityIndex)}
                            onReplace={(newAct) => onReplace(dayIndex, slotIndex, activityIndex, newAct)}
                            isSwapping={isSwapping}
                            isEditing={isEditing}
                            onMoveUp={() => onMoveActivity?.(dayIndex, slotIndex, activityIndex, 'up')}
                            onMoveDown={() => onMoveActivity?.(dayIndex, slotIndex, activityIndex, 'down')}
                            canMoveUp={!isFirstActivity(slotIndex, activityIndex)}
                            canMoveDown={!isLastActivity(slotIndex, activityIndex)}
                          />
                          {!isEditing && activityIndex < slot.activities.length - 1 && (
                            <DistanceConnector
                              fromLat={activity.lat}
                              fromLng={activity.lng}
                              toLat={nextActivity.lat}
                              toLng={nextActivity.lng}
                              durationText={routeData?.durationText}
                              distanceText={routeData?.distanceText}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
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
