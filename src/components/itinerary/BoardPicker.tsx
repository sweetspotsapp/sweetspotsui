import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Check, Lock, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBoards } from "@/hooks/useBoards";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface BoardPickerProps {
  selectedPlaceIds: string[];
  onPlaceIdsChange: (ids: string[]) => void;
  selectedBoardIds: string[];
  onBoardIdsChange: (ids: string[]) => void;
}

interface PlaceInfo {
  place_id: string;
  name: string;
}

const BoardPicker = ({ selectedPlaceIds, onPlaceIdsChange, selectedBoardIds, onBoardIdsChange }: BoardPickerProps) => {
  const { user } = useAuth();
  const { boards, isLoading } = useBoards();
  const [expandedBoard, setExpandedBoard] = useState<string | null>(null);
  const [placesMap, setPlacesMap] = useState<Record<string, PlaceInfo[]>>({});

  // Load place names when a board is expanded
  useEffect(() => {
    if (!expandedBoard || placesMap[expandedBoard]) return;
    const board = boards.find(b => b.id === expandedBoard);
    if (!board || board.placeIds.length === 0) return;

    const loadPlaces = async () => {
      const { data } = await supabase
        .from("places")
        .select("place_id, name")
        .in("place_id", board.placeIds);
      
      if (data) {
        setPlacesMap(prev => ({ ...prev, [expandedBoard]: data }));
      }
    };
    loadPlaces();
  }, [expandedBoard, boards, placesMap]);

  const togglePlace = (placeId: string) => {
    onPlaceIdsChange(
      selectedPlaceIds.includes(placeId)
        ? selectedPlaceIds.filter(id => id !== placeId)
        : [...selectedPlaceIds, placeId]
    );
  };

  if (!user || boards.length === 0) {
    return (
      <section className="space-y-2">
        <label className="text-sm font-medium text-foreground">Add from Saved Spots</label>
        <div className="px-4 py-6 rounded-2xl bg-card border border-border text-center">
          <Heart className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {!user ? "Log in to add saved spots" : "No saved boards yet"}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <label className="text-sm font-medium text-foreground">Add from Saved Spots</label>
      <div className="space-y-2">
        {boards.map((board) => {
          const isExpanded = expandedBoard === board.id;
          const places = placesMap[board.id] || [];
          const boardSelectedCount = board.placeIds.filter(id => selectedPlaceIds.includes(id)).length;

          return (
            <div key={board.id} className="rounded-2xl bg-card border border-border overflow-hidden">
              <button
                onClick={() => setExpandedBoard(isExpanded ? null : board.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              >
                <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center", board.color)}>
                  <Heart className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground block truncate">{board.name}</span>
                  <span className="text-xs text-muted-foreground">{board.placeIds.length} spots</span>
                </div>
                {boardSelectedCount > 0 && (
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {boardSelectedCount} selected
                  </span>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-border px-4 py-2 space-y-1">
                  {board.placeIds.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No spots in this board</p>
                  ) : places.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Loading...</p>
                  ) : (
                    places.map((place) => {
                      const isSelected = selectedPlaceIds.includes(place.place_id);
                      return (
                        <button
                          key={place.place_id}
                          onClick={() => togglePlace(place.place_id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-muted/30 transition-colors"
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0",
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-border"
                          )}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <span className="text-sm text-foreground flex-1 truncate">{place.name}</span>
                          {isSelected && (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              <Lock className="w-3 h-3" /> Must Include
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default BoardPicker;
