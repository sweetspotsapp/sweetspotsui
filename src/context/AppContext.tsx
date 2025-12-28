import { useState, createContext, useContext, ReactNode, useCallback } from "react";
import { extractVibes } from "@/data/mockPlaces";
import type { RankedPlace } from "@/hooks/useSearch";

export interface PlaceCategory {
  id: string;
  name: string;
  placeIds: string[];
  color: string;
  createdAt: Date;
}

interface AppContextType {
  // Ranked places from API
  rankedPlaces: RankedPlace[];
  setRankedPlaces: (places: RankedPlace[]) => void;
  
  // Saved places (local)
  savedPlaceIds: Set<string>;
  toggleSave: (placeId: string) => void;
  isSaved: (placeId: string) => boolean;
  
  // User mood/vibes
  userMood: string;
  setUserMood: (mood: string) => void;
  userVibes: string[];
  
  // Onboarding state
  hasCompletedOnboarding: boolean;
  completeOnboarding: (mood: string, places: RankedPlace[]) => void;
  resetOnboarding: () => void;
  
  // Travel mode
  travelMode: "drive" | "walk" | "bike";
  setTravelMode: (mode: "drive" | "walk" | "bike") => void;
  
  // Custom categories
  categories: PlaceCategory[];
  createCategory: (name: string, placeIds: string[], color: string) => void;
  updateCategory: (id: string, name: string, placeIds: string[]) => void;
  deleteCategory: (id: string) => void;
  getCategoryPlaces: (categoryId: string) => RankedPlace[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const categoryColors = [
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-red-500 to-rose-600",
];

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [rankedPlaces, setRankedPlaces] = useState<RankedPlace[]>([]);
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());
  const [userMood, setUserMood] = useState("");
  const [userVibes, setUserVibes] = useState<string[]>([]);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [travelMode, setTravelMode] = useState<"drive" | "walk" | "bike">("drive");
  const [categories, setCategories] = useState<PlaceCategory[]>([]);

  const toggleSave = useCallback((placeId: string) => {
    setSavedPlaceIds(prev => {
      const next = new Set(prev);
      if (next.has(placeId)) {
        next.delete(placeId);
      } else {
        next.add(placeId);
      }
      return next;
    });
  }, []);

  const isSaved = useCallback((placeId: string) => savedPlaceIds.has(placeId), [savedPlaceIds]);

  const completeOnboarding = useCallback((mood: string, places: RankedPlace[]) => {
    setUserMood(mood);
    setUserVibes(extractVibes(mood));
    setRankedPlaces(places);
    setHasCompletedOnboarding(true);
  }, []);

  const resetOnboarding = useCallback(() => {
    setHasCompletedOnboarding(false);
    setUserMood("");
    setUserVibes([]);
    setRankedPlaces([]);
  }, []);

  const createCategory = useCallback((name: string, placeIds: string[], color: string) => {
    const newCategory: PlaceCategory = {
      id: Date.now().toString(),
      name,
      placeIds,
      color: color || categoryColors[categories.length % categoryColors.length],
      createdAt: new Date(),
    };
    setCategories(prev => [...prev, newCategory]);
  }, [categories.length]);

  const updateCategory = useCallback((id: string, name: string, placeIds: string[]) => {
    setCategories(prev => prev.map(cat => 
      cat.id === id ? { ...cat, name, placeIds } : cat
    ));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
  }, []);

  const getCategoryPlaces = useCallback((categoryId: string): RankedPlace[] => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return [];
    return category.placeIds
      .map(id => rankedPlaces.find(p => p.place_id === id))
      .filter((p): p is RankedPlace => p !== undefined);
  }, [categories, rankedPlaces]);

  return (
    <AppContext.Provider value={{ 
      rankedPlaces,
      setRankedPlaces,
      savedPlaceIds,
      toggleSave, 
      isSaved, 
      userMood, 
      setUserMood, 
      userVibes,
      hasCompletedOnboarding,
      completeOnboarding,
      resetOnboarding,
      travelMode,
      setTravelMode,
      categories,
      createCategory,
      updateCategory,
      deleteCategory,
      getCategoryPlaces,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
