import { useState, useEffect } from "react";
import { Plus, Menu, User, SortAsc, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { RankedPlace } from "@/hooks/useSearch";
import { useBoards, Board } from "@/hooks/useBoards";
import { useSavedPlaces } from "@/hooks/useSavedPlaces";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Components
import BoardCard from "./saved/BoardCard";
import BoardView from "./saved/BoardView";
import BoardEditor from "./saved/BoardEditor";
import EmptyState from "./saved/EmptyState";

type SortOption = "recent" | "alphabetical" | "most-saved";

const SavedPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { boards, isLoading: boardsLoading, deleteBoard, removePlaceFromBoard, updateBoard, refetch: refetchBoards } = useBoards();
  const { savedPlaceIds, isLoading: savedLoading, toggleSave } = useSavedPlaces();
  
  const [savedPlaces, setSavedPlaces] = useState<RankedPlace[]>([]);
  const [placeImages, setPlaceImages] = useState<Record<string, string[]>>({});
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  
  const [selectedBoard, setSelectedBoard] = useState<Board | "all" | null>(null);
  const [showBoardEditor, setShowBoardEditor] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Fetch saved places data
  useEffect(() => {
    const fetchSavedPlaces = async () => {
      if (savedPlaceIds.size === 0) {
        setSavedPlaces([]);
        setPlaceImages({});
        return;
      }

      setIsLoadingPlaces(true);
      try {
        const placeIdsArray = Array.from(savedPlaceIds);
        
        const { data, error } = await supabase
          .from('places')
          .select('*')
          .in('place_id', placeIdsArray);

        if (error) {
          console.error('Error fetching saved places:', error);
          return;
        }
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        // Convert to RankedPlace format
        const places: RankedPlace[] = (data || []).map(place => ({
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

        setSavedPlaces(places);

        // Build photo map - convert photo paths to URLs using the place-photo edge function
        const photoMap: Record<string, string[]> = {};
        
        for (const place of data || []) {
          // Check for photos array first (contains paths like "places/ChIJ.../photos/...")
          if (place.photos && place.photos.length > 0) {
            // Convert paths to edge function URLs
            const photoUrls = place.photos.slice(0, 3).map((photoPath: string) => 
              `${supabaseUrl}/functions/v1/place-photo?photo_name=${encodeURIComponent(photoPath)}&maxWidthPx=400`
            );
            photoMap[place.place_id] = photoUrls;
          } else if (place.photo_name) {
            // Use photo_name if no photos array
            const photoUrl = `${supabaseUrl}/functions/v1/place-photo?photo_name=${encodeURIComponent(place.photo_name)}&maxWidthPx=400`;
            photoMap[place.place_id] = [photoUrl];
          }
        }
        
        setPlaceImages(photoMap);
      } catch (err) {
        console.error('Failed to fetch saved places:', err);
      } finally {
        setIsLoadingPlaces(false);
      }
    };

    fetchSavedPlaces();
  }, [savedPlaceIds]);
  
  // Get cover images for a board (up to 3 for collage)
  const getBoardCoverImages = (board: Board): string[] => {
    return board.placeIds
      .slice(0, 3)
      .map(placeId => placeImages[placeId]?.[0])
      .filter(Boolean) as string[];
  };

  // Get all saved places images for "All Saved" board
  const getAllSavedImages = (): string[] => {
    return savedPlaces
      .slice(0, 3)
      .map(place => placeImages[place.place_id]?.[0])
      .filter(Boolean) as string[];
  };

  // Sort boards
  const sortedBoards = [...boards].sort((a, b) => {
    switch (sortBy) {
      case "alphabetical": return a.name.localeCompare(b.name);
      case "most-saved": return b.placeIds.length - a.placeIds.length;
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const handleEditBoard = (board: Board) => {
    setEditingBoard(board);
    setSelectedBoard(null);
    setShowBoardEditor(true);
  };

  const handleDeleteBoard = async (board: Board) => {
    await deleteBoard(board.id);
    setSelectedBoard(null);
  };

  const handleRemoveFromBoard = async (placeId: string) => {
    if (selectedBoard === "all") {
      // Remove from saved places entirely
      await toggleSave(placeId);
      // Also update local savedPlaces state immediately
      setSavedPlaces(prev => prev.filter(p => p.place_id !== placeId));
      return;
    }
    
    if (selectedBoard) {
      await removePlaceFromBoard(selectedBoard.id, placeId);
      // Update the selectedBoard state as well
      setSelectedBoard(prev => 
        prev && prev !== "all" 
          ? { ...prev, placeIds: prev.placeIds.filter(id => id !== placeId) }
          : prev
      );
    }
  };

  const isLoading = boardsLoading || savedLoading || isLoadingPlaces;
  const hasBoards = boards.length > 0 || savedPlaces.length > 0;

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 pb-20 max-w-md mx-auto">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <User className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Sign in to save spots</h2>
        <p className="text-muted-foreground text-center mb-6">
          Create an account to save your favorite places and organize them into boards
        </p>
        <button
          onClick={() => navigate('/auth')}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background pb-20 max-w-md mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/40">
          <div className="flex items-center justify-between px-4 py-3">
            <button 
              onClick={() => navigate('/')}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                SweetSpots
              </span>
            </div>
            
            <button 
              onClick={() => navigate('/profile')}
              className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors"
            >
              <User className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </header>

        {/* Page Title */}
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-foreground">Saved Spots</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your curated collection of favorite places
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !hasBoards ? (
          <EmptyState type="boards" />
        ) : (
          <>
            {/* Sort Bar */}
            <div className="flex items-center justify-between px-4 pb-4">
              <span className="text-xs text-muted-foreground font-medium">
                {boards.length + 1} boards
              </span>
              
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                >
                  <SortAsc className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground capitalize">{sortBy.replace('-', ' ')}</span>
                </button>
                
                {showSortMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-card rounded-xl shadow-lg border border-border overflow-hidden min-w-[150px]">
                      {(["recent", "alphabetical", "most-saved"] as SortOption[]).map((option) => (
                        <button
                          key={option}
                          onClick={() => { setSortBy(option); setShowSortMenu(false); }}
                          className={cn(
                            "w-full px-4 py-2.5 text-left text-sm capitalize transition-colors",
                            sortBy === option 
                              ? "bg-primary/10 text-primary font-medium" 
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          {option.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Pinterest-Style Masonry Grid */}
            <div className="px-4 pb-6">
              <div className="grid grid-cols-2 gap-3">
                {/* All Saved Board - Always First */}
                <BoardCard
                  isAllSaved
                  savedCount={savedPlaces.length}
                  coverImages={getAllSavedImages()}
                  onClick={() => setSelectedBoard("all")}
                  animationDelay={0}
                />

                {/* Custom Boards */}
                {sortedBoards.map((board, index) => (
                  <BoardCard
                    key={board.id}
                    board={board}
                    coverImages={getBoardCoverImages(board)}
                    onClick={() => setSelectedBoard(board)}
                    onOptions={() => handleEditBoard(board)}
                    animationDelay={(index + 1) * 50}
                  />
                ))}

                {/* Add New Board Button */}
                <button
                  onClick={() => {
                    setEditingBoard(null);
                    setShowBoardEditor(true);
                  }}
                  className="aspect-[4/5] rounded-2xl border-2 border-dashed border-border/60 
                             flex flex-col items-center justify-center gap-2 text-muted-foreground 
                             hover:border-primary/50 hover:text-primary hover:bg-primary/5 
                             transition-all active:scale-[0.98]"
                >
                  <Plus className="w-8 h-8" />
                  <span className="text-sm font-medium">New Board</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Board View Modal */}
      {selectedBoard && (
        <BoardView
          board={selectedBoard}
          places={savedPlaces}
          placeImages={placeImages}
          onClose={() => setSelectedBoard(null)}
          onEdit={selectedBoard !== "all" ? () => handleEditBoard(selectedBoard) : undefined}
          onDelete={selectedBoard !== "all" ? () => handleDeleteBoard(selectedBoard) : undefined}
          onPlaceClick={(place) => navigate(`/place/${place.place_id}`)}
          onRemoveFromBoard={handleRemoveFromBoard}
        />
      )}

      {/* Board Editor */}
      {showBoardEditor && (
        <BoardEditor
          onClose={() => {
            setShowBoardEditor(false);
            setEditingBoard(null);
            refetchBoards();
          }}
          editBoard={editingBoard}
          savedPlaces={savedPlaces}
        />
      )}
    </>
  );
};

export default SavedPage;
