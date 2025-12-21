import { useState, useRef } from "react";
import { ArrowLeft, MoreVertical, Pencil, Trash2, MapPin, Bookmark, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp, PlaceCategory } from "@/context/AppContext";
import PlaceDetail from "./PlaceDetail";
import type { Place } from "@/data/mockPlaces";
import { lateNightSuggestions, brunchSuggestions } from "@/data/mockPlaces";

interface CategoryDetailProps {
  category: PlaceCategory;
  onClose: () => void;
  onEdit: () => void;
}

const CategoryDetail = ({ category, onClose, onEdit }: CategoryDetailProps) => {
  const { getCategoryPlaces, deleteCategory, toggleSave, isSaved } = useApp();
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const places = getCategoryPlaces(category.id);
  
  // Get suggestions based on category type
  const getSuggestions = (): Place[] => {
    const categoryName = category.name.toLowerCase();
    if (categoryName.includes("late") || categoryName.includes("night")) {
      return lateNightSuggestions;
    }
    if (categoryName.includes("brunch")) {
      return brunchSuggestions;
    }
    return [];
  };
  
  const suggestions = getSuggestions();
  const currentSuggestion = suggestions[currentIndex];

  const handleDelete = () => {
    deleteCategory(category.id);
    onClose();
  };

  // Touch handlers for swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentIndex < suggestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const goNext = () => {
    if (currentIndex < suggestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <>
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
          
          <div className="absolute bottom-2 left-4 right-4">
            <h1 className="text-lg font-bold text-white drop-shadow-lg">{category.name}</h1>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Saved Places List */}
          <div className="p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Saved Places ({places.length})
            </h2>
            
            {places.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-xl">
                <p className="text-sm">No places saved yet</p>
                <button 
                  onClick={onEdit}
                  className="mt-2 text-primary text-sm font-medium"
                >
                  Add places
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {places.map((place, index) => (
                  <div 
                    key={place.id}
                    className="flex gap-3 p-2.5 bg-card rounded-xl border border-border/50 cursor-pointer active:scale-[0.98] transition-transform opacity-0 animate-fade-up"
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                    onClick={() => setSelectedPlace(place)}
                  >
                    <img 
                      src={place.image} 
                      alt={place.name}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="font-semibold text-foreground text-sm line-clamp-1">{place.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{place.practicalHint}</p>
                      <span className="inline-flex self-start mt-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium">
                        {place.vibeTag}
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

          {/* Recommendations Section */}
          {suggestions.length > 0 && (
            <div className="px-4 pb-24">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  Discover More {category.name}
                </h2>
              </div>
              
              {/* Counter */}
              <div className="text-center text-xs text-muted-foreground mb-3">
                {currentIndex + 1} of {suggestions.length}
              </div>
              
              {/* Swipeable Card */}
              {currentSuggestion && (
                <div
                  className="relative w-full max-w-[300px] mx-auto aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing transition-transform duration-300"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  onClick={() => setSelectedPlace(currentSuggestion)}
                >
                  <img 
                    src={currentSuggestion.image} 
                    alt={currentSuggestion.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Save button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSave(currentSuggestion);
                    }}
                    className="absolute top-3 right-3 p-2.5 rounded-full bg-background/20 backdrop-blur-sm hover:bg-background/40 transition-colors"
                  >
                    <Bookmark 
                      className={`w-5 h-5 ${isSaved(currentSuggestion.id) ? 'text-primary fill-primary' : 'text-white'}`} 
                    />
                  </button>
                  
                  {/* Card Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <span className="inline-block px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white mb-3">
                      {currentSuggestion.vibeTag}
                    </span>
                    <h3 className="text-xl font-bold text-white">{currentSuggestion.name}</h3>
                    <p className="text-sm text-white/80 mt-1">{currentSuggestion.practicalHint}</p>
                    <div className="flex items-center gap-3 mt-2 text-sm text-white/70">
                      <span>{currentSuggestion.distance}</span>
                      <span>•</span>
                      <span>Open until {currentSuggestion.openUntil}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Navigation */}
              <div className="flex items-center justify-center gap-6 mt-5">
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="p-3 rounded-full bg-card border border-border shadow-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>
                
                {/* Dot indicators */}
                <div className="flex gap-1.5">
                  {suggestions.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentIndex 
                          ? 'bg-primary w-5' 
                          : 'bg-muted-foreground/30 w-2'
                      }`}
                    />
                  ))}
                </div>
                
                <button
                  onClick={goNext}
                  disabled={currentIndex === suggestions.length - 1}
                  className="p-3 rounded-full bg-card border border-border shadow-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-foreground" />
                </button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center mt-3">
                Swipe or tap to explore
              </p>
            </div>
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