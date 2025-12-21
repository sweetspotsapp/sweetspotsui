import { useState } from "react";
import { ArrowLeft, MoreVertical, Pencil, Trash2, MapPin } from "lucide-react";
import { useApp, PlaceCategory } from "@/context/AppContext";
import PlaceDetail from "./PlaceDetail";
import type { Place } from "@/data/mockPlaces";

interface CategoryDetailProps {
  category: PlaceCategory;
  onClose: () => void;
  onEdit: () => void;
}

const CategoryDetail = ({ category, onClose, onEdit }: CategoryDetailProps) => {
  const { getCategoryPlaces, deleteCategory } = useApp();
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  
  const places = getCategoryPlaces(category.id);

  const handleDelete = () => {
    deleteCategory(category.id);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background animate-slide-in-bottom">
        {/* Header with gradient */}
        <div className={`relative h-32 bg-gradient-to-br ${category.color}`}>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3">
            <button 
              onClick={onClose}
              className="p-2 -ml-2 rounded-full bg-background/20 backdrop-blur-sm hover:bg-background/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-full bg-background/20 backdrop-blur-sm hover:bg-background/30 transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-white" />
              </button>
              
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMenu(false)} 
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-card rounded-xl shadow-lg border border-border overflow-hidden min-w-[140px]">
                    <button
                      onClick={() => { setShowMenu(false); onEdit(); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); handleDelete(); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="absolute bottom-3 left-4 right-4">
            <h1 className="text-xl font-bold text-white drop-shadow-lg">{category.name}</h1>
            <p className="text-sm text-white/80 mt-0.5">
              {places.length} place{places.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Places List */}
        <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-128px)] pb-20">
          {places.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No places in this category yet</p>
              <button 
                onClick={onEdit}
                className="mt-3 text-primary text-sm font-medium"
              >
                Add places
              </button>
            </div>
          ) : (
            places.map((place, index) => (
              <div 
                key={place.id}
                className="flex gap-3 p-3 bg-card rounded-xl border border-border shadow-soft cursor-pointer active:scale-[0.98] transition-transform opacity-0 animate-fade-up"
                style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
                onClick={() => setSelectedPlace(place)}
              >
                <img 
                  src={place.image} 
                  alt={place.name}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0 py-0.5">
                  <h3 className="font-semibold text-foreground text-sm line-clamp-1">{place.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{place.practicalHint}</p>
                  <div className="flex gap-1.5 mt-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium">
                      {place.vibeTag}
                    </span>
                  </div>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedPlace && (
        <PlaceDetail 
          place={selectedPlace} 
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </>
  );
};

export default CategoryDetail;