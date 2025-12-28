import { Heart, MapPin, Plus, FolderHeart } from "lucide-react";
import { useApp, PlaceCategory } from "@/context/AppContext";
import PlaceDetail from "./PlaceDetail";
import CategoryEditor from "./CategoryEditor";
import CategoryDetail from "./CategoryDetail";
import { useState } from "react";
import type { RankedPlace } from "@/hooks/useSearch";
import { cn } from "@/lib/utils";

// Generate a placeholder image based on place name
const getPlaceholderImage = (name: string, categories?: string[] | null): string => {
  const category = categories?.[0] || "place";
  const encoded = encodeURIComponent(`${category} ${name}`);
  return `https://source.unsplash.com/100x100/?${encoded}`;
};

const SavedPage = () => {
  const { savedPlaceIds, categories, rankedPlaces } = useApp();
  const [selectedPlace, setSelectedPlace] = useState<RankedPlace | null>(null);
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory | null>(null);
  const [editingCategory, setEditingCategory] = useState<PlaceCategory | null>(null);

  // Get saved places from rankedPlaces
  const savedPlaces = rankedPlaces.filter(p => savedPlaceIds.has(p.place_id));

  const handleEditCategory = () => {
    if (selectedCategory) {
      setEditingCategory(selectedCategory);
      setSelectedCategory(null);
      setShowCategoryEditor(true);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background pb-20 max-w-md mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/40">
          <div className="px-4 py-3">
            <h1 className="text-lg font-bold text-foreground">Your Library</h1>
            <p className="text-xs text-muted-foreground">Organize your favorite spots</p>
          </div>
        </header>

        <div className="p-4 space-y-6">
          {/* Category Grid - Spotify Style */}
          <div className="grid grid-cols-2 gap-3">
            {/* Saved Places Category - Always First */}
            <button
              onClick={() => {}}
              className="relative aspect-[1.8] rounded-xl overflow-hidden bg-gradient-to-br from-primary/80 to-primary group active:scale-[0.98] transition-transform"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Heart className="w-4 h-4 text-white fill-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-white font-semibold text-sm leading-tight">Saved Spots</h3>
                    <p className="text-white/70 text-[10px]">{savedPlaces.length} places</p>
                  </div>
                </div>
              </div>
            </button>

            {/* Custom Categories */}
            {categories.map((category, index) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "relative aspect-[1.8] rounded-xl overflow-hidden bg-gradient-to-br group active:scale-[0.98] transition-transform opacity-0 animate-fade-up",
                  category.color
                )}
                style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <FolderHeart className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-white font-semibold text-sm leading-tight line-clamp-1">{category.name}</h3>
                      <p className="text-white/70 text-[10px]">{category.placeIds.length} places</p>
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {/* Add Category Button */}
            <button
              onClick={() => {
                setEditingCategory(null);
                setShowCategoryEditor(true);
              }}
              className="aspect-[1.8] rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors active:scale-[0.98]"
            >
              <Plus className="w-6 h-6" />
              <span className="text-xs font-medium">Add Category</span>
            </button>
          </div>

          {/* Recent Saves Section */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Recent Saves</h2>
            
            {savedPlaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Heart className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">No saved spots yet</h3>
                <p className="text-xs text-muted-foreground max-w-[220px]">
                  Tap the heart on any place to save it here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedPlaces.slice(0, 5).map((place, index) => (
                  <div 
                    key={place.place_id}
                    className="flex gap-3 p-2.5 bg-card rounded-xl border border-border/50 cursor-pointer active:scale-[0.98] transition-transform opacity-0 animate-fade-up"
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                    onClick={() => setSelectedPlace(place)}
                  >
                    <img 
                      src={getPlaceholderImage(place.name, place.categories)} 
                      alt={place.name}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-muted"
                    />
                    <div className="flex-1 min-w-0 flex items-center">
                      <div>
                        <h3 className="font-medium text-foreground text-sm line-clamp-1">{place.name}</h3>
                        <p className="text-[11px] text-muted-foreground capitalize">
                          {place.categories?.[0]?.replace(/_/g, " ") || "Place"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-muted-foreground/60" />
                    </div>
                  </div>
                ))}
                
                {savedPlaces.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{savedPlaces.length - 5} more saved
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Place Detail Modal */}
      {selectedPlace && (
        <PlaceDetail 
          place={selectedPlace} 
          onClose={() => setSelectedPlace(null)}
        />
      )}

      {/* Category Editor */}
      {showCategoryEditor && (
        <CategoryEditor 
          onClose={() => {
            setShowCategoryEditor(false);
            setEditingCategory(null);
          }}
          editCategory={editingCategory}
        />
      )}

      {/* Category Detail View */}
      {selectedCategory && (
        <CategoryDetail 
          category={selectedCategory}
          onClose={() => setSelectedCategory(null)}
          onEdit={handleEditCategory}
        />
      )}
    </>
  );
};

export default SavedPage;
