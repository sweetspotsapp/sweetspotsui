import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Prediction {
  description: string;
  place_id: string;
  main_text: string;
  secondary_text: string;
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
        if (!error && data?.predictions) {
          setPredictions(data.predictions);
        } else {
          setPredictions([]);
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
