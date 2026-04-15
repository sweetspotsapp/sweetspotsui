import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Check, Heart, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBoards } from "@/hooks/useBoards";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSavedPlaces } from "@/hooks/useSavedPlaces";

interface BoardPickerProps {
  selectedPlaceIds: string[];
  onPlaceIdsChange: (ids: string[]) => void;
  selectedBoardIds: string[];
  onBoardIdsChange: (ids: string[]) => void;
  destination?: string;
  onBrowse?: () => void;
}

interface PlaceInfo {
  place_id: string;
  name: string;
  address: string | null;
}

interface VirtualBoard {
  id: string;
  name: string;
  color: string;
  placeIds: string[];
  isAllSaved?: boolean;
}

const BoardPicker = ({ selectedPlaceIds, onPlaceIdsChange, selectedBoardIds, onBoardIdsChange, destination, onBrowse }: BoardPickerProps) => {
  const { user } = useAuth();
  const { boards } = useBoards();
  const { savedPlaceIds } = useSavedPlaces();
  const [expandedBoard, setExpandedBoard] = useState<string | null>(null);
  const [placesMap, setPlacesMap] = useState<Record<string, PlaceInfo[]>>({});

  const allSavedIds = Array.from(savedPlaceIds);
  const virtualBoards: VirtualBoard[] = [
    ...(allSavedIds.length > 0 ? [{
      id: "__all_saved__",
      name: "All Saved",
      color: "from-primary to-primary/70",
      placeIds: allSavedIds,
      isAllSaved: true,
    }] : []),
    ...boards.map(b => ({ id: b.id, name: b.name, color: b.color, placeIds: b.placeIds })),
  ];

  useEffect(() => {
    if (!expandedBoard || placesMap[expandedBoard]) return;
    const board = virtualBoards.find(b => b.id === expandedBoard);
    if (!board || board.placeIds.length === 0) return;

    const loadPlaces = async () => {
      const { data } = await supabase
        .from("places")
        .select("place_id, name, address")
        .in("place_id", board.placeIds);

      if (data) {
        setPlacesMap(prev => ({ ...prev, [expandedBoard]: data }));
      }
    };
    loadPlaces();
  }, [expandedBoard, virtualBoards]);

  const togglePlace = (placeId: string) => {
    onPlaceIdsChange(
      selectedPlaceIds.includes(placeId)
        ? selectedPlaceIds.filter(id => id !== placeId)
        : [...selectedPlaceIds, placeId]
    );
  };

  // Filter places by destination if provided
  const filterByDestination = (places: PlaceInfo[]): PlaceInfo[] => {
    if (!destination) return places;
    const dest = destination.toLowerCase();
    return places.filter(p => {
      const addr = (p.address || "").toLowerCase();
      return addr.includes(dest) || dest.includes(addr.split(",").pop()?.trim() || "");
    });
  };

  const hasNoSavedSpots = !user || virtualBoards.length === 0;

  return (
    <section className="space-y-3">
      {/* Tab-like header for Saved Spots and Browse */}
      <div className="flex items-center gap-4">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add Spots</label>
      </div>

      <div className="flex gap-2">
        <button
          className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-card border border-border text-foreground shadow-sm"
          disabled
        >
          From Saved
        </button>
        {onBrowse && (
          <button
            onClick={onBrowse}
            className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5" />
            Browse
          </button>
        )}
      </div>

      {hasNoSavedSpots ? (
        <div className="px-4 py-6 rounded-2xl bg-card border border-border text-center space-y-3">
          <Heart className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">
            {!user ? "Log in to add saved spots" : destination ? `No saved spots in ${destination}.` : "No saved spots yet"}
          </p>
          {onBrowse && (
            <button
              onClick={onBrowse}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Browse spots
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {virtualBoards.map((board) => {
            const isExpanded = expandedBoard === board.id;
            const rawPlaces = placesMap[board.id] || [];
            const places = filterByDestination(rawPlaces);
            const boardSelectedCount = board.placeIds.filter(id => selectedPlaceIds.includes(id)).length;

            return (
              <div key={board.id} className="rounded-2xl bg-card border border-border overflow-hidden">
                <button
                  onClick={() => setExpandedBoard(isExpanded ? null : board.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    board.isAllSaved ? "bg-primary" : "bg-gradient-to-br " + board.color
                  )}>
                    <Heart className={cn("w-4 h-4", board.isAllSaved ? "text-primary-foreground fill-primary-foreground" : "text-primary-foreground")} />
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
                    ) : rawPlaces.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">Loading...</p>
                    ) : places.length === 0 ? (
                      <div className="py-3 text-center space-y-2">
                        <p className="text-xs text-muted-foreground">No saved spots in {destination || "this destination"}.</p>
                        {onBrowse && (
                          <button
                            onClick={onBrowse}
                            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            Browse spots
                          </button>
                        )}
                      </div>
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
                              isSelected ? "bg-primary border-primary" : "border-border"
                            )}>
                              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <span className="text-sm text-foreground flex-1 truncate">{place.name}</span>
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
      )}
    </section>
  );
};

export default BoardPicker;