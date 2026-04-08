import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const saveCounts = new Map<string, number>();
const fetchedKeys = new Set<string>();

export const usePlaceSaveCounts = (placeIds: string[]) => {
  const [counts, setCounts] = useState<Record<string, number>>({});

  const fetchCounts = useCallback(async (ids: string[]) => {
    // Only fetch IDs we haven't fetched yet
    const newIds = ids.filter((id) => !fetchedKeys.has(id));
    if (newIds.length === 0) {
      // Return cached
      const cached: Record<string, number> = {};
      ids.forEach((id) => {
        cached[id] = saveCounts.get(id) || 0;
      });
      setCounts(cached);
      return;
    }

    try {
      const { data, error } = await supabase.rpc("get_place_save_counts", {
        place_ids: newIds,
      });

      if (!error && data) {
        (data as { place_id: string; save_count: number }[]).forEach((row) => {
          saveCounts.set(row.place_id, row.save_count);
          fetchedKeys.add(row.place_id);
        });
        // Mark unfound IDs as 0
        newIds.forEach((id) => {
          if (!saveCounts.has(id)) {
            saveCounts.set(id, 0);
            fetchedKeys.add(id);
          }
        });
      }
    } catch (err) {
      console.error("Failed to fetch save counts:", err);
    }

    const result: Record<string, number> = {};
    ids.forEach((id) => {
      result[id] = saveCounts.get(id) || 0;
    });
    setCounts(result);
  }, []);

  useEffect(() => {
    if (placeIds.length > 0) {
      fetchCounts(placeIds);
    }
  }, [placeIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return counts;
};
