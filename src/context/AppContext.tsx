import { useState, useEffect, useRef, createContext, useContext, ReactNode, useCallback } from "react";
import { extractVibes } from "@/data/mockPlaces";
import type { RankedPlace } from "@/hooks/useSearch";
import { useSavedPlaces } from "@/hooks/useSavedPlaces";
import { useAuth } from "@/hooks/useAuth";
import { LS_ONBOARDING_DONE, lsOnboardingKey, SS_FREE_ACTIONS, SS_CACHED_LOCATION, SS_SEARCH_CACHE, SS_SUMMARY_CACHE } from "@/lib/storageKeys";

// Onboarding data structure (defined here to avoid circular deps)
export interface OnboardingData {
  explore_location: string | null; // City/area name or "nearby" for GPS
  mood?: string; // User's mood/search intent from onboarding
}
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
  
  // User mood/vibes
  userMood: string;
  setUserMood: (mood: string) => void;
  userVibes: string[];
  
  // Onboarding state
  hasCompletedOnboarding: boolean;
  completeOnboarding: (mood: string, places: RankedPlace[]) => void;
  resetOnboarding: () => void;
  
  // Onboarding data (from wizard)
  onboardingData: OnboardingData | null;
  setOnboardingData: (data: OnboardingData) => void;
  
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

// Helper to get user-scoped localStorage key for onboarding
const getOnboardingKey = (userId?: string) =>
  userId ? lsOnboardingKey(userId) : LS_ONBOARDING_DONE;

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { savedPlaceIds, toggleSave: originalToggleSave, isSaved, isLoading: isLoadingSavedPlaces, removePlaceIds } = useSavedPlaces();

  const [rankedPlaces, setRankedPlaces] = useState<RankedPlace[]>([]);
  const [userMood, setUserMood] = useState("");
  const [userVibes, setUserVibes] = useState<string[]>([]);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    try {
      // Check both legacy key and any user-scoped key
      return localStorage.getItem(LS_ONBOARDING_DONE) === 'true';
    } catch {
      return false;
    }
  });
  // Track previous user to detect login/logout transitions
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;
    prevUserIdRef.current = user?.id ?? null;

    // Skip initial mount
    if (prevUserId === undefined) {
      // On mount, check user-scoped key if logged in
      if (user?.id) {
        const scoped = localStorage.getItem(getOnboardingKey(user.id)) === 'true';
        setHasCompletedOnboarding(scoped);
      }
      return;
    }

    if (!user && prevUserId) {
      // User logged out — reset onboarding state
      setHasCompletedOnboarding(false);
      setUserMood("");
      setUserVibes([]);
      setRankedPlaces([]);
      setOnboardingDataState(null);
    } else if (user?.id && user.id !== prevUserId) {
      // New user logged in — read their scoped onboarding state
      try {
        const scoped = localStorage.getItem(getOnboardingKey(user.id)) === 'true';
        setHasCompletedOnboarding(scoped);
      } catch {
        setHasCompletedOnboarding(false);
      }
    }
  }, [user?.id]);

  const [travelMode, setTravelMode] = useState<"drive" | "walk" | "bike">("drive");
  const [categories, setCategories] = useState<PlaceCategory[]>([]);
  const [onboardingData, setOnboardingDataState] = useState<OnboardingData | null>(null);

  // Auth dialog state for prompting login when saving
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [pendingSavePlaceId] = useState<string | null>(null);
  
  // Free actions tracking for soft wall (persisted in sessionStorage)
  const [freeActionsUsed, setFreeActionsUsed] = useState<number>(() => {
    try {
      const stored = sessionStorage.getItem(SS_FREE_ACTIONS);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });
  
  const incrementFreeActions = useCallback(() => {
    setFreeActionsUsed(prev => {
      const newCount = prev + 1;
      try {
        sessionStorage.setItem(SS_FREE_ACTIONS, String(newCount));
      } catch {}
      return newCount;
    });
  }, []);
  
  const hasExceededFreeActions = useCallback(() => {
    return false; // No auth wall
  }, []);

  const toggleSave = useCallback(async (placeId: string) => {
    // Gate anonymous saves — allow 3, then require auth
    if (!user) {
      const count = parseInt(localStorage.getItem("ss_anon_saves") || "0", 10);
      if (count >= 3) {
        setShowAuthDialog(true);
        return;
      }
      // For anon users, saves don't persist to DB but we still count them
      localStorage.setItem("ss_anon_saves", String(count + 1));
    }
    await originalToggleSave(placeId);
  }, [originalToggleSave, user]);

  const setOnboardingData = useCallback((data: OnboardingData) => {
    // Clear search cache when location changes
    try {
      const cachedLocation = sessionStorage.getItem(SS_CACHED_LOCATION) || "";
      if (data.explore_location && data.explore_location !== cachedLocation) {
        sessionStorage.removeItem(SS_SEARCH_CACHE);
        sessionStorage.removeItem(SS_SUMMARY_CACHE);
        sessionStorage.removeItem(SS_CACHED_LOCATION);
      }
    } catch {}
    
    setOnboardingDataState(data);
  }, []);


  const completeOnboarding = useCallback((mood: string, places: RankedPlace[]) => {
    setUserMood(mood);
    setUserVibes(extractVibes(mood));
    setRankedPlaces(places);
    setHasCompletedOnboarding(true);
    try {
      localStorage.setItem(LS_ONBOARDING_DONE, 'true');
      if (user?.id) localStorage.setItem(getOnboardingKey(user.id), 'true');
    } catch {}
  }, [user?.id]);

  const resetOnboarding = useCallback(() => {
    setHasCompletedOnboarding(false);
    try {
      localStorage.removeItem(LS_ONBOARDING_DONE);
      if (user?.id) localStorage.removeItem(getOnboardingKey(user.id));
    } catch {}
    setUserMood("");
    setUserVibes([]);
    setRankedPlaces([]);
    setOnboardingDataState(null);
  }, [user?.id]);

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
      userMood, 
      setUserMood, 
      userVibes,
      hasCompletedOnboarding,
      completeOnboarding,
      resetOnboarding,
      onboardingData,
      setOnboardingData,
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
    // During HMR, context may temporarily be undefined
    // Return a safe fallback during this transition
    console.warn("useApp called outside of AppProvider - this may be a temporary HMR issue");
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};
