import { useState } from "react";
import { ArrowLeft, Check, Image } from "lucide-react";
import { useBoards, Board } from "@/hooks/useBoards";

import { cn } from "@/lib/utils";

interface BoardEditorProps {
  onClose: () => void;
  editBoard?: Board | null;
  savedPlaces?: Array<{
    place_id: string;
    name: string;
    categories?: string[] | null;
    photos?: string[] | null;
  }>;
}

const categoryColors = [
  { name: "Rose", value: "from-rose-500 to-pink-600" },
  { name: "Violet", value: "from-violet-500 to-purple-600" },
  { name: "Blue", value: "from-blue-500 to-cyan-600" },
  { name: "Emerald", value: "from-emerald-500 to-teal-600" },
  { name: "Amber", value: "from-amber-500 to-orange-600" },
  { name: "Red", value: "from-red-500 to-rose-600" },
  { name: "Slate", value: "from-slate-500 to-slate-700" },
  { name: "Pink", value: "from-pink-400 to-fuchsia-600" },
];

const getPlaceholderImage = (name: string, categories?: string[] | null): string => {
  const category = categories?.[0] || "place";
  return `https://source.unsplash.com/100x100/?${encodeURIComponent(`${category} ${name}`)}`;
};

const BoardEditor = ({ onClose, editBoard, savedPlaces = [] }: BoardEditorProps) => {
  const { createBoard, updateBoard, addPlaceToBoard, removePlaceFromBoard } = useBoards();
  const [name, setName] = useState(editBoard?.name || "");
  const [selectedPlaces, setSelectedPlaces] = useState<string[]>(editBoard?.placeIds || []);
  const [selectedColor, setSelectedColor] = useState(editBoard?.color || categoryColors[0].value);
  const [isSaving, setIsSaving] = useState(false);

  const togglePlace = (placeId: string) => {
    setSelectedPlaces(prev => 
      prev.includes(placeId) ? prev.filter(id => id !== placeId) : [...prev, placeId]
    );
  };

  const handleSave = async () => {
    if (!name.trim() || isSaving) return;
    
    setIsSaving(true);
    try {
      if (editBoard) {
        // Update existing board
        await updateBoard(editBoard.id, name.trim(), selectedColor);
        
        // Handle place changes
        const currentPlaceIds = new Set(editBoard.placeIds);
        const newPlaceIds = new Set(selectedPlaces);
        
        // Add new places
        for (const placeId of selectedPlaces) {
          if (!currentPlaceIds.has(placeId)) {
            await addPlaceToBoard(editBoard.id, placeId);
          }
        }
        
        // Remove deselected places
        for (const placeId of editBoard.placeIds) {
          if (!newPlaceIds.has(placeId)) {
            await removePlaceFromBoard(editBoard.id, placeId);
          }
        }
      } else {
        // Create new board with selected places
        await createBoard(name.trim(), selectedColor, selectedPlaces);
      }
      onClose();
    } catch (error) {
      console.error('Error saving board:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background animate-slide-in-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={onClose} 
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">
            {editBoard ? "Edit Board" : "New Board"}
          </h1>
          <button 
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              name.trim() && !isSaving
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-muted text-muted-foreground"
            )}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      <div className="p-4 space-y-6 pb-20 overflow-y-auto max-h-[calc(100vh-60px)]">
        {/* Preview Card */}
        <div className="flex justify-center">
          <div className="w-40 rounded-2xl overflow-hidden bg-card border border-border/50 shadow-lg">
            <div className={cn(
              "aspect-[4/3] bg-gradient-to-br flex items-center justify-center",
              selectedColor
            )}>
              {selectedPlaces.length > 0 ? (
                <div className="grid grid-cols-2 gap-0.5 w-full h-full p-1">
                  {selectedPlaces.slice(0, 4).map((placeId) => {
                    const place = savedPlaces.find(p => p.place_id === placeId);
                    return place ? (
                      <img
                        key={placeId}
                        src={place.photos?.[0] || getPlaceholderImage(place.name, place.categories)}
                        alt=""
                        className="w-full h-full object-cover rounded-sm"
                      />
                    ) : null;
                  })}
                </div>
              ) : (
                <Image className="w-10 h-10 text-white/60" />
              )}
            </div>
            <div className="p-2.5 text-center">
              <h3 className="font-semibold text-foreground text-sm line-clamp-1">
                {name || "Board Name"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {selectedPlaces.length} spots
              </p>
            </div>
          </div>
        </div>

        {/* Board Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Board Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Date Night Spots"
            className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground 
                       placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            autoFocus
          />
        </div>

        {/* Color Picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Board Color</label>
          <div className="flex gap-2.5 flex-wrap">
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

        {/* Place Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Add Places</label>
            <span className="text-xs text-muted-foreground">{selectedPlaces.length} selected</span>
          </div>
          
          {savedPlaces.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground bg-muted/30 rounded-xl">
              <p className="text-sm">No saved places yet</p>
              <p className="text-xs mt-1">Save some places first to add them to boards</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {savedPlaces.map((place) => {
                const isSelected = selectedPlaces.includes(place.place_id);
                return (
                  <button
                    key={place.place_id}
                    onClick={() => togglePlace(place.place_id)}
                    className={cn(
                      "relative rounded-xl overflow-hidden aspect-square transition-all active:scale-[0.95]",
                      isSelected && "ring-2 ring-primary"
                    )}
                  >
                    <img 
                      src={place.photos?.[0] || getPlaceholderImage(place.name, place.categories)} 
                      alt={place.name}
                      className="w-full h-full object-cover"
                    />
                    <div className={cn(
                      "absolute inset-0 transition-colors",
                      isSelected ? "bg-primary/30" : "bg-black/20"
                    )} />
                    
                    {/* Selection Indicator */}
                    <div className={cn(
                      "absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                      isSelected 
                        ? "bg-primary border-primary" 
                        : "bg-black/40 border-white/60"
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    
                    {/* Place Name */}
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
                      <p className="text-[10px] text-white font-medium line-clamp-1">{place.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoardEditor;
