import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const FREE_MONTHLY_LIMIT = 3;

interface UseTripLimitReturn {
  tripsUsedThisMonth: number;
  tripsLeft: number;
  monthlyLimit: number;
  hasReachedLimit: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  increment: () => void;
  refresh: () => Promise<void>;
}

export const useTripLimit = (isPro: boolean = false): UseTripLimitReturn => {
  const { user } = useAuth();
  const [tripsUsed, setTripsUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchMonthCount = useCallback(async () => {
    if (!user) {
      setTripsUsed(0);
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [countResult, roleResult] = await Promise.all([
        supabase
          .from("trips")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", monthStart.toISOString()),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle(),
      ]);

      if (!countResult.error && countResult.count !== null) {
        setTripsUsed(countResult.count);
      }
      setIsAdmin(!!roleResult.data);
    } catch (err) {
      console.error("Failed to fetch trip count:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMonthCount();
  }, [fetchMonthCount]);

  const increment = useCallback(() => {
    setTripsUsed((prev) => prev + 1);
  }, []);

  const isUnlimited = isAdmin || isPro;
  const tripsLeft = isUnlimited ? Infinity : Math.max(0, FREE_MONTHLY_LIMIT - tripsUsed);

  return {
    tripsUsedThisMonth: tripsUsed,
    tripsLeft,
    monthlyLimit: FREE_MONTHLY_LIMIT,
    hasReachedLimit: isUnlimited ? false : tripsUsed >= FREE_MONTHLY_LIMIT,
    isLoading,
    isAdmin,
    increment,
    refresh: fetchMonthCount,
  };
};
