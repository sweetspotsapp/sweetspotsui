import { useState, createContext, useContext, ReactNode, useCallback, useEffect } from "react";
import { extractVibes } from "@/data/mockPlaces";
import { supabase } from "@/integrations/supabase/client";
import type { RankedPlace } from "@/hooks/useSearch";

// Onboarding data structure (defined here to avoid circular deps)
export interface OnboardingData {
  trip_intention: string | null;
  budget: string | null;
  travel_personality: string[];
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
  const [rankedPlaces, setRankedPlaces] = useState<RankedPlace[]>([]);
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());
  const [userMood, setUserMood] = useState("");
  const [userVibes, setUserVibes] = useState<string[]>([]);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [travelMode, setTravelMode] = useState<"drive" | "walk" | "bike">("drive");
  const [categories, setCategories] = useState<PlaceCategory[]>([]);
  const [onboardingData, setOnboardingDataState] = useState<OnboardingData | null>(null);
  const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS);

  const setOnboardingData = useCallback((data: OnboardingData) => {
    setOnboardingDataState(data);
    setSections(generateSections(data));
  }, []);

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
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
