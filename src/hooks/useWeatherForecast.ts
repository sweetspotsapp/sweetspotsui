import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DayForecast {
  icon: "clear" | "clouds" | "rain" | "thunderstorm" | "snow";
  tempHigh: number;
  tempLow: number;
  summary: string;
}

export function useWeatherForecast(destination: string | null) {
  const [forecast, setForecast] = useState<Map<string, DayForecast>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!destination || destination === "Nearby" || destination.trim().length < 3) {
      setForecast(new Map());
      return;
    }

    const normalised = destination.toLowerCase().trim();
    if (fetchedRef.current === normalised) return;

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("trip-weather", {
          body: { destination },
        });

        if (cancelled) return;

        if (error || !data?.daily) {
          setForecast(new Map());
          return;
        }

        const map = new Map<string, DayForecast>();
        for (const d of data.daily) {
          map.set(d.date, {
            icon: d.icon,
            tempHigh: d.temp_high,
            tempLow: d.temp_low,
            summary: d.summary,
          });
        }
        setForecast(map);
        fetchedRef.current = normalised;
      } catch {
        if (!cancelled) setForecast(new Map());
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [destination]);

  return { forecast, isLoading };
}
