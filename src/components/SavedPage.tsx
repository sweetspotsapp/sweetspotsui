import { useState } from "react";
import { Heart, Plus, Menu, User, SortAsc } from "lucide-react";
import { useApp, PlaceCategory } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { RankedPlace } from "@/hooks/useSearch";

// Components
import BoardCard from "./saved/BoardCard";
import BoardView from "./saved/BoardView";
import BoardEditor from "./saved/BoardEditor";
import EmptyState from "./saved/EmptyState";
import PlaceDetail from "./PlaceDetail";

const getPlaceholderImage = (name: string, categories?: string[] | null): string => {
  const category = categories?.[0] || "place";
  return `https://source.unsplash.com/400x400/?${encodeURIComponent(`${category} ${name}`)}`;
};

type SortOption = "recent" | "alphabetical" | "most-saved";

const SavedPage = () => {
  const navigate = useNavigate();
  const { savedPlaceIds, categories, rankedPlaces, deleteCategory } = useApp();
  
  const [selectedBoard, setSelectedBoard] = useState<PlaceCategory | "all" | null>(null);
  const [showBoardEditor, setShowBoardEditor] = useState(false);
  const [editingBoard, setEditingBoard] = useState<PlaceCategory | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<RankedPlace | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Get saved places
  const savedPlaces = rankedPlaces.filter(p => savedPlaceIds.has(p.place_id));
  
  // Get cover image for a board (first place's image or default)
  const getBoardCoverImage = (board: PlaceCategory): string | undefined => {
    const firstPlaceId = board.placeIds[0];
    const place = rankedPlaces.find(p => p.place_id === firstPlaceId);
    return place ? getPlaceholderImage(place.name, place.categories) : undefined;
  };

  // Sort boards
  const sortedBoards = [...categories].sort((a, b) => {
    switch (sortBy) {
      case "alphabetical": return a.name.localeCompare(b.name);
      case "most-saved": return b.placeIds.length - a.placeIds.length;
      default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const handleEditBoard = (board: PlaceCategory) => {
    setEditingBoard(board);
    setSelectedBoard(null);
    setShowBoardEditor(true);
  };

  const handleDeleteBoard = (board: PlaceCategory) => {
    deleteCategory(board.id);
    setSelectedBoard(null);
  };

  const hasBoards = categories.length > 0 || savedPlaces.length > 0;

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
            
            <button className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors">
              <User className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </header>

        {/* Page Title */}
        <div className="px-4 pt-5 pb-3">
          <h1 className="text-2xl font-bold text-foreground">Saved Spots</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize your favorite spots your way
          </p>
        </div>

        {!hasBoards ? (
          <EmptyState type="boards" />
        ) : (
          <>
            {/* Sort & Filter Bar */}
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-xs text-muted-foreground">
                {categories.length + 1} {categories.length === 0 ? 'board' : 'boards'}
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

            {/* Pinterest-Style Grid */}
            <div className="px-4 pb-6">
              <div className="grid grid-cols-2 gap-3">
                {/* All Saved Board - Always First */}
                <BoardCard
                  isAllSaved
                  savedCount={savedPlaces.length}
                  coverImage={savedPlaces[0] ? getPlaceholderImage(savedPlaces[0].name, savedPlaces[0].categories) : undefined}
                  onClick={() => setSelectedBoard("all")}
                  animationDelay={0}
                />

                {/* Custom Boards */}
                {sortedBoards.map((board, index) => (
                  <BoardCard
                    key={board.id}
                    board={board}
                    coverImage={getBoardCoverImage(board)}
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
                  className="aspect-[4/3] rounded-2xl border-2 border-dashed border-border/60 
                             flex flex-col items-center justify-center gap-2 text-muted-foreground 
                             hover:border-primary/50 hover:text-primary hover:bg-primary/5 
                             transition-all active:scale-[0.98]"
                >
                  <Plus className="w-8 h-8" />
                  <span className="text-sm font-medium">New Board</span>
                </button>
              </div>
            </div>

            {/* Recent Saves Preview */}
            {savedPlaces.length > 0 && (
              <div className="px-4 pb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground">Recently Saved</h2>
                  <button 
                    onClick={() => setSelectedBoard("all")}
                    className="text-xs text-primary font-medium"
                  >
                    See all
                  </button>
                </div>
                
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  {savedPlaces.slice(0, 6).map((place, index) => (
                    <div
                      key={place.place_id}
                      onClick={() => setSelectedPlace(place)}
                      className="flex-shrink-0 w-[120px] cursor-pointer active:scale-[0.98] transition-transform 
                                 opacity-0 animate-fade-up"
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                    >
                      <div className="aspect-square rounded-xl overflow-hidden mb-1.5">
                        <img 
                          src={getPlaceholderImage(place.name, place.categories)} 
                          alt={place.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h3 className="text-xs font-medium text-foreground line-clamp-1">{place.name}</h3>
                      <p className="text-[10px] text-muted-foreground capitalize line-clamp-1">
                        {place.categories?.[0]?.replace(/_/g, " ") || "Place"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Board View Modal */}
      {selectedBoard && (
        <BoardView
          board={selectedBoard}
          onClose={() => setSelectedBoard(null)}
          onEdit={selectedBoard !== "all" ? () => handleEditBoard(selectedBoard) : undefined}
          onDelete={selectedBoard !== "all" ? () => handleDeleteBoard(selectedBoard) : undefined}
        />
      )}

      {/* Board Editor */}
      {showBoardEditor && (
        <BoardEditor
          onClose={() => {
            setShowBoardEditor(false);
            setEditingBoard(null);
          }}
          editBoard={editingBoard}
        />
      )}

      {/* Place Detail */}
      {selectedPlace && (
        <PlaceDetail 
          place={selectedPlace} 
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </>
  );
};

export default SavedPage;
