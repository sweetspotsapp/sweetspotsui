import { useState } from "react";
import { Plus, Menu, User, SortAsc } from "lucide-react";
import { useApp, PlaceCategory } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { RankedPlace } from "@/hooks/useSearch";

// Components
import BoardCard from "./saved/BoardCard";
import BoardView from "./saved/BoardView";
import BoardEditor from "./saved/BoardEditor";
import EmptyState from "./saved/EmptyState";

// ============= DUMMY IMAGES FOR CONTEXT =============
const PLACE_IMAGES: Record<string, string[]> = {
  sp1: [
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400",
  ],
  sp2: [
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400",
    "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400",
  ],
  sp3: [
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400",
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400",
  ],
  sp4: [
    "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=400",
    "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400",
  ],
  sp5: [
    "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400",
    "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=400",
  ],
  sp6: [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400",
  ],
  sp7: [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
  ],
  sp8: [
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400",
  ],
};

// ============= DUMMY SAVED PLACES =============
const DUMMY_SAVED_PLACES: RankedPlace[] = [
  {
    place_id: "sp1",
    name: "The Velvet Corner",
    categories: ["café", "coffee"],
    rating: 4.7,
    ratings_total: 234,
    address: "123 Cozy Lane, Melbourne CBD",
    lat: -37.8136,
    lng: 144.9631,
    photo_name: null,
    provider: "google",
    eta_seconds: 600,
    distance_meters: 1200,
    score: 0.92,
    why: "Perfect for a quiet work session",
  },
  {
    place_id: "sp2",
    name: "Midnight Ramen House",
    categories: ["restaurant", "japanese"],
    rating: 4.8,
    ratings_total: 512,
    address: "45 Noodle Street, Fitzroy",
    lat: -37.7992,
    lng: 144.9784,
    photo_name: null,
    provider: "google",
    eta_seconds: 900,
    distance_meters: 1800,
    score: 0.95,
    why: "Best late-night ramen in town",
  },
  {
    place_id: "sp3",
    name: "Rooftop Sunset Bar",
    categories: ["bar", "rooftop"],
    rating: 4.5,
    ratings_total: 328,
    address: "Level 12, 88 Collins St",
    lat: -37.8142,
    lng: 144.9632,
    photo_name: null,
    provider: "google",
    eta_seconds: 480,
    distance_meters: 800,
    score: 0.88,
    why: "Stunning city views at sunset",
  },
  {
    place_id: "sp4",
    name: "Green Garden Brunch",
    categories: ["restaurant", "brunch"],
    rating: 4.6,
    ratings_total: 189,
    address: "22 Chapel St, Prahran",
    lat: -37.8497,
    lng: 144.9926,
    photo_name: null,
    provider: "google",
    eta_seconds: 720,
    distance_meters: 2500,
    score: 0.90,
    why: "Amazing avocado toast and outdoor seating",
  },
  {
    place_id: "sp5",
    name: "The Jazz Cellar",
    categories: ["bar", "music_venue"],
    rating: 4.9,
    ratings_total: 421,
    address: "5 Basement Lane, CBD",
    lat: -37.8125,
    lng: 144.9644,
    photo_name: null,
    provider: "google",
    eta_seconds: 360,
    distance_meters: 500,
    score: 0.97,
    why: "Intimate jazz vibes every night",
  },
  {
    place_id: "sp6",
    name: "Ocean View Café",
    categories: ["café", "coastal"],
    rating: 4.4,
    ratings_total: 156,
    address: "1 Beach Road, St Kilda",
    lat: -37.8676,
    lng: 144.9741,
    photo_name: null,
    provider: "google",
    eta_seconds: 1200,
    distance_meters: 5000,
    score: 0.85,
    why: "Fresh sea breeze and great coffee",
  },
  {
    place_id: "sp7",
    name: "Little Italy Kitchen",
    categories: ["restaurant", "italian"],
    rating: 4.7,
    ratings_total: 298,
    address: "88 Lygon St, Carlton",
    lat: -37.8010,
    lng: 144.9671,
    photo_name: null,
    provider: "google",
    eta_seconds: 540,
    distance_meters: 1500,
    score: 0.91,
    why: "Authentic pasta and cozy vibes",
  },
  {
    place_id: "sp8",
    name: "Twilight Lounge",
    categories: ["bar", "cocktail"],
    rating: 4.6,
    ratings_total: 267,
    address: "55 Flinders Lane, CBD",
    lat: -37.8155,
    lng: 144.9628,
    photo_name: null,
    provider: "google",
    eta_seconds: 420,
    distance_meters: 600,
    score: 0.89,
    why: "Creative cocktails in speakeasy style",
  },
];

