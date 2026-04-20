import { useState, useEffect, useRef } from "react";
import { Plus, SortAsc, Loader2, X, Search, ExternalLink } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import AppHeader from "./AppHeader";
import ProfileSlideMenu from "./ProfileSlideMenu";
import LoginReminderBanner from "./LoginReminderBanner";
import { useNavigate, useLocation as useRouterLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LS_IMPORT_TIP_DISMISSED } from "@/lib/storageKeys";
import type { RankedPlace } from "@/hooks/useSearch";
import { useBoards, Board } from "@/hooks/useBoards";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "@/hooks/useLocation";
import { useToast } from "@/hooks/use-toast";

// Components
import BoardCard from "./saved/BoardCard";
import BoardView from "./saved/BoardView";
import BoardEditor from "./saved/BoardEditor";
import EmptyState from "./saved/EmptyState";
import SaveToBoardDialog from "./saved/SaveToBoardDialog";
import ImportLinkDialog from "./saved/ImportLinkDialog";

import { haversineMeters } from "@/lib/placeUtils";
import { getPlacePhotoUrl } from "@/lib/photoLoader";

type SortOption = "recent" | "alphabetical" | "most-saved";

interface SavedPageProps {
  onNavigateToProfile?: () => void;
}

const SavedPage = ({ onNavigateToProfile }: SavedPageProps) => {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const { user } = useAuth();
  const { location: userLocation } = useLocation();
  const { boards, isLoading: boardsLoading, deleteBoard, refetch: refetchBoards } = useBoards();
  const { savedPlaceIds, isLoadingSavedPlaces, toggleSave, removeSavedPlaceIds } = useApp();
  useToast();
  const [savedPlaces, setSavedPlaces] = useState<RankedPlace[]>([]);
  const [placeImages, setPlaceImages] = useState<Record<string, string[]>>({});
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const isRemovingRef = useRef(false); // Track if we're in the middle of removing
  
  const [selectedBoard, setSelectedBoard] = useState<Board | "all" | null>(null);
  const [managePlace, setManagePlace] = useState<{ id: string; name: string } | null>(null);
  const [showBoardEditor, setShowBoardEditor] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddSpotMenu, setShowAddSpotMenu] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(() => 
    localStorage.getItem(LS_IMPORT_TIP_DISMISSED) === 'true'
  );
  // Handle openBoard state from navigation (e.g., when returning from place details)
  useEffect(() => {
    const state = routerLocation.state as { openBoard?: string | "all" } | null;
    if (state?.openBoard && boards.length > 0) {
      if (state.openBoard === "all") {
        setSelectedBoard("all");
      } else {
        const board = boards.find(b => b.id === state.openBoard);
        if (board) {
          setSelectedBoard(board);
        }
      }
      // Clear the state so it doesn't persist on refresh
      navigate(routerLocation.pathname, { replace: true, state: {} });
    }
  }, [routerLocation.state, boards, navigate, routerLocation.pathname]);

  // Fetch saved places data
  useEffect(() => {
    // Skip fetch if we're in the middle of removing
    if (isRemovingRef.current) return;
    
    const fetchSavedPlaces = async () => {
      if (savedPlaceIds.size === 0) {
        setSavedPlaces([]);
        setPlaceImages({});
        return;
      }

      setIsLoadingPlaces(true);
      try {
        const placeIdsArray = Array.from(savedPlaceIds);

        // Supabase .in() has a practical limit; batch in chunks of 50
        const BATCH_SIZE = 50;
        let allData: any[] = [];
        for (let i = 0; i < placeIdsArray.length; i += BATCH_SIZE) {
          const batch = placeIdsArray.slice(i, i + BATCH_SIZE);
          const { data: batchData, error: batchError } = await supabase
            .from('places')
            .select('*')
            .in('place_id', batch);
          if (batchError) {
            console.error('Error fetching saved places batch:', batchError);
            continue;
          }
          if (batchData) allData = allData.concat(batchData);
        }
        const data = allData;
        const error = null;

        if (error) {
          console.error('Error fetching saved places:', error);
          return;
        }
        // Convert to RankedPlace format with distance calculation
        const places: RankedPlace[] = (data || []).map(place => {
          let distance_meters: number | null = null;
          
          // Calculate distance if we have user location and place coordinates
          if (userLocation && place.lat && place.lng) {
            distance_meters = haversineMeters(
              userLocation.lat, userLocation.lng,
              place.lat, place.lng
            );
          }
          
          return {
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
            distance_meters,
            score: 0,
            why: place.ai_reason || '',
            photo_name: place.photo_name,
            photos: place.place_id ? [getPlacePhotoUrl(place.place_id)!].filter(Boolean) : undefined,
            filter_tags: place.filter_tags,
            price_level: place.price_level,
          };
        });

        setSavedPlaces(places);

        // Build photo map using flat place_id storage URLs
        const photoMap: Record<string, string[]> = {};
        
        for (const place of data || []) {
          const url = getPlacePhotoUrl(place.place_id);
          if (url) {
            photoMap[place.place_id] = [url];
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
  }, [savedPlaceIds, userLocation]);
  
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

  // Keep the currently opened custom board in sync with fresh board data
  useEffect(() => {
    if (!selectedBoard || selectedBoard === "all") return;

    const updated = boards.find(b => b.id === selectedBoard.id);
    if (!updated) {
      setSelectedBoard(null);
      return;
    }

    setSelectedBoard(updated);
  }, [boards, selectedBoard]);

  const handleEditBoard = (board: Board) => {
    setEditingBoard(board);
    setSelectedBoard(null);
    setShowBoardEditor(true);
  };

  const handleDeleteBoard = async (board: Board) => {
    const removedPlaceIds = await deleteBoard(board.id);
    if (removedPlaceIds && removedPlaceIds.length > 0) {
      removeSavedPlaceIds(removedPlaceIds);
      setSavedPlaces(prev => prev.filter(p => !removedPlaceIds.includes(p.place_id)));
    }
    setSelectedBoard(null);
  };


  const isLoading = boardsLoading || isLoadingSavedPlaces || isLoadingPlaces;
  const hasBoards = boards.length > 0 || savedPlaces.length > 0;

  // Smart unsave handler: immediate unsave for no-board places, dialog for board-managed places
  const handleSmartUnsave = async (place: RankedPlace) => {
    // Check if the place is in any boards
    const boardsContainingPlace = boards.filter(b => b.placeIds.includes(place.place_id));
    
    if (boardsContainingPlace.length === 0) {
      // Place is only in "All Saved" (no boards) → immediate unsave with toast
      isRemovingRef.current = true;
      
      // Optimistically remove from local state
      setSavedPlaces(prev => prev.filter(p => p.place_id !== place.place_id));
      
      await toggleSave(place.place_id);
      await refetchBoards();
      
      isRemovingRef.current = false;
    } else {
      // Place is in one or more boards → show dialog for management
      setManagePlace({ id: place.place_id, name: place.name });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20 max-w-md mx-auto">
        <AppHeader 
          onSettingsClick={() => setIsProfileMenuOpen(true)}
        />
        <LoginReminderBanner />
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-foreground">Saved Spots</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to save and organize your favorite places
          </p>
        </div>
        <EmptyState type="boards" onImportClick={() => navigate('/auth')} />
        <ProfileSlideMenu isOpen={isProfileMenuOpen} onClose={() => setIsProfileMenuOpen(false)} />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background pb-20 max-w-7xl mx-auto">
        <AppHeader 
          onSettingsClick={() => setIsProfileMenuOpen(true)}
        />

        {/* Page Title */}
        <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4">
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
          <EmptyState type="boards" onImportClick={() => setShowImportDialog(true)} />
        ) : (
          <>
            {/* Sort Bar */}
            <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 pb-4">
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

            {/* Import link bar — styled like the Discover search bar */}
            {!tipDismissed && savedPlaces.length >= 1 && (
              <div className="px-4 sm:px-6 lg:px-8 mb-4">
                <div className="relative flex items-center w-full">
                  <ExternalLink className="absolute left-4 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <button
                    onClick={() => setShowImportDialog(true)}
                    className="w-full h-14 pl-11 pr-24 rounded-full bg-muted/50 border border-border/50 text-left text-base text-muted-foreground/80 shadow-soft hover:bg-muted/70 transition-colors truncate"
                  >
                    Paste an Instagram, TikTok, or Google Maps link
                  </button>
                  <button
                    onClick={() => setShowImportDialog(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-soft hover:bg-primary/90 transition-colors"
                  >
                    Paste
                  </button>
                </div>
              </div>
            )}

            {/* Pinterest-Style Responsive Grid */}
            <div className="px-4 sm:px-6 lg:px-8 pb-6">
              {(boardsLoading || isLoadingPlaces) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="rounded-2xl overflow-hidden">
                      <Skeleton className="h-[160px] w-full rounded-2xl" />
                      <div className="pt-2 space-y-1">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!boardsLoading && !isLoadingPlaces && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
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
                    onRename={() => handleEditBoard(board)}
                    onEdit={() => setSelectedBoard(board)}
                    onDelete={() => handleDeleteBoard(board)}
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

              </div>}
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
          onPlaceClick={(place) => navigate(`/place/${place.place_id}`, { 
            state: { fromBoard: selectedBoard === "all" ? "all" : selectedBoard.id } 
          })}
          onManagePlace={handleSmartUnsave}
        />
      )}

      {/* Save / Manage Dialog */}
      {managePlace && (
        <SaveToBoardDialog
          placeId={managePlace.id}
          placeName={managePlace.name}
          onClose={() => setManagePlace(null)}
          onSaved={async () => {
            await refetchBoards();
          }}
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

      {/* Add Spot Action Sheet */}
      {showAddSpotMenu && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowAddSpotMenu(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl p-4 pb-28 max-w-md mx-auto shadow-lg animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
            <h3 className="text-base font-semibold text-foreground mb-3">Add a Spot</h3>
            <button
              onClick={() => { setShowAddSpotMenu(false); navigate('/?tab=discover'); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-medium text-foreground">Search Places</span>
                <p className="text-xs text-muted-foreground">Find hidden gems by vibe</p>
              </div>
            </button>
            <button
              onClick={() => { setShowAddSpotMenu(false); setShowImportDialog(true); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-medium text-foreground">Paste a Link</span>
                <p className="text-xs text-muted-foreground">From Instagram, TikTok, or Google Maps</p>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Import Link Dialog */}
      <ImportLinkDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />

      {/* Profile Slide Menu */}
      <ProfileSlideMenu 
        isOpen={isProfileMenuOpen} 
        onClose={() => setIsProfileMenuOpen(false)}
        onNavigateToProfile={() => {
          setIsProfileMenuOpen(false);
          onNavigateToProfile?.();
        }}
      />
    </>
  );
};

export default SavedPage;
