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
  estimatedCost?: number;
  photoName?: string;
  lat?: number;
  lng?: number;
  address?: string;
  placeId?: string;
}

export interface TimeSlot {
  time: string;
  activities: Activity[];
}

export interface TripDay {
  label: string;
  slots: TimeSlot[];
}

export interface TripData {
  summary?: string;
  days: TripDay[];
}

export interface AccommodationEntry {
  name?: string;
  address?: string;
  checkIn?: string;
  checkOut?: string;
  cost?: number;
  currency?: string;
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
  accommodations?: AccommodationEntry[];
  flightDetails?: {
    outbound?: string;
    returnFlight?: string;
    price?: number;
    currency?: string;
  };
}

export interface SavedTrip {
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
  trip_data: TripData | null;
  accommodation: AccommodationEntry[] | null;
  flight_details: { outbound?: string; returnFlight?: string; price?: number; currency?: string } | null;
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

const LOCAL_STORAGE_KEY = "sweetspots_local_trips";

const loadLocalTrips = (): SavedTrip[] => {
  try {
    // Try new key first, fall back to old key for migration
    let raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem("sweetspots_local_itineraries");
      if (raw) {
        // Migrate old data
        localStorage.setItem(LOCAL_STORAGE_KEY, raw);
        localStorage.removeItem("sweetspots_local_itineraries");
      }
    }
    if (!raw) return [];
    // Map old itinerary_data field to trip_data
    const parsed = JSON.parse(raw);
    return parsed.map((item: any) => ({
      ...item,
      trip_data: item.trip_data || item.itinerary_data || null,
    }));
  } catch { return []; }
};

const saveLocalTrips = (items: SavedTrip[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch { /* storage full – silently fail */ }
};

export const useTrip = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTrips = useCallback(async () => {
    if (!user) {
      setSavedTrips(loadLocalTrips());
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("trips" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setSavedTrips(((data as any[]) || []).map((d: any) => ({
        ...d,
        trip_data: (d.trip_data || d.itinerary_data) as TripData | null,
        accommodation: d.accommodation as SavedTrip['accommodation'],
        flight_details: d.flight_details as SavedTrip['flight_details'],
      })));
    } catch (err) {
      console.error("Error loading trips:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const saveTrip = async (params: TripParams, tripData: TripData, existingId?: string): Promise<string | null> => {
    if (!user) {
      const now = new Date().toISOString();
      const localItems = loadLocalTrips();

      if (existingId) {
        const updated = localItems.map(item =>
          item.id === existingId
            ? {
                ...item,
                name: params.name || null,
                destination: params.destination,
                start_date: params.startDate,
                end_date: params.endDate,
                budget: params.budget,
                group_size: params.groupSize,
                vibes: params.vibes,
                must_include_place_ids: params.mustIncludePlaceIds,
                board_ids: params.boardIds,
                trip_data: tripData,
                accommodation: params.accommodations || null,
                flight_details: params.flightDetails || null,
                updated_at: now,
              }
            : item
        );
        saveLocalTrips(updated);
        setSavedTrips(updated);
        toast({ title: "Trip updated" });
        return existingId;
      } else {
        const newId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const newItem: SavedTrip = {
          id: newId,
          name: params.name || null,
          destination: params.destination,
          start_date: params.startDate,
          end_date: params.endDate,
          budget: params.budget,
          group_size: params.groupSize,
          vibes: params.vibes,
          must_include_place_ids: params.mustIncludePlaceIds,
          board_ids: params.boardIds,
          trip_data: tripData,
          accommodation: params.accommodations || null,
          flight_details: params.flightDetails || null,
          created_at: now,
          updated_at: now,
        };
        const updated = [newItem, ...localItems];
        saveLocalTrips(updated);
        setSavedTrips(updated);
        toast({ title: "Trip saved locally" });
        return newId;
      }
    }
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
        trip_data: JSON.parse(JSON.stringify(tripData)),
        accommodation: params.accommodations ? JSON.parse(JSON.stringify(params.accommodations)) : null,
        flight_details: params.flightDetails ? JSON.parse(JSON.stringify(params.flightDetails)) : null,
      };

      if (existingId) {
        const { error } = await (supabase.from("trips" as any) as any).update(record).eq("id", existingId).eq("user_id", user.id);
        if (error) throw error;
        toast({ title: "Trip updated" });
        await loadTrips();
        return existingId;
      } else {
        const { data, error } = await (supabase.from("trips" as any) as any).insert(record).select("id").single();
        if (error) throw error;
        toast({ title: "Trip saved" });
        await loadTrips();
        return data.id;
      }
    } catch (err) {
      console.error("Error saving trip:", err);
      toast({ title: "Save failed", description: "Could not save trip.", variant: "destructive" });
      return null;
    }
  };

  const deleteTrip = async (id: string) => {
    if (!user) {
      const updated = loadLocalTrips().filter(i => i.id !== id);
      saveLocalTrips(updated);
      setSavedTrips(updated);
      toast({ title: "Trip deleted" });
      return;
    }
    try {
      const { error } = await (supabase.from("trips" as any) as any).delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      setSavedTrips(prev => prev.filter(i => i.id !== id));
      toast({ title: "Trip deleted" });
    } catch (err) {
      console.error("Error deleting trip:", err);
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const generate = async (params: TripParams): Promise<TripData | null> => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-trip", { body: params });
      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast({ title: "Too many requests", description: "Please wait a moment and try again.", variant: "destructive" });
        } else if (data.error.includes("Payment")) {
          toast({ title: "Credits needed", description: "Please add credits to continue.", variant: "destructive" });
        } else { throw new Error(data.error); }
        return null;
      }
      return data as TripData;
    } catch (err) {
      console.error("Error generating trip:", err);
      toast({ title: "Generation failed", description: "Could not generate your trip. Please try again.", variant: "destructive" });
      return null;
    } finally { setIsGenerating(false); }
  };

  const swap = async (params: SwapParams): Promise<SwapAlternative[]> => {
    setIsSwapping(true);
    try {
      const { data, error } = await supabase.functions.invoke("swap-trip-activity", { body: params });
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
    savedTrips, isLoading, loadTrips,
    saveTrip, deleteTrip,
  };
};