import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { useApp, PlaceCategory } from "@/context/AppContext";
import { cn } from "@/lib/utils";

interface CategoryEditorProps {
  onClose: () => void;
  editCategory?: PlaceCategory | null;
}

const categoryColors = [
  { name: "Rose", value: "from-rose-500 to-pink-600" },
  { name: "Violet", value: "from-violet-500 to-purple-600" },
  { name: "Blue", value: "from-blue-500 to-cyan-600" },
  { name: "Emerald", value: "from-emerald-500 to-teal-600" },
  { name: "Amber", value: "from-amber-500 to-orange-600" },
  { name: "Red", value: "from-red-500 to-rose-600" },
];

import { getStoragePhotoUrl } from "@/lib/photoLoader";

const CategoryEditor = ({ onClose, editCategory }: CategoryEditorProps) => {
  const { savedPlaceIds, rankedPlaces, createCategory, updateCategory } = useApp();
  const [name, setName] = useState(editCategory?.name || "");
  const [selectedPlaces, setSelectedPlaces] = useState<string[]>(editCategory?.placeIds || []);
  const [selectedColor, setSelectedColor] = useState(editCategory?.color || categoryColors[0].value);

  const savedPlaces = rankedPlaces.filter(p => savedPlaceIds.has(p.place_id));

  const togglePlace = (placeId: string) => {
    setSelectedPlaces(prev => 
      prev.includes(placeId) ? prev.filter(id => id !== placeId) : [...prev, placeId]
    );
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editCategory) {
      updateCategory(editCategory.id, name.trim(), selectedPlaces);
    } else {
      createCategory(name.trim(), selectedPlaces, selectedColor);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background animate-slide-in-bottom">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">
            {editCategory ? "Edit Category" : "New Category"}
          </h1>
          <button 
            onClick={handleSave}
            disabled={!name.trim()}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              name.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            Save
          </button>
        </div>
      </header>

      <div className="p-4 space-y-6 pb-20 overflow-y-auto max-h-[calc(100vh-60px)]">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Category Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Date Night Spots"
            className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Color</label>
          <div className="flex gap-2 flex-wrap">
            {categoryColors.map((color) => (
              <button
                key={color.value}
                onClick={() => setSelectedColor(color.value)}
                className={cn(
                  "w-10 h-10 rounded-full bg-gradient-to-br transition-all",
                  color.value,
                  selectedColor === color.value 
                    ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110" 
                    : "hover:scale-105"
                )}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Select Places</label>
            <span className="text-xs text-muted-foreground">{selectedPlaces.length} selected</span>
          </div>
          
          {savedPlaces.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No saved places yet. Save some places first!
            </div>
          ) : (
            <div className="space-y-2">
              {savedPlaces.map((place) => (
                <button
                  key={place.place_id}
                  onClick={() => togglePlace(place.place_id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98]",
                    selectedPlaces.includes(place.place_id)
                      ? "bg-primary/10 border-primary/50"
                      : "bg-card border-border"
                  )}
                >
                  <img 
                    src={getStoragePhotoUrl(place.place_id)} 
                    alt={place.name}
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-muted"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="font-medium text-foreground text-sm line-clamp-1">{place.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {place.categories?.[0]?.replace(/_/g, " ") || "Place"}
                    </p>
                  </div>
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    selectedPlaces.includes(place.place_id)
                      ? "bg-primary border-primary"
                      : "border-muted-foreground/30"
                  )}>
                    {selectedPlaces.includes(place.place_id) && (
                      <Check className="w-3.5 h-3.5 text-primary-foreground" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryEditor;
