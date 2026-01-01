import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MoreVertical, Pencil, Trash2, MapPin, Star, SortAsc, Filter, DollarSign, Heart } from "lucide-react";
import { PlaceCategory } from "@/context/AppContext";
import type { RankedPlace } from "@/hooks/useSearch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BoardViewProps {
  board: PlaceCategory | "all";
  places: RankedPlace[];
  placeImages?: Record<string, string[]>;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPlaceClick?: (place: RankedPlace) => void;
  onRemoveFromBoard?: (placeId: string) => void;
}

type SortOption = "recent" | "name" | "rating" | "distance";
type FilterOption = "all" | "$$" | "$$$" | "nearby";

const BoardView = ({ board, places, placeImages = {}, onClose, onEdit, onDelete, onPlaceClick, onRemoveFromBoard }: BoardViewProps) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [removingPlaceId, setRemovingPlaceId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const isAllSaved = board === "all";
  const boardName = isAllSaved ? "All Saved" : board.name;
  const colorClass = isAllSaved ? "from-primary to-primary/80" : board.color;
  
  // Get places for this board
  const boardPlaces = isAllSaved 
    ? places
    : places.filter(p => board.placeIds.includes(p.place_id));
  
  // Filter places
  const filteredPlaces = boardPlaces.filter(place => {
    if (filterBy === "all") return true;
    if (filterBy === "nearby") return (place.distance_meters || 0) < 2000;
    if (filterBy === "$$") return (place.rating || 0) < 4.6;
    if (filterBy === "$$$") return (place.rating || 0) >= 4.6;
    return true;
  });
  
  // Sort places
  const sortedPlaces = [...filteredPlaces].sort((a, b) => {
    switch (sortBy) {
      case "name": return a.name.localeCompare(b.name);
      case "rating": return (b.rating || 0) - (a.rating || 0);
      case "distance": return (a.distance_meters || 0) - (b.distance_meters || 0);
      default: return 0;
    }
  });

  const getPlaceImage = (placeId: string): string => {
    return placeImages[placeId]?.[0] || `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400`;
  };

  const handlePlaceClick = (place: RankedPlace) => {
    if (onPlaceClick) {
      onPlaceClick(place);
    } else {
      navigate(`/place/${place.place_id}`);
    }
  };

  const handleRemove = (e: React.MouseEvent, place: RankedPlace) => {
    e.stopPropagation();
    setRemovingPlaceId(place.place_id);
    
    // Small delay for animation before removing
    setTimeout(() => {
      onRemoveFromBoard?.(place.place_id);
      setRemovingPlaceId(null);
      
      const boardName = isAllSaved ? "Saved" : board.name;
      toast.success(`Removed from ${boardName}`, {
        action: {
          label: "Undo",
          onClick: () => {
            // The parent will handle re-adding via onRemoveFromBoard with undo logic
          }
        }
      });
    }, 200);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background animate-slide-in-bottom flex flex-col max-w-md mx-auto">
        {/* Header with gradient */}
        <div className={cn("relative h-36 bg-gradient-to-br flex-shrink-0", colorClass)}>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
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
              {boardPlaces.length} {boardPlaces.length === 1 ? 'spot' : 'spots'} saved
            </p>
          </div>
        </div>

        {/* Sort & Filter Bar */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            <SortAsc className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            {(["recent", "name", "rating", "distance"] as SortOption[]).map((option) => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize whitespace-nowrap",
                  sortBy === option 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {option}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-2 rounded-full transition-colors flex-shrink-0",
              filterBy !== "all" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
        
        {/* Filter Pills */}
        {showFilters && (
          <div className="flex gap-2 px-4 py-2 border-b border-border/50 overflow-x-auto scrollbar-hide">
            {(["all", "nearby", "$$", "$$$"] as FilterOption[]).map((option) => (
              <button
                key={option}
                onClick={() => setFilterBy(option)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1",
                  filterBy === option 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {option === "nearby" && <MapPin className="w-3 h-3" />}
                {option === "$$" && <DollarSign className="w-3 h-3" />}
                {option === "$$$" && <><DollarSign className="w-3 h-3" /><DollarSign className="w-3 h-3 -ml-2" /></>}
                {option === "all" ? "All" : option === "nearby" ? "< 2km" : option}
              </button>
            ))}
          </div>
        )}

        {/* Grid of Places */}
        <div className="flex-1 overflow-y-auto p-4">
          {sortedPlaces.length === 0 ? (
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
                  onClick={() => handlePlaceClick(place)}
                  className={cn(
                    "bg-card rounded-xl overflow-hidden border border-border/50",
                    "cursor-pointer active:scale-[0.98] transition-all duration-200",
                    "hover:shadow-md hover:border-primary/30 group",
                    removingPlaceId === place.place_id 
                      ? "opacity-0 scale-95 transition-all duration-200" 
                      : "opacity-0 animate-fade-up"
                  )}
                  style={{ 
                    animationDelay: removingPlaceId === place.place_id ? '0ms' : `${index * 50}ms`, 
                    animationFillMode: 'forwards' 
                  }}
                >
                  <div className="aspect-square relative overflow-hidden">
                    <img 
                      src={getPlaceImage(place.place_id)} 
                      alt={place.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    
                    {/* Remove from Board Button */}
                    <button 
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white active:scale-95 transition-all"
                      onClick={(e) => handleRemove(e, place)}
                    >
                      <Heart className="w-4 h-4 text-primary fill-primary" />
                    </button>
                    
                    {/* Rating Badge */}
                    {place.rating && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-0.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-[11px] font-medium text-white">{place.rating.toFixed(1)}</span>
                      </div>
                    )}
                    
                    {/* Distance Badge */}
                    {place.distance_meters && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-0.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
                        <MapPin className="w-3 h-3 text-white" />
                        <span className="text-[11px] font-medium text-white">
                          {(place.distance_meters / 1000).toFixed(1)}km
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2.5">
                    <h3 className="font-medium text-foreground text-sm line-clamp-1">{place.name}</h3>
                    <p className="text-[11px] text-muted-foreground capitalize line-clamp-1 mt-0.5">
                      {place.categories?.[0]?.replace(/_/g, " ") || "Place"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BoardView;