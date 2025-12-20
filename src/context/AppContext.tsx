import { useState, createContext, useContext, ReactNode } from "react";
import type { Place } from "@/data/mockPlaces";
import { extractVibes } from "@/data/mockPlaces";

interface AppContextType {
  savedPlaces: Place[];
  toggleSave: (place: Place) => void;
  isSaved: (placeId: string) => boolean;
  userMood: string;
  setUserMood: (mood: string) => void;
  userVibes: string[];
  hasCompletedOnboarding: boolean;
  completeOnboarding: (mood: string) => void;
  resetOnboarding: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [savedPlaces, setSavedPlaces] = useState<Place[]>([]);
  const [userMood, setUserMood] = useState("");
  const [userVibes, setUserVibes] = useState<string[]>([]);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  const toggleSave = (place: Place) => {
    setSavedPlaces(prev => {
      const exists = prev.some(p => p.id === place.id);
      if (exists) {
        return prev.filter(p => p.id !== place.id);
      }
      return [...prev, place];
    });
  };

  const isSaved = (placeId: string) => savedPlaces.some(p => p.id === placeId);

  const completeOnboarding = (mood: string) => {
    setUserMood(mood);
    setUserVibes(extractVibes(mood));
    setHasCompletedOnboarding(true);
  };

  const resetOnboarding = () => {
    setHasCompletedOnboarding(false);
    setUserMood("");
    setUserVibes([]);
  };

  return (
    <AppContext.Provider value={{ 
      savedPlaces, 
      toggleSave, 
      isSaved, 
      userMood, 
      setUserMood, 
      userVibes,
      hasCompletedOnboarding,
      completeOnboarding,
      resetOnboarding
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
