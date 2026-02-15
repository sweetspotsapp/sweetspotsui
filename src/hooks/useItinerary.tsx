import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export interface Activity {
  name: string;
  time?: string;
  category: string;
  description: string;
  mustInclude?: boolean;
}

export interface TimeSlot {
  time: string; // "Morning" | "Afternoon" | "Evening"
  activities: Activity[];
}

export interface ItineraryDay {
  label: string; // "Day 1 - Mon, Mar 3"
  slots: TimeSlot[];
}

export interface ItineraryData {
  summary?: string;
  days: ItineraryDay[];
}

export interface TripParams {
  destination: string;
  startDate: string;
  endDate: string;
  budget: string;
  groupSize: number;
  vibes: string[];
  mustIncludePlaceIds: string[];
  boardIds: string[];
}

export interface SwapAlternative {
  name: string;
  description: string;
  category: string;
  reasoning?: string;
}

interface SwapParams {
  destination: string;
  vibes: string[];
  budget: string;
  dayLabel: string;
  timeSlot: string;
  currentActivity: string;
  category: string;
}

export const useItinerary = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  const generate = async (params: TripParams): Promise<ItineraryData | null> => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-itinerary", {
        body: params,
      });

      if (error) throw error;
      
      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast({ title: "Too many requests", description: "Please wait a moment and try again.", variant: "destructive" });
        } else if (data.error.includes("Payment")) {
          toast({ title: "Credits needed", description: "Please add credits to continue.", variant: "destructive" });
        } else {
          throw new Error(data.error);
        }
        return null;
      }

      return data as ItineraryData;
    } catch (err) {
      console.error("Error generating itinerary:", err);
      toast({ title: "Generation failed", description: "Could not generate your itinerary. Please try again.", variant: "destructive" });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const swap = async (params: SwapParams): Promise<SwapAlternative[]> => {
    setIsSwapping(true);
    try {
      const { data, error } = await supabase.functions.invoke("swap-itinerary-activity", {
        body: params,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return (data?.alternatives || []) as SwapAlternative[];
    } catch (err) {
      console.error("Error swapping activity:", err);
      toast({ title: "Swap failed", description: "Could not load alternatives.", variant: "destructive" });
      return [];
    } finally {
      setIsSwapping(false);
    }
  };

  return { generate, swap, isGenerating, isSwapping };
};
