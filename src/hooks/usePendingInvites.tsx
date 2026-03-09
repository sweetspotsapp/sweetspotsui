import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const usePendingInvites = () => {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [seen, setSeen] = useState(false);

  const fetchCount = useCallback(async () => {
    if (!user) { setPendingCount(0); return; }
    try {
      const { count, error } = await (supabase
        .from("shared_trips") as any)
        .select("id", { count: "exact", head: true })
        .eq("shared_with", user.id)
        .eq("status", "pending");
      if (!error && count !== null) setPendingCount(count);
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  const markSeen = useCallback(() => {
    setSeen(true);
  }, []);

  // Return 0 if user has already visited the tab this session
  return {
    pendingCount: seen ? 0 : pendingCount,
    rawCount: pendingCount,
    markSeen,
    refetch: fetchCount,
  };
};
