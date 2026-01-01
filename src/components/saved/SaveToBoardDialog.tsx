import { useState } from "react";
import { X, Plus, Check, FolderPlus } from "lucide-react";
import { useApp, PlaceCategory } from "@/context/AppContext";
import { cn } from "@/lib/utils";

interface SaveToBoardDialogProps {
  placeId: string;
  placeName: string;
  onClose: () => void;
  onSaved?: () => void;
}

const categoryColors = [
  { name: "Rose", value: "from-rose-500 to-pink-600" },
  { name: "Violet", value: "from-violet-500 to-purple-600" },
  { name: "Blue", value: "from-blue-500 to-cyan-600" },
  { name: "Emerald", value: "from-emerald-500 to-teal-600" },
  { name: "Amber", value: "from-amber-500 to-orange-600" },
];

const boardSuggestions = ["Chill", "Party", "Date", "Family", "Solo", "Work"];

const SaveToBoardDialog = ({ placeId, placeName, onClose, onSaved }: SaveToBoardDialogProps) => {
  const { categories, createCategory, updateCategory } = useApp();
  const [selectedBoards, setSelectedBoards] = useState<string[]>(() => {
    // Pre-select boards that already contain this place
    return categories.filter(c => c.placeIds.includes(placeId)).map(c => c.id);
  });
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardColor, setNewBoardColor] = useState(categoryColors[0].value);

  const toggleBoard = (boardId: string) => {
    setSelectedBoards(prev => 
      prev.includes(boardId) 
        ? prev.filter(id => id !== boardId)
        : [...prev, boardId]
    );
  };

  const handleCreateBoard = () => {
    if (!newBoardName.trim()) return;
    createCategory(newBoardName.trim(), [placeId], newBoardColor);
    setNewBoardName("");
    setShowNewBoard(false);
    onSaved?.();
  };

  const handleSave = () => {
    // Update each board's placeIds
    categories.forEach(board => {
      const shouldHavePlace = selectedBoards.includes(board.id);
      const hasPlace = board.placeIds.includes(placeId);
      
      if (shouldHavePlace && !hasPlace) {
        updateCategory(board.id, board.name, [...board.placeIds, placeId]);
      } else if (!shouldHavePlace && hasPlace) {
        updateCategory(board.id, board.name, board.placeIds.filter(id => id !== placeId));
      }
    });
    
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative w-full max-w-md bg-card rounded-t-3xl animate-slide-in-bottom">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-border/50">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Save to Board</h2>
            <p className="text-xs text-muted-foreground line-clamp-1">"{placeName}"</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Board List */}
        <div className="max-h-[50vh] overflow-y-auto p-4 space-y-2">
          {categories.length === 0 && !showNewBoard ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">
                No boards yet. Create your first one!
              </p>
            </div>
          ) : (
            categories.map((board) => (
              <button
                key={board.id}
                onClick={() => toggleBoard(board.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                  selectedBoards.includes(board.id)
                    ? "bg-primary/10 border-primary/50"
                    : "bg-background border-border hover:border-primary/30"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg bg-gradient-to-br flex-shrink-0",
                  board.color
                )} />
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-foreground text-sm">{board.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {board.placeIds.length} spots
                  </p>
                </div>
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                  selectedBoards.includes(board.id)
                    ? "bg-primary border-primary"
                    : "border-muted-foreground/30"
                )}>
                  {selectedBoards.includes(board.id) && (
                    <Check className="w-3.5 h-3.5 text-primary-foreground" />
                  )}
                </div>
              </button>
            ))
          )}

          {/* New Board Form */}
          {showNewBoard ? (
            <div className="p-4 rounded-xl border border-primary/50 bg-primary/5 space-y-3">
              <input
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Board name"
                className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground 
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              
              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-2">
                {boardSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setNewBoardName(suggestion)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      newBoardName === suggestion
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2">
                {categoryColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setNewBoardColor(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-full bg-gradient-to-br transition-all",
                      color.value,
                      newBoardColor === color.value 
                        ? "ring-2 ring-foreground ring-offset-2 ring-offset-card scale-110" 
                        : "hover:scale-105"
                    )}
                  />
                ))}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewBoard(false)}
                  className="flex-1 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBoard}
                  disabled={!newBoardName.trim()}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                    newBoardName.trim() 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  Create
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewBoard(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-border 
                         hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <FolderPlus className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="font-medium text-foreground text-sm">Create New Board</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50">
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium 
                       hover:bg-primary/90 transition-colors active:scale-[0.98]"
          >
            Save to {selectedBoards.length} {selectedBoards.length === 1 ? 'Board' : 'Boards'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveToBoardDialog;
