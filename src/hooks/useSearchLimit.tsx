import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const FREE_DAILY_LIMIT = 5;
const ADMIN_USER_IDS = ["335117fc-f79d-474a-87b7-6abfdd462eb3"];

interface UseSearchLimitReturn {
  searchesUsed: number;
  searchesLeft: number;
  dailyLimit: number;
  hasReachedLimit: boolean;
  isLoading: boolean;
  increment: () => void;
  refresh: () => Promise<void>;
}

export const useSearchLimit = (): UseSearchLimitReturn => {
  const { user } = useAuth();
  const [searchesUsed, setSearchesUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTodayCount = useCallback(async () => {
    if (!user) {
      setSearchesUsed(0);
      setIsLoading(false);
      return;
    }

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from("searches")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", todayStart.toISOString());

      if (!error && count !== null) {
        setSearchesUsed(count);
      }
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

  const isAdmin = !!user && ADMIN_USER_IDS.includes(user.id);
  const searchesLeft = isAdmin ? Infinity : Math.max(0, FREE_DAILY_LIMIT - searchesUsed);

  return {
    searchesUsed,
    searchesLeft,
    dailyLimit: FREE_DAILY_LIMIT,
    hasReachedLimit: isAdmin ? false : searchesUsed >= FREE_DAILY_LIMIT,
    isLoading,
    increment,
    refresh: fetchTodayCount,
  };
};
