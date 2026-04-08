import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useRecentSearches = () => {
  const { user } = useAuth();
  const [searches, setSearches] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      const { data } = await supabase
        .from("searches")
        .select("prompt")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        // Deduplicate by lowercase, keep original casing of first occurrence
        const seen = new Set<string>();
        const unique: string[] = [];
        for (const row of data) {
          const key = row.prompt.toLowerCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(row.prompt.trim());
          }
          if (unique.length >= 5) break;
        }
        setSearches(unique);
      }
    };

    fetch();
  }, [user]);

  return searches;
};
