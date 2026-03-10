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

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("place-autocomplete", {
          body: { input: input.trim() },
        });

        if (error || !data?.suggestions) {
          console.error("Autocomplete proxy error, falling back to local cities:", error);
          setPredictions(getLocalCityMatches(input));
        } else {
          setPredictions(data.suggestions.length > 0 ? data.suggestions : getLocalCityMatches(input));
        }
      } catch (e) {
        console.error("Autocomplete error, falling back to local cities:", e);
        setPredictions(getLocalCityMatches(input));
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
