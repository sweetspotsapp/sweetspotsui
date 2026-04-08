import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const FREE_DAILY_LIMIT = 5;

interface UseSearchLimitReturn {
  searchesUsed: number;
  searchesLeft: number;
  dailyLimit: number;
  hasReachedLimit: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  increment: () => void;
  refresh: () => Promise<void>;
}

export const useSearchLimit = (isPro: boolean = false): UseSearchLimitReturn => {
  const { user } = useAuth();
  const [searchesUsed, setSearchesUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchTodayCount = useCallback(async () => {
    if (!user) {
      setSearchesUsed(0);
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Fetch search count and admin role in parallel
      const [countResult, roleResult] = await Promise.all([
        supabase
          .from("searches")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", todayStart.toISOString()),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle(),
      ]);

      if (!countResult.error && countResult.count !== null) {
        setSearchesUsed(countResult.count);
      }
      setIsAdmin(!!roleResult.data);
    } catch (err) {
      console.error("Failed to fetch search count:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTodayCount();
  }, [fetchTodayCount]);

  const increment = useCallback(() => {
    setSearchesUsed((prev) => prev + 1);
  }, []);

  const isUnlimited = isAdmin || isPro;
  const searchesLeft = isUnlimited ? Infinity : Math.max(0, FREE_DAILY_LIMIT - searchesUsed);

  return {
    searchesUsed,
    searchesLeft,
    dailyLimit: FREE_DAILY_LIMIT,
    hasReachedLimit: isUnlimited ? false : searchesUsed >= FREE_DAILY_LIMIT,
    isLoading,
    isAdmin,
    increment,
    refresh: fetchTodayCount,
  };
};
