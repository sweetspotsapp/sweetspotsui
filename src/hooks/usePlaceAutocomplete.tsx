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

// Cache the API key so we only fetch it once per session
let cachedApiKey: string | null = null;

async function getMapsApiKey(): Promise<string | null> {
  if (cachedApiKey) return cachedApiKey;
  try {
    const { data, error } = await supabase.functions.invoke("get-maps-key");
    if (!error && data?.apiKey) {
      cachedApiKey = data.apiKey;
      return cachedApiKey;
    }
  } catch (e) {
    console.error("Failed to fetch Maps API key:", e);
  }
  return null;
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
        const apiKey = await getMapsApiKey();
        if (!apiKey) {
          setPredictions([]);
          return;
        }

        const response = await fetch(
          "https://places.googleapis.com/v1/places:autocomplete",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
            },
            body: JSON.stringify({ input: input.trim() }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          console.error("Google Autocomplete error, falling back to local cities:", data);
          setPredictions(getLocalCityMatches(input));
          setIsLoading(false);
          return;
        }

        const predictions = (data.suggestions || [])
          .filter((s: any) => s.placePrediction)
          .slice(0, 8)
          .map((s: any) => {
            const p = s.placePrediction;
            return {
              description: p.text?.text || "",
              place_id: p.placeId || "",
              main_text: p.structuredFormat?.mainText?.text || p.text?.text || "",
              secondary_text: p.structuredFormat?.secondaryText?.text || "",
            };
          });

        setPredictions(predictions);
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
