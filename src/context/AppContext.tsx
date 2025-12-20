import { useState, createContext, useContext, ReactNode } from "react";
import type { Place } from "@/data/mockPlaces";

interface AppContextType {
  savedPlaces: Place[];
  toggleSave: (place: Place) => void;
  isSaved: (placeId: string) => boolean;
  userMood: string;
  setUserMood: (mood: string) => void;
  userVibes: string[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [savedPlaces, setSavedPlaces] = useState<Place[]>([]);
  const [userMood, setUserMood] = useState("somewhere chill and good for talking");
  
  const userVibes = ["Chill", "Not too crowded", "Budget-friendly", "Good for conversation"];

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

  return (
    <AppContext.Provider value={{ savedPlaces, toggleSave, isSaved, userMood, setUserMood, userVibes }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
