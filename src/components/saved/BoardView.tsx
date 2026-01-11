import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MoreVertical, Pencil, Trash2, MapPin, Star, SortAsc, Filter, DollarSign, Heart, Sparkles, Loader2 } from "lucide-react";
import type { RankedPlace } from "@/hooks/useSearch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Board } from "@/hooks/useBoards";
import { useLocation } from "@/hooks/useLocation";

// Format price level to $ symbols
const formatPriceLevel = (priceLevel: number | null | undefined): string | null => {
  if (priceLevel === null || priceLevel === undefined) return null;
  return '$'.repeat(Math.max(1, Math.min(priceLevel, 4)));
};

// Haversine distance calculation
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

interface BoardViewProps {
  board: Board | "all";
  places: RankedPlace[];
  placeImages?: Record<string, string[]>;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPlaceClick?: (place: RankedPlace) => void;
  onManagePlace?: (place: RankedPlace) => void;
}

type SortOption = "recent" | "name" | "rating" | "distance";
type FilterOption = "all" | "$$" | "$$$" | "nearby";

const BoardView = ({ board, places, placeImages = {}, onClose, onEdit, onDelete, onPlaceClick, onManagePlace }: BoardViewProps) => {
  const navigate = useNavigate();
  const { location: userLocation } = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [localPlaces, setLocalPlaces] = useState<RankedPlace[]>(places); // Local state to keep All Saved in sync
  
  // AI Suggestions state
  const [suggestions, setSuggestions] = useState<RankedPlace[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  // State for board-specific places (fetched from DB for custom boards)
  const [boardPlacesData, setBoardPlacesData] = useState<RankedPlace[]>([]);
  const [isLoadingBoardPlaces, setIsLoadingBoardPlaces] = useState(false);
  
  const isAllSaved = board === "all";
  const boardName = isAllSaved ? "All Saved" : board.name;
  const colorClass = isAllSaved ? "from-primary to-primary/80" : board.color;
  const boardPlaceIds = isAllSaved ? places.map(p => p.place_id) : board.placeIds;
  
  // Fetch places for custom boards directly from the database
  useEffect(() => {
    const fetchBoardPlaces = async () => {
      if (isAllSaved || board.placeIds.length === 0) {
        setBoardPlacesData([]);
        return;
      }
      
      setIsLoadingBoardPlaces(true);
      try {
        const { data, error } = await supabase
          .from('places')
          .select('*')
          .in('place_id', board.placeIds);
          
        if (error) {
          console.error('Error fetching board places:', error);
          return;
        }
        
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        
        const fetchedPlaces: RankedPlace[] = (data || []).map(place => ({
          place_id: place.place_id,
          name: place.name,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          categories: place.categories,
          rating: place.rating,
          ratings_total: place.ratings_total,
          provider: place.provider,
          eta_seconds: null,
          distance_meters: null,
          score: 0,
          why: place.ai_reason || '',
          photo_name: place.photo_name,
          photos: place.photos?.slice(0, 3).map((photoPath: string) => 
            `${supabaseUrl}/functions/v1/place-photo?photo_name=${encodeURIComponent(photoPath)}&maxWidthPx=400`
          ) || (place.photo_name ? [`${supabaseUrl}/functions/v1/place-photo?photo_name=${encodeURIComponent(place.photo_name)}&maxWidthPx=400`] : undefined),
          filter_tags: place.filter_tags,
          price_level: place.price_level,
        }));
        
        setBoardPlacesData(fetchedPlaces);
      } catch (err) {
        console.error('Failed to fetch board places:', err);
      } finally {
        setIsLoadingBoardPlaces(false);
      }
    };
    
    fetchBoardPlaces();
  }, [isAllSaved, board]);

  // Sync local places with props (for "all saved" board)
  useEffect(() => {
    if (isAllSaved) {
      setLocalPlaces(places);
    }
  }, [isAllSaved, places]);
  
  // Get places for this board - use local state for optimistic updates
  const rawBoardPlaces = isAllSaved ? localPlaces : boardPlacesData;
  
  // Add distance calculation for places that don't have it
  const boardPlaces = rawBoardPlaces.map(place => {
    if (place.distance_meters !== null || !userLocation || !place.lat || !place.lng) {
      return place;
    }
    return {
      ...place,
      distance_meters: calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng)
    };
  });
  
  // Fetch AI suggestions when board loads
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (boardPlaceIds.length === 0) return;
      
      setIsLoadingSuggestions(true);
      try {
        const { data, error } = await supabase.functions.invoke('suggest-places', {
          body: { 
            placeIds: boardPlaceIds,
            boardName: boardName,
            limit: 4
          }
        });

        if (error) {
          console.error('Error fetching suggestions:', error);
          return;
        }

        if (data?.suggestions) {
          // Convert to RankedPlace format
          const suggestedPlaces: RankedPlace[] = data.suggestions.map((s: any) => ({
            place_id: s.place_id,
            name: s.name,
            categories: s.categories,
            rating: s.rating,
            ratings_total: s.ratings_total,
            address: s.address,
            lat: s.lat,
            lng: s.lng,
            photo_name: s.photo_name,
            photos: s.photos,
            provider: s.provider || 'google',
            score: s.score || 0,
            why: s.ai_reason || `Similar to your ${boardName} collection`,
          }));
          setSuggestions(suggestedPlaces);
        }
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [boardPlaceIds.length, boardName]);
  
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

  const getPlaceImage = (place: RankedPlace): string => {
    // Try placeImages first (already resolved URLs)
    if (placeImages[place.place_id]?.[0]) {
      return placeImages[place.place_id][0];
    }
    // Try place's own photos array (already resolved URLs from suggest-places or saved places)
    if (place.photos?.[0]) {
      // Check if it's already a URL or needs to be converted
      const photo = place.photos[0];
      if (photo.startsWith('http')) {
        return photo;
      }
      // Convert photo path to edge function URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      return `${supabaseUrl}/functions/v1/place-photo?photo_name=${encodeURIComponent(photo)}&maxWidthPx=400`;
    }
    // Try photo_name
    if (place.photo_name) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      return `${supabaseUrl}/functions/v1/place-photo?photo_name=${encodeURIComponent(place.photo_name)}&maxWidthPx=400`;
    }
    // Fallback
    return `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400`;
  };

  const handlePlaceClick = (place: RankedPlace) => {
    if (onPlaceClick) {
      onPlaceClick(place);
    } else {
      navigate(`/place/${place.place_id}`);
    }
  };

  const handleHeartClick = (e: React.MouseEvent, place: RankedPlace) => {
    e.stopPropagation();
    onManagePlace?.(place);
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
              {isAllSaved 
                ? `${boardPlaces.length} ${boardPlaces.length === 1 ? 'spot' : 'spots'} saved`
                : `${board.placeIds.length} ${board.placeIds.length === 1 ? 'spot' : 'spots'} saved`
              }
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingBoardPlaces ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : sortedPlaces.length === 0 ? (
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
            <>
              {/* Grid of Places */}
              <div className="grid grid-cols-2 gap-3">
                {sortedPlaces.map((place, index) => (
                  <div 
                    key={place.place_id}
                    onClick={() => handlePlaceClick(place)}
                    className={cn(
                      "bg-card rounded-xl overflow-hidden border border-border/50",
                      "cursor-pointer active:scale-[0.98] transition-all duration-200",
                      "hover:shadow-md hover:border-primary/30 group",
                      "opacity-0 animate-fade-up"
                    )}
                    style={{ 
                      animationDelay: `${index * 50}ms`, 
                      animationFillMode: 'forwards' 
                    }}
                  >
                    <div className="aspect-square relative overflow-hidden">
                      <img 
                        src={getPlaceImage(place)} 
                        alt={place.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      
                      {/* Manage Saved Spot Button */}
                      <button 
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white active:scale-95 transition-all"
                        onClick={(e) => handleHeartClick(e, place)}
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
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[11px] text-muted-foreground capitalize line-clamp-1">
                          {place.categories?.[0]?.replace(/_/g, " ") || "Place"}
                        </p>
                        {formatPriceLevel(place.price_level) && (
                          <span className="text-[11px] font-medium text-primary">
                            {formatPriceLevel(place.price_level)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Suggestions Section */}
              {showSuggestions && (suggestions.length > 0 || isLoadingSuggestions) && (
                <div className="mt-6 pt-6 border-t border-border/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">You might also like</h3>
                    </div>
                    <button 
                      onClick={() => setShowSuggestions(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Hide
                    </button>
                  </div>
                  
                  {isLoadingSuggestions ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="ml-2 text-sm text-muted-foreground">Finding similar spots...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {suggestions.map((place, index) => (
                        <div 
                          key={place.place_id}
                          onClick={() => handlePlaceClick(place)}
                          className="bg-card rounded-xl overflow-hidden border border-dashed border-primary/30 
                                     cursor-pointer active:scale-[0.98] transition-all duration-200
                                     hover:shadow-md hover:border-primary/50 group opacity-0 animate-fade-up"
                          style={{ 
                            animationDelay: `${index * 50}ms`, 
                            animationFillMode: 'forwards' 
                          }}
                        >
                          <div className="aspect-square relative overflow-hidden">
                            <img 
                              src={getPlaceImage(place)} 
                              alt={place.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            
                            {/* AI Badge */}
                            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-primary/90 backdrop-blur-sm">
                              <Sparkles className="w-3 h-3 text-primary-foreground" />
                              <span className="text-[10px] font-medium text-primary-foreground">Suggested</span>
                            </div>
                            
                            {/* Save Button - Heart icon at top right */}
                            <button 
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white active:scale-95 transition-all"
                              onClick={(e) => handleHeartClick(e, place)}
                            >
                              <Heart className="w-4 h-4 text-muted-foreground" />
                            </button>
                            
                            {/* Rating Badge */}
                            {place.rating && (
                              <div className="absolute bottom-2 left-2 flex items-center gap-0.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                <span className="text-[11px] font-medium text-white">{place.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="p-2.5">
                            <h3 className="font-medium text-foreground text-sm line-clamp-1">{place.name}</h3>
                            {place.why && (
                              <p className="text-[11px] text-primary/80 line-clamp-2 mt-0.5">
                                {place.why}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default BoardView;