// ============= DUMMY BOARDS =============
const DUMMY_BOARDS: PlaceCategory[] = [
  {
    id: "board1",
    name: "Date Night Spots",
    placeIds: ["sp3", "sp5", "sp8"],
    color: "from-rose-500 to-pink-600",
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "board2",
    name: "Brunch Faves",
    placeIds: ["sp1", "sp4", "sp6"],
    color: "from-amber-500 to-orange-600",
    createdAt: new Date("2024-01-10"),
  },
  {
    id: "board3",
    name: "Late Night Eats",
    placeIds: ["sp2", "sp5"],
    color: "from-violet-500 to-purple-600",
    createdAt: new Date("2024-01-05"),
  },
  {
    id: "board4",
    name: "Solo Coffee Runs",
    placeIds: ["sp1", "sp6"],
    color: "from-emerald-500 to-teal-600",
    createdAt: new Date("2024-01-01"),
  },
];

// Get images for a place
const getPlaceImages = (placeId: string): string[] => {
  return PLACE_IMAGES[placeId] || [];
};

type SortOption = "recent" | "alphabetical" | "most-saved";

const SavedPage = () => {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<PlaceCategory[]>(DUMMY_BOARDS);
  const savedPlaces = DUMMY_SAVED_PLACES;
  
  const [selectedBoard, setSelectedBoard] = useState<PlaceCategory | "all" | null>(null);
  const [showBoardEditor, setShowBoardEditor] = useState(false);
  const [editingBoard, setEditingBoard] = useState<PlaceCategory | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  // Get cover images for a board (up to 3 for collage)
  const getBoardCoverImages = (board: PlaceCategory): string[] => {
    return board.placeIds
      .slice(0, 3)
      .map(placeId => getPlaceImages(placeId)[0])
      .filter(Boolean);
  };

  // Get all saved places images for "All Saved" board
  const getAllSavedImages = (): string[] => {
    return savedPlaces
      .slice(0, 3)
      .map(place => getPlaceImages(place.place_id)[0])
      .filter(Boolean);
  };

  // Sort boards
  const sortedBoards = [...boards].sort((a, b) => {
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
    setBoards(prev => prev.filter(b => b.id !== board.id));
    setSelectedBoard(null);
  };

  const handleRemoveFromBoard = (placeId: string) => {
    if (selectedBoard === "all") {
      // For "All Saved", this would remove from savedPlaces entirely
      // For now with dummy data, we just show the toast
      return;
    }
    
    if (selectedBoard) {
      // Remove the place from the current board
      setBoards(prev => prev.map(b => 
        b.id === selectedBoard.id 
          ? { ...b, placeIds: b.placeIds.filter(id => id !== placeId) }
          : b
      ));
      // Update the selectedBoard state as well
      setSelectedBoard(prev => 
        prev && prev !== "all" 
          ? { ...prev, placeIds: prev.placeIds.filter(id => id !== placeId) }
          : prev
      );
    }
  };

  const hasBoards = boards.length > 0 || savedPlaces.length > 0;

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
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-foreground">Saved Spots</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your curated collection of favorite places
          </p>
        </div>

        {!hasBoards ? (
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
          placeImages={PLACE_IMAGES}
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
          }}
          editBoard={editingBoard}
          availablePlaces={savedPlaces}
        />
      )}
    </>
  );
};

export default SavedPage;