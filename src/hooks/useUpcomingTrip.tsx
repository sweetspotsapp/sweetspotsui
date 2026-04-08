import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { differenceInDays, parseISO } from "date-fns";

interface UpcomingTrip {
  destination: string;
  daysUntil: number;
  id: string;
}

export const useUpcomingTrip = (): UpcomingTrip | null => {
  const { user } = useAuth();
  const [trip, setTrip] = useState<UpcomingTrip | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("trips")
        .select("id, destination, start_date")
        .eq("user_id", user.id)
        .gte("start_date", today)
        .order("start_date", { ascending: true })
        .limit(1);

      if (data && data.length > 0) {
        const daysUntil = differenceInDays(parseISO(data[0].start_date), new Date());
        setTrip({
          id: data[0].id,
          destination: data[0].destination,
          daysUntil: Math.max(0, daysUntil),
        });
      }
    };

    fetch();
  }, [user]);

  return trip;
};
