import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { SavedTrip, TripData } from "./useTrip";
import { parseISO, differenceInDays, isWithinInterval, startOfDay } from "date-fns";

export type ActivityStatus = "done" | "cancelled" | "skipped";

export interface LiveTripInfo {
  isLive: boolean;
  trip: SavedTrip | null;
  currentDayIndex: number;
  totalDays: number;
  dayLabel: string;
  progress: { done: number; total: number; percentage: number };
  nextActivityName: string | null;
  checkedActivities: Record<string, ActivityStatus>;
  toggleActivity: (key: string, status: ActivityStatus) => void;
  undoActivity: (key: string) => void;
}

/** Build activity key from indices */
export const activityKey = (dayIdx: number, slotIdx: number, actIdx: number) =>
  `${dayIdx}-${slotIdx}-${actIdx}`;

export const useLiveTrip = (trips: SavedTrip[]): LiveTripInfo => {
  const { user } = useAuth();
  const [checkedActivities, setCheckedActivities] = useState<Record<string, ActivityStatus>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const tripIdRef = useRef<string | null>(null);

  // Find the active trip
  const liveTrip = useMemo(() => {
    const today = startOfDay(new Date());
    return trips.find((t) => {
      try {
        const start = startOfDay(parseISO(t.start_date));
        const end = startOfDay(parseISO(t.end_date));
        return isWithinInterval(today, { start, end });
      } catch {
        return false;
      }
    }) || null;
  }, [trips]);

  const currentDayIndex = useMemo(() => {
    if (!liveTrip) return 0;
    const today = startOfDay(new Date());
    const start = startOfDay(parseISO(liveTrip.start_date));
    return Math.max(0, differenceInDays(today, start));
  }, [liveTrip]);

  // Load checked_activities from DB when trip changes
  useEffect(() => {
    if (!liveTrip) {
      setCheckedActivities({});
      tripIdRef.current = null;
      return;
    }
    if (tripIdRef.current === liveTrip.id) return;
    tripIdRef.current = liveTrip.id;

    const raw = (liveTrip as any).checked_activities;
    if (raw && typeof raw === "object") {
      setCheckedActivities(raw as Record<string, ActivityStatus>);
    } else {
      setCheckedActivities({});
    }
  }, [liveTrip]);

  // Debounced persistence
  const persistChecked = useCallback(
    (updated: Record<string, ActivityStatus>) => {
      if (!user || !liveTrip) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        await (supabase.from("trips" as any) as any)
          .update({ checked_activities: updated })
          .eq("id", liveTrip.id)
          .eq("user_id", user.id);
      }, 500);
    },
    [user, liveTrip]
  );

  const toggleActivity = useCallback(
    (key: string, status: ActivityStatus) => {
      setCheckedActivities((prev) => {
        const next = { ...prev };
        if (next[key] === status) {
          delete next[key];
        } else {
          next[key] = status;
        }
        persistChecked(next);
        return next;
      });
    },
    [persistChecked]
  );

  const undoActivity = useCallback(
    (key: string) => {
      setCheckedActivities((prev) => {
        const next = { ...prev };
        delete next[key];
        persistChecked(next);
        return next;
      });
    },
    [persistChecked]
  );

  // Compute progress for current day (excludes cancelled from total)
  const progress = useMemo(() => {
    if (!liveTrip?.trip_data?.days) return { done: 0, total: 0, percentage: 0 };
    const day = liveTrip.trip_data.days[currentDayIndex];
    if (!day) return { done: 0, total: 0, percentage: 0 };

    let total = 0;
    let done = 0;
    day.slots.forEach((slot, si) => {
      slot.activities.forEach((_, ai) => {
        const key = activityKey(currentDayIndex, si, ai);
        const status = checkedActivities[key];
        if (status === "cancelled") return; // excluded
        total++;
        if (status === "done" || status === "skipped") done++;
      });
    });

    return { done, total, percentage: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [liveTrip, currentDayIndex, checkedActivities]);

  // Next unchecked activity name
  const nextActivityName = useMemo(() => {
    if (!liveTrip?.trip_data?.days) return null;
    const day = liveTrip.trip_data.days[currentDayIndex];
    if (!day) return null;

    for (let si = 0; si < day.slots.length; si++) {
      for (let ai = 0; ai < day.slots[si].activities.length; ai++) {
        const key = activityKey(currentDayIndex, si, ai);
        if (!checkedActivities[key]) {
          return day.slots[si].activities[ai].name;
        }
      }
    }
    return null;
  }, [liveTrip, currentDayIndex, checkedActivities]);

  const totalDays = liveTrip?.trip_data?.days?.length || 0;
  const dayLabel = liveTrip?.trip_data?.days?.[currentDayIndex]?.label || `Day ${currentDayIndex + 1}`;

  return {
    isLive: !!liveTrip,
    trip: liveTrip,
    currentDayIndex,
    totalDays,
    dayLabel,
    progress,
    nextActivityName,
    checkedActivities,
    toggleActivity,
    undoActivity,
  };
};
