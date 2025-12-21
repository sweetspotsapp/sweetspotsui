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
  const cardRef = useRef<HTMLDivElement>(null);
  
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
  const allCards = [...places, ...suggestions.map(s => ({ ...s, isSuggestion: true }))];
  const isShowingSuggestions = currentIndex >= places.length;
  const currentCard = allCards[currentIndex] as (Place & { isSuggestion?: boolean }) | undefined;

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
    
    if (isLeftSwipe && currentIndex < allCards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const goNext = () => {
    if (currentIndex < allCards.length - 1) {
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
        <div className={`relative h-24 bg-gradient-to-br ${category.color} flex-shrink-0`}>
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
            <p className="text-xs text-white/80">
              {places.length} saved • {suggestions.length} suggestions
            </p>
          </div>
        </div>

        {/* Swipeable Card Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 overflow-hidden">
          {allCards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No places in this category yet</p>
              <button 
                onClick={onEdit}
                className="mt-3 text-primary text-sm font-medium"
              >
                Add places
              </button>
            </div>
          ) : currentCard ? (
            <>
              {/* Suggestion Banner */}
              {isShowingSuggestions && (
                <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-primary/10 rounded-full animate-fade-in">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary font-medium">Suggestions for you</span>
                </div>
              )}
              
              {/* Card Counter */}
              <div className="text-xs text-muted-foreground mb-3">
                {currentIndex + 1} of {allCards.length}
              </div>
              
              {/* Swipeable Card */}
              <div
                ref={cardRef}
                className="relative w-full max-w-[280px] aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing transition-transform duration-300"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onClick={() => setSelectedPlace(currentCard)}
              >
                <img 
                  src={currentCard.image} 
                  alt={currentCard.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Suggestion badge */}
                {currentCard.isSuggestion && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-primary rounded-full">
                    <Sparkles className="w-3 h-3 text-primary-foreground" />
                    <span className="text-[10px] font-semibold text-primary-foreground uppercase tracking-wide">New</span>
                  </div>
                )}
                
                {/* Save button for suggestions */}
                {currentCard.isSuggestion && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSave(currentCard);
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-background/20 backdrop-blur-sm hover:bg-background/40 transition-colors"
                  >
                    <Bookmark 
                      className={`w-5 h-5 ${isSaved(currentCard.id) ? 'text-primary fill-primary' : 'text-white'}`} 
                    />
                  </button>
                )}
                
                {/* Card Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-medium text-white mb-2">
                    {currentCard.vibeTag}
                  </span>
                  <h3 className="text-lg font-bold text-white">{currentCard.name}</h3>
                  <p className="text-xs text-white/80 mt-1">{currentCard.practicalHint}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-white/70">
                    <span>{currentCard.distance}</span>
                    <span>•</span>
                    <span>Open until {currentCard.openUntil}</span>
                  </div>
                </div>
              </div>
              
              {/* Navigation Arrows */}
              <div className="flex items-center gap-6 mt-6">
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="p-3 rounded-full bg-card border border-border shadow-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>
                
                {/* Dot indicators */}
                <div className="flex gap-1.5">
                  {allCards.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentIndex 
                          ? 'bg-primary w-4' 
                          : idx >= places.length 
                            ? 'bg-primary/30' 
                            : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
                
                <button
                  onClick={goNext}
                  disabled={currentIndex === allCards.length - 1}
                  className="p-3 rounded-full bg-card border border-border shadow-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-foreground" />
                </button>
              </div>
              
              {/* Swipe hint */}
              <p className="text-xs text-muted-foreground mt-4">
                Swipe or tap to explore
              </p>
            </>
          ) : null}
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