import { useState, createContext, useContext, ReactNode } from "react";
import type { Place } from "@/data/mockPlaces";
import { extractVibes, primaryPlaces, explorationPlaces } from "@/data/mockPlaces";

export interface PlaceCategory {
  id: string;
  name: string;
  placeIds: string[];
  color: string;
  createdAt: Date;
}

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
  // Custom categories
  categories: PlaceCategory[];
  createCategory: (name: string, placeIds: string[], color: string) => void;
  updateCategory: (id: string, name: string, placeIds: string[]) => void;
  deleteCategory: (id: string) => void;
  getCategoryPlaces: (categoryId: string) => Place[];
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

// Default dummy categories
const defaultCategories: PlaceCategory[] = [
  {
    id: "late-nights",
    name: "Late Nights",
    placeIds: ["3", "4"], // Midnight Ramen & Quiet Library Bar
    color: "from-indigo-600 to-purple-700",
    createdAt: new Date(),
  },
  {
    id: "brunches",
    name: "Brunches",
    placeIds: ["5", "2"], // Sunrise Bakery & Bloom Garden Café
    color: "from-amber-400 to-orange-500",
    createdAt: new Date(),
  },
];

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [savedPlaces, setSavedPlaces] = useState<Place[]>([]);
  const [userMood, setUserMood] = useState("");
  const [userVibes, setUserVibes] = useState<string[]>([]);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [categories, setCategories] = useState<PlaceCategory[]>(defaultCategories);

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

  const createCategory = (name: string, placeIds: string[], color: string) => {
    const newCategory: PlaceCategory = {
      id: Date.now().toString(),
      name,
      placeIds,
      color: color || categoryColors[categories.length % categoryColors.length],
      createdAt: new Date(),
    };
    setCategories(prev => [...prev, newCategory]);
  };

  const updateCategory = (id: string, name: string, placeIds: string[]) => {
    setCategories(prev => prev.map(cat => 
      cat.id === id ? { ...cat, name, placeIds } : cat
    ));
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
  };

  const getCategoryPlaces = (categoryId: string): Place[] => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return [];
    // Return all places that match placeIds (from saved or mock data)
    const allAvailablePlaces = [...savedPlaces, ...primaryPlaces, ...explorationPlaces];
    // Remove duplicates by id
    const uniquePlaces = allAvailablePlaces.filter((place, index, self) =>
      index === self.findIndex(p => p.id === place.id)
    );
    return category.placeIds
      .map(id => uniquePlaces.find(p => p.id === id))
      .filter((p): p is Place => p !== undefined);
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
      resetOnboarding,
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