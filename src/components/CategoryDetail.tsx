import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MoreVertical, Pencil, Trash2, MapPin } from "lucide-react";
import { useApp, PlaceCategory } from "@/context/AppContext";

interface CategoryDetailProps {
  category: PlaceCategory;
  onClose: () => void;
  onEdit: () => void;
}

import { getStoragePhotoUrl } from "@/lib/photoLoader";

const CategoryDetail = ({ category, onClose, onEdit }: CategoryDetailProps) => {
  const navigate = useNavigate();
  const { getCategoryPlaces, deleteCategory } = useApp();
  const [showMenu, setShowMenu] = useState(false);
  
  const places = getCategoryPlaces(category.id);

  const handleDelete = () => {
    deleteCategory(category.id);
    onClose();
  };

  const handlePlaceClick = (placeId: string) => {
    navigate(`/place/${placeId}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background animate-slide-in-bottom flex flex-col">
      {/* Header with gradient */}
      <div className={`relative h-20 bg-gradient-to-br ${category.color} flex-shrink-0`}>
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
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
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
        
        <div className="absolute bottom-2 left-4 right-4">
          <h1 className="text-lg font-bold text-white drop-shadow-lg">{category.name}</h1>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Saved Places ({places.length})
          </h2>
          
          {places.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-xl">
              <p className="text-sm">No places saved yet</p>
              <button onClick={onEdit} className="mt-2 text-primary text-sm font-medium">
                Add places
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {places.map((place, index) => (
                <div 
                  key={place.place_id}
                  className="flex gap-3 p-2.5 bg-card rounded-xl border border-border/50 cursor-pointer active:scale-[0.98] transition-transform opacity-0 animate-fade-up"
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                  onClick={() => handlePlaceClick(place.place_id)}
                >
                  <img 
                    src={getStoragePhotoUrl(place.place_id)} 
                    alt={place.name}
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-muted"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-semibold text-foreground text-sm line-clamp-1">{place.name}</h3>
                    <span className="inline-flex self-start mt-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium capitalize">
                      {place.categories?.[0]?.replace(/_/g, " ") || "Place"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 text-muted-foreground/60" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryDetail;