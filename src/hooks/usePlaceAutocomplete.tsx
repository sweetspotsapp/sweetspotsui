import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WORLD_CITIES } from "@/data/worldCities";

export interface Prediction {
  description: string;
  place_id: string;
  main_text: string;
  secondary_text: string;
}

function getLocalCityMatches(query: string): Prediction[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  return WORLD_CITIES
    .filter(c => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q))
    .slice(0, 8)
    .map(c => ({
      description: `${c.name}, ${c.country}`,
      place_id: `local_${c.name}_${c.country}`,
      main_text: c.name,
      secondary_text: c.country,
    }));
}

export function usePlaceAutocomplete(input: string) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (input.trim().length < 2) {
      setPredictions([]);
      setIsLoading(false);
      return;
    }

    // Show local matches immediately (no API call needed)
    const localMatches = getLocalCityMatches(input);
    if (localMatches.length > 0) {
      setPredictions(localMatches);
      setIsLoading(false);
      return;
    }

    // Only call Google if local data has no matches
    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("place-autocomplete", {
          body: { input: input.trim() },
        });

        if (error || !data?.suggestions) {
          console.error("Autocomplete proxy error:", error);
          setPredictions([]);
        } else {
          setPredictions(data.suggestions);
        }
      } catch (e) {
        console.error("Autocomplete error:", e);
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input]);
  return { predictions, isLoading, clearPredictions: () => setPredictions([]) };
}
