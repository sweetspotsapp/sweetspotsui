import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { differenceInDays, isWithinInterval, startOfDay } from "date-fns";

// Parse date-only string (YYYY-MM-DD) as local midnight, not UTC
const parseLocalDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

interface UpcomingTrip {
  destination: string;
  daysUntil: number;
  id: string;
}

interface LiveTrip {
  destination: string;
  id: string;
  currentDay: number;
  totalDays: number;
}

interface TripStatus {
  type: "upcoming" | "live";
  upcoming?: UpcomingTrip;
  live?: LiveTrip;
}

export const useUpcomingTrip = (): TripStatus | null => {
  const { user } = useAuth();
  const [status, setStatus] = useState<TripStatus | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchTrips = async () => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      // Fetch trips that are current or upcoming
      const { data } = await supabase
        .from("trips")
        .select("id, destination, start_date, end_date, trip_data, status")
        .eq("user_id", user.id)
        .neq("status", "completed")
        .gte("end_date", todayStr)
        .order("start_date", { ascending: true })
        .limit(5);

      if (!data || data.length === 0) return;

      // Check for live trip first
      const todayStart = startOfDay(today);
      const liveTrip = data.find((t) => {
        try {
          const start = startOfDay(parseISO(t.start_date));
          const end = startOfDay(parseISO(t.end_date));
          return isWithinInterval(todayStart, { start, end });
        } catch {
          return false;
        }
      });

      if (liveTrip) {
        const currentDay = differenceInDays(todayStart, startOfDay(parseISO(liveTrip.start_date))) + 1;
        const totalDays = (liveTrip.trip_data as any)?.days?.length || 
          differenceInDays(parseISO(liveTrip.end_date), parseISO(liveTrip.start_date)) + 1;
        setStatus({
          type: "live",
          live: {
            id: liveTrip.id,
            destination: liveTrip.destination,
            currentDay,
            totalDays,
          },
        });
        return;
      }

      // Otherwise find upcoming (start_date is in the future)
      const upcoming = data.find((t) => startOfDay(parseISO(t.start_date)) > todayStart);
      if (upcoming) {
        const daysUntil = differenceInDays(startOfDay(parseISO(upcoming.start_date)), todayStart);
        setStatus({
          type: "upcoming",
          upcoming: {
            id: upcoming.id,
            destination: upcoming.destination,
            daysUntil: Math.max(0, daysUntil),
          },
        });
        return;
      }

      // Edge case: trip starts today but isWithinInterval missed it (e.g. no end_date issue)
      const startsToday = data.find((t) => {
        try {
          return startOfDay(parseISO(t.start_date)).getTime() === todayStart.getTime();
        } catch { return false; }
      });
      if (startsToday) {
        const totalDays = (startsToday.trip_data as any)?.days?.length ||
          differenceInDays(parseISO(startsToday.end_date), parseISO(startsToday.start_date)) + 1;
        setStatus({
          type: "live",
          live: {
            id: startsToday.id,
            destination: startsToday.destination,
            currentDay: 1,
            totalDays,
          },
        });
      }
    };

    fetchTrips();
  }, [user]);

  return status;
};
