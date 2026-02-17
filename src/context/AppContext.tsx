import { useState, createContext, useContext, ReactNode, useCallback } from "react";
import { extractVibes } from "@/data/mockPlaces";
import type { RankedPlace } from "@/hooks/useSearch";
import { useSavedPlaces } from "@/hooks/useSavedPlaces";
import { useAuth } from "@/hooks/useAuth";

// Onboarding data structure (defined here to avoid circular deps)
export interface OnboardingData {
  trip_intention: string | null;
  budget: string | null;
  travel_personality: string[];
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

// Section configuration based on onboarding answers
export interface SectionConfig {
  key: string;
  title: string;
  prompt: string;
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
  
  // Dynamic sections based on onboarding
  sections: SectionConfig[];
  
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

// Map onboarding answers to section titles and prompts
const INTENTION_SECTIONS: Record<string, SectionConfig> = {
  relax: { key: 'intention', title: 'Perfect spots to relax', prompt: 'relaxing calm peaceful places to unwind' },
  friends: { key: 'intention', title: 'Great for friend groups', prompt: 'fun places for friend groups hangout social' },
  explore: { key: 'intention', title: 'Hidden gems to explore', prompt: 'hidden gems unique local spots off the beaten path' },
  cultural: { key: 'intention', title: 'Cultural experiences', prompt: 'cultural historical museums art galleries heritage' },
  discover: { key: 'intention', title: 'Cool spots to discover', prompt: 'cool trendy popular instagram-worthy spots' },
};

const BUDGET_SECTIONS: Record<string, SectionConfig> = {
  under50: { key: 'budget', title: 'Best under $50', prompt: 'cheap affordable places under $50 budget-friendly' },
  '50to100': { key: 'budget', title: 'Worth the $50-100', prompt: 'mid-range quality places $50 to $100' },
  over100: { key: 'budget', title: 'Premium experiences', prompt: 'luxury premium upscale high-end places' },
};

const PERSONALITY_SECTIONS: Record<string, SectionConfig> = {
  planner: { key: 'personality', title: 'Top-rated & reviewed', prompt: 'highly rated well reviewed popular reliable spots' },
  spontaneous: { key: 'personality', title: 'Surprise finds', prompt: 'unique quirky unexpected surprise spots' },
  balanced: { key: 'personality', title: 'Flexible favorites', prompt: 'versatile casual easygoing relaxed atmosphere' },
};

// Default sections when no onboarding data
const DEFAULT_SECTIONS: SectionConfig[] = [
  { key: 'budget', title: 'Hidden gems under $50', prompt: 'cheap affordable places under $50' },
  { key: 'cbd', title: 'Chill spots near the CBD', prompt: 'chill relaxed spots near CBD city center' },
  { key: 'friends', title: 'Great for friend groups', prompt: 'fun places for friend groups hangout' },
];

const generateSections = (data: OnboardingData | null): SectionConfig[] => {
  if (!data) return DEFAULT_SECTIONS;

  const sections: SectionConfig[] = [];

  // Add section based on trip intention
  if (data.trip_intention && INTENTION_SECTIONS[data.trip_intention]) {
    sections.push(INTENTION_SECTIONS[data.trip_intention]);
  }

  // Add section based on budget
  if (data.budget && BUDGET_SECTIONS[data.budget]) {
    sections.push(BUDGET_SECTIONS[data.budget]);
  }

  // Add section based on personality (use first selected)
  if (data.travel_personality.length > 0) {
    const firstPersonality = data.travel_personality[0];
    if (PERSONALITY_SECTIONS[firstPersonality]) {
      sections.push(PERSONALITY_SECTIONS[firstPersonality]);
    }
  }

  // Fallback to defaults if nothing selected
  return sections.length > 0 ? sections : DEFAULT_SECTIONS;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { savedPlaceIds, toggleSave: originalToggleSave, isSaved, isLoading: isLoadingSavedPlaces, removePlaceIds } = useSavedPlaces();

  const [rankedPlaces, setRankedPlaces] = useState<RankedPlace[]>([]);
  const [userMood, setUserMood] = useState("");
  const [userVibes, setUserVibes] = useState<string[]>([]);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    try {
      return localStorage.getItem('sweetspots_onboarding_done') === 'true';
    } catch {
      return false;
    }
  });
  const [travelMode, setTravelMode] = useState<"drive" | "walk" | "bike">("drive");
  const [categories, setCategories] = useState<PlaceCategory[]>([]);
  const [onboardingData, setOnboardingDataState] = useState<OnboardingData | null>(null);
  const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS);
  
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

  const setOnboardingData = useCallback((data: OnboardingData) => {
    // Clear search cache when location changes
    try {
      const cachedLocation = sessionStorage.getItem('sweetspots_cached_location') || "";
      if (data.explore_location && data.explore_location !== cachedLocation) {
        sessionStorage.removeItem('sweetspots_search_cache');
        sessionStorage.removeItem('sweetspots_summary_cache');
        sessionStorage.removeItem('sweetspots_cached_location');
      }
    } catch {}
    
    setOnboardingDataState(data);
    setSections(generateSections(data));
  }, []);


  const completeOnboarding = useCallback((mood: string, places: RankedPlace[]) => {
    setUserMood(mood);
    setUserVibes(extractVibes(mood));
    setRankedPlaces(places);
    setHasCompletedOnboarding(true);
    try { localStorage.setItem('sweetspots_onboarding_done', 'true'); } catch {}
  }, []);

  const resetOnboarding = useCallback(() => {
    setHasCompletedOnboarding(false);
    try { localStorage.removeItem('sweetspots_onboarding_done'); } catch {}
    setUserMood("");
    setUserVibes([]);
    setRankedPlaces([]);
    setOnboardingDataState(null);
    setSections(DEFAULT_SECTIONS);
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
      sections,
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
