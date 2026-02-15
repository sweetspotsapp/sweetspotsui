import { useState, useEffect, useMemo } from "react";
import { X, Check, FolderPlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBoards } from "@/hooks/useBoards";
import { useApp } from "@/context/AppContext";

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
  const { boards, createBoard, addPlaceToBoard, removePlaceFromBoard, isLoading } = useBoards();
  const { toggleSave, isSaved } = useApp();
  
  const [selectedBoards, setSelectedBoards] = useState<string[]>([]);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardColor, setNewBoardColor] = useState(categoryColors[0].value);
  const [isSaving, setIsSaving] = useState(false);
  const [wasInitiallySaved, setWasInitiallySaved] = useState<boolean | null>(null);
  const [initialBoardIds, setInitialBoardIds] = useState<string[]>([]);

  // Capture initial saved status and board memberships once when dialog opens
  useEffect(() => {
    if (wasInitiallySaved === null) {
      setWasInitiallySaved(isSaved(placeId));
      const boardsWithPlace = boards.filter(b => b.placeIds.includes(placeId)).map(b => b.id);
      setInitialBoardIds(boardsWithPlace);
    }
  }, [placeId, isSaved, wasInitiallySaved, boards]);

  // Pre-select boards that already contain this place
  useEffect(() => {
    const boardsWithPlace = boards.filter(b => b.placeIds.includes(placeId)).map(b => b.id);
    setSelectedBoards(boardsWithPlace);
  }, [boards, placeId]);

  // Determine if user has made changes to board selections
  const hasSelectionChanges = useMemo(() => {
    if (selectedBoards.length !== initialBoardIds.length) return true;
    return !selectedBoards.every(id => initialBoardIds.includes(id));
  }, [selectedBoards, initialBoardIds]);

  // Check if all boards are deselected (user wants to remove from all)
  const allBoardsDeselected = selectedBoards.length === 0 && initialBoardIds.length > 0;

  const toggleBoard = (boardId: string) => {
    setSelectedBoards(prev => 
      prev.includes(boardId) 
        ? prev.filter(id => id !== boardId)
        : [...prev, boardId]
    );
  };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;
    setIsSaving(true);
    
    try {
      const newBoard = await createBoard(newBoardName.trim(), newBoardColor, [placeId]);
      if (newBoard) {
        // Also save the place if not already saved
        if (!isSaved(placeId)) {
          await toggleSave(placeId);
        }
        setNewBoardName("");
        setShowNewBoard(false);
        onSaved?.();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const alreadySaved = isSaved(placeId);

      // If user deselected all boards and wants to remove entirely
      if (allBoardsDeselected && wasInitiallySaved) {
        await handleRemoveEntirely();
        return;
      }

      // First, ensure the place is saved
      if (!alreadySaved) {
        await toggleSave(placeId);
      }

      // Update each board's places
      for (const board of boards) {
        const shouldHavePlace = selectedBoards.includes(board.id);
        const hasPlace = board.placeIds.includes(placeId);

        if (shouldHavePlace && !hasPlace) {
          await addPlaceToBoard(board.id, placeId);
        } else if (!shouldHavePlace && hasPlace) {
          await removePlaceFromBoard(board.id, placeId);
        }
      }

      onSaved?.();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveEntirely = async () => {
    setIsSaving(true);

    try {
      if (isSaved(placeId)) {
        await toggleSave(placeId);
      }
      onSaved?.();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // Determine button label based on context
  const getActionButtonLabel = () => {
    // If user unchecked all boards → show clear removal action
    if (allBoardsDeselected) {
      return "Remove from saved";
    }
    
    // If user made changes to board selection → update
    if (hasSelectionChanges && selectedBoards.length > 0) {
      return "Update boards";
    }
    
    // If place is already saved and no changes → Done
    if (wasInitiallySaved && !hasSelectionChanges) {
      return "Done";
    }
    
    // New save scenario
    if (selectedBoards.length === 0) {
      return "Save to All Saved";
    }
    
    return `Save to ${selectedBoards.length} ${selectedBoards.length === 1 ? 'board' : 'boards'}`;
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
            <h2 className="text-lg font-semibold text-foreground">
              {wasInitiallySaved ? "Manage boards" : "Save to Board"}
            </h2>
            <p className="text-xs text-muted-foreground line-clamp-1">"{placeName}"</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Board List */}
            <div className="max-h-[50vh] overflow-y-auto p-4 space-y-2">
              {boards.length === 0 && !showNewBoard ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    No boards yet. Create your first one!
                  </p>
                </div>
              ) : (
                boards.map((board) => (
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
                      disabled={!newBoardName.trim() || isSaving}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                        newBoardName.trim() && !isSaving
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
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
            <div className="px-4 pt-4 pb-20 border-t border-border/50 space-y-2">
              {/* Show "Remove from all & unsave" only when place is saved AND is in at least one board AND user hasn't deselected all */}
              {wasInitiallySaved && initialBoardIds.length > 0 && !allBoardsDeselected && (
                <button
                  onClick={handleRemoveEntirely}
                  disabled={isSaving}
                  className="w-full py-3 rounded-xl border border-destructive/50 text-destructive font-medium 
                             hover:bg-destructive/10 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Remove from all & unsave
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "w-full py-3 rounded-xl font-medium transition-colors active:scale-[0.98] flex items-center justify-center gap-2",
                  allBoardsDeselected 
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {getActionButtonLabel()}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SaveToBoardDialog;
