import { useState } from "react";
import { ArrowLeft, MoreVertical, Pencil, Trash2, MapPin, Star, SortAsc, Filter } from "lucide-react";
import { useApp, PlaceCategory } from "@/context/AppContext";
import PlaceDetail from "../PlaceDetail";
import type { RankedPlace } from "@/hooks/useSearch";
import { cn } from "@/lib/utils";

interface BoardViewProps {
  board: PlaceCategory | "all";
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const getPlaceholderImage = (name: string, categories?: string[] | null): string => {
  const category = categories?.[0] || "place";
  return `https://source.unsplash.com/400x400/?${encodeURIComponent(`${category} ${name}`)}`;
};

const BoardView = ({ board, onClose, onEdit, onDelete }: BoardViewProps) => {
  const { getCategoryPlaces, savedPlaceIds, rankedPlaces } = useApp();
  const [selectedPlace, setSelectedPlace] = useState<RankedPlace | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "name" | "rating">("recent");
  
  const isAllSaved = board === "all";
  const boardName = isAllSaved ? "All Saved" : board.name;
  const colorClass = isAllSaved ? "from-primary to-primary/80" : board.color;
  
  // Get places for this board
  const places = isAllSaved 
    ? rankedPlaces.filter(p => savedPlaceIds.has(p.place_id))
    : getCategoryPlaces(board.id);
  
  // Sort places
  const sortedPlaces = [...places].sort((a, b) => {
    switch (sortBy) {
      case "name": return a.name.localeCompare(b.name);
      case "rating": return (b.rating || 0) - (a.rating || 0);
      default: return 0;
    }
  });

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background animate-slide-in-bottom flex flex-col">
        {/* Header with gradient */}
        <div className={cn("relative h-32 bg-gradient-to-br flex-shrink-0", colorClass)}>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3">
            <button 
              onClick={onClose}
              className="p-2 -ml-2 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            
            {!isAllSaved && (
              <div className="relative">
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/30 transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-white" />
                </button>
                
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-card rounded-xl shadow-lg border border-border overflow-hidden min-w-[160px]">
                      <button
                        onClick={() => { setShowMenu(false); onEdit?.(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                        Rename Board
                      </button>
                      <button
                        onClick={() => { setShowMenu(false); onDelete?.(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Board
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Board Title */}
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-xl font-bold text-white drop-shadow-lg">{boardName}</h1>
            <p className="text-white/80 text-sm mt-0.5">
              {places.length} {places.length === 1 ? 'spot' : 'spots'} saved
            </p>
          </div>
        </div>

        {/* Sort Bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <SortAsc className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-1.5">
            {(["recent", "name", "rating"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize",
                  sortBy === option 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Grid of Places - Pinterest Masonry Style */}
        <div className="flex-1 overflow-y-auto p-4">
          {places.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MapPin className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No spots yet</h3>
              <p className="text-sm text-muted-foreground max-w-[220px]">
                Save some places and add them to this board
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {sortedPlaces.map((place, index) => (
                <div 
                  key={place.place_id}
                  onClick={() => setSelectedPlace(place)}
                  className={cn(
                    "bg-card rounded-xl overflow-hidden border border-border/50",
                    "cursor-pointer active:scale-[0.98] transition-all duration-200",
                    "opacity-0 animate-fade-up hover:shadow-md hover:border-primary/30",
                    // Pinterest masonry effect - alternate heights
                    index % 3 === 0 ? "row-span-1" : ""
                  )}
                  style={{ 
                    animationDelay: `${index * 50}ms`, 
                    animationFillMode: 'forwards' 
                  }}
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <img 
                      src={getPlaceholderImage(place.name, place.categories)} 
                      alt={place.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    
                    {/* Rating Badge */}
                    {place.rating && (
                      <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-[10px] font-medium text-white">{place.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2.5">
                    <h3 className="font-medium text-foreground text-sm line-clamp-1">{place.name}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground capitalize line-clamp-1">
                        {place.categories?.[0]?.replace(/_/g, " ") || "Place"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Place Detail Modal */}
      {selectedPlace && (
        <PlaceDetail place={selectedPlace} onClose={() => setSelectedPlace(null)} />
      )}
    </>
  );
};

export default BoardView;
