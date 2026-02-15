import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface Activity {
  name: string;
  time?: string;
  category: string;
  description: string;
  mustInclude?: boolean;
}

export interface TimeSlot {
  time: string;
  activities: Activity[];
}

export interface ItineraryDay {
  label: string;
  slots: TimeSlot[];
}

export interface ItineraryData {
  summary?: string;
  days: ItineraryDay[];
}

export interface TripParams {
  name?: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: string;
  groupSize: number;
  vibes: string[];
  mustIncludePlaceIds: string[];
  boardIds: string[];
  accommodation?: {
    name?: string;
    address?: string;
    checkIn?: string;
    checkOut?: string;
  };
  flightDetails?: {
    outbound?: string;
    returnFlight?: string;
    price?: number;
  };
}

export interface SavedItinerary {
  id: string;
  name: string | null;
  destination: string;
  start_date: string;
  end_date: string;
  budget: string;
  group_size: number;
  vibes: string[];
  must_include_place_ids: string[];
  board_ids: string[];
  itinerary_data: ItineraryData | null;
  accommodation: { name?: string; address?: string; checkIn?: string; checkOut?: string } | null;
  flight_details: { outbound?: string; returnFlight?: string; price?: number } | null;
  created_at: string;
  updated_at: string;
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [savedItineraries, setSavedItineraries] = useState<SavedItinerary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadItineraries = useCallback(async () => {
    if (!user) { setSavedItineraries([]); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("itineraries")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setSavedItineraries((data || []).map(d => ({
        ...d,
        itinerary_data: d.itinerary_data as unknown as ItineraryData | null,
        accommodation: d.accommodation as unknown as SavedItinerary['accommodation'],
        flight_details: d.flight_details as unknown as SavedItinerary['flight_details'],
      })));
    } catch (err) {
      console.error("Error loading itineraries:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadItineraries(); }, [loadItineraries]);

  const saveItinerary = async (params: TripParams, itineraryData: ItineraryData, existingId?: string): Promise<string | null> => {
    if (!user) { toast({ title: "Login required", description: "Please log in to save itineraries.", variant: "destructive" }); return null; }
    try {
      const record: any = {
        user_id: user.id,
        name: params.name || null,
        destination: params.destination,
        start_date: params.startDate,
        end_date: params.endDate,
        budget: params.budget,
        group_size: params.groupSize,
        vibes: params.vibes,
        must_include_place_ids: params.mustIncludePlaceIds,
        board_ids: params.boardIds,
        itinerary_data: JSON.parse(JSON.stringify(itineraryData)),
        accommodation: params.accommodation ? JSON.parse(JSON.stringify(params.accommodation)) : null,
        flight_details: params.flightDetails ? JSON.parse(JSON.stringify(params.flightDetails)) : null,
      };

      if (existingId) {
        const { error } = await supabase.from("itineraries").update(record).eq("id", existingId).eq("user_id", user.id);
        if (error) throw error;
        toast({ title: "Itinerary updated" });
        await loadItineraries();
        return existingId;
      } else {
        const { data, error } = await supabase.from("itineraries").insert(record).select("id").single();
        if (error) throw error;
        toast({ title: "Itinerary saved" });
        await loadItineraries();
        return data.id;
      }
    } catch (err) {
      console.error("Error saving itinerary:", err);
      toast({ title: "Save failed", description: "Could not save itinerary.", variant: "destructive" });
      return null;
    }
  };

  const deleteItinerary = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("itineraries").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      setSavedItineraries(prev => prev.filter(i => i.id !== id));
      toast({ title: "Itinerary deleted" });
    } catch (err) {
      console.error("Error deleting itinerary:", err);
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const generate = async (params: TripParams): Promise<ItineraryData | null> => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-itinerary", { body: params });
      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast({ title: "Too many requests", description: "Please wait a moment and try again.", variant: "destructive" });
        } else if (data.error.includes("Payment")) {
          toast({ title: "Credits needed", description: "Please add credits to continue.", variant: "destructive" });
        } else { throw new Error(data.error); }
        return null;
      }
      return data as ItineraryData;
    } catch (err) {
      console.error("Error generating itinerary:", err);
      toast({ title: "Generation failed", description: "Could not generate your itinerary. Please try again.", variant: "destructive" });
      return null;
    } finally { setIsGenerating(false); }
  };

  const swap = async (params: SwapParams): Promise<SwapAlternative[]> => {
    setIsSwapping(true);
    try {
      const { data, error } = await supabase.functions.invoke("swap-itinerary-activity", { body: params });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data?.alternatives || []) as SwapAlternative[];
    } catch (err) {
      console.error("Error swapping activity:", err);
      toast({ title: "Swap failed", description: "Could not load alternatives.", variant: "destructive" });
      return [];
    } finally { setIsSwapping(false); }
  };

  return {
    generate, swap, isGenerating, isSwapping,
    savedItineraries, isLoading, loadItineraries,
    saveItinerary, deleteItinerary,
  };
};
