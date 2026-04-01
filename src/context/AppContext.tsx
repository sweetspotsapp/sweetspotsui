import { useState, createContext, useContext, ReactNode, useCallback } from "react";
import type { RankedPlace } from "@/hooks/useSearch";
import { useSavedPlaces } from "@/hooks/useSavedPlaces";
import { useAuth } from "@/hooks/useAuth";

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
  
  // Saved places (synced with Supabase)
  savedPlaceIds: Set<string>;
  toggleSave: (placeId: string) => Promise<void>;
  isSaved: (placeId: string) => boolean;
  removeSavedPlaceIds: (placeIds: string[]) => void;
  isLoadingSavedPlaces: boolean;
  
  // Auth dialog for saving
  showAuthDialog: boolean;
  setShowAuthDialog: (show: boolean) => void;
  pendingSavePlaceId: string | null;
  
  // Free actions tracking for soft wall
  freeActionsUsed: number;
  incrementFreeActions: () => void;
  hasExceededFreeActions: () => boolean;
  
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
  const { user } = useAuth();
  const { savedPlaceIds, toggleSave: originalToggleSave, isSaved, isLoading: isLoadingSavedPlaces, removePlaceIds } = useSavedPlaces();

  const [rankedPlaces, setRankedPlaces] = useState<RankedPlace[]>([]);
  const [travelMode, setTravelMode] = useState<"drive" | "walk" | "bike">("drive");
  const [categories, setCategories] = useState<PlaceCategory[]>([]);
  
  // Auth dialog state for prompting login when saving
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [pendingSavePlaceId, setPendingSavePlaceId] = useState<string | null>(null);
  
  // Free actions tracking for soft wall (persisted in sessionStorage)
  const [freeActionsUsed, setFreeActionsUsed] = useState<number>(() => {
    try {
      const stored = sessionStorage.getItem('sweetspots_free_actions');
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });
  
  const incrementFreeActions = useCallback(() => {
    setFreeActionsUsed(prev => {
      const newCount = prev + 1;
      try {
        sessionStorage.setItem('sweetspots_free_actions', String(newCount));
      } catch {}
      return newCount;
    });
  }, []);
  
  const hasExceededFreeActions = useCallback(() => {
    return false; // No auth wall
  }, []);

  // Direct save without auth check
  const toggleSave = useCallback(async (placeId: string) => {
    await originalToggleSave(placeId);
  }, [originalToggleSave]);

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
      removeSavedPlaceIds: removePlaceIds,
      isLoadingSavedPlaces,
      showAuthDialog,
      setShowAuthDialog,
      pendingSavePlaceId,
      freeActionsUsed,
      incrementFreeActions,
      hasExceededFreeActions,
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
  if (!context) {
    console.warn("useApp called outside of AppProvider - this may be a temporary HMR issue");
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};
