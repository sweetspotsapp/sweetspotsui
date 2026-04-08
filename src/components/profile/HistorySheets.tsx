import { Search, Eye, Heart, Clock, Loader2, RotateCcw } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format } from "date-fns";

interface SearchHistoryItem {
  id: string;
  prompt: string;
  created_at: string;
}

interface PlaceHistoryItem {
  place_id: string;
  name: string;
  action: string;
  created_at: string;
}

interface InteractionDetail {
  place_id: string;
  name: string;
  action: string;
  created_at: string;
  weight: number;
}

interface HistorySheetsProps {
  showSearchHistory: boolean;
  onSearchHistoryChange: (open: boolean) => void;
  searchHistory: SearchHistoryItem[];
  showPlacesHistory: boolean;
  onPlacesHistoryChange: (open: boolean) => void;
  placesHistory: PlaceHistoryItem[];
  showInteractionDetails: boolean;
  onInteractionDetailsChange: (open: boolean) => void;
  interactionDetails: InteractionDetail[];
  isLoadingHistory: boolean;
  isLoadingInteractions: boolean;
  onClearSearchHistory: () => void;
}

const HistorySheets = ({
  showSearchHistory, onSearchHistoryChange, searchHistory,
  showPlacesHistory, onPlacesHistoryChange, placesHistory,
  showInteractionDetails, onInteractionDetailsChange, interactionDetails,
  isLoadingHistory, isLoadingInteractions, onClearSearchHistory,
}: HistorySheetsProps) => (
  <>
    {/* Search History Sheet */}
    <Sheet open={showSearchHistory} onOpenChange={onSearchHistoryChange}>
      <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              Mood Search History
            </div>
            {searchHistory.length > 0 && (
              <button onClick={onClearSearchHistory} className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                Clear all
              </button>
            )}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 overflow-y-auto max-h-[55vh] space-y-2">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
          ) : searchHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No searches yet. Start exploring!</p>
          ) : (
            searchHistory.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3 bg-card rounded-xl border border-border">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Search className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">{item.prompt}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {format(new Date(item.created_at), "MMM d, yyyy · h:mm a")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>

    {/* Places History Sheet */}
    <Sheet open={showPlacesHistory} onOpenChange={onPlacesHistoryChange}>
      <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            Places You've Explored
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 overflow-y-auto max-h-[55vh] space-y-2">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
          ) : placesHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No places explored yet. Start discovering!</p>
          ) : (
            placesHistory.map((item, index) => (
              <div key={`${item.place_id}-${index}`} className="flex items-start gap-3 p-3 bg-card rounded-xl border border-border">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.action === "save" ? <Heart className="w-4 h-4 text-primary" /> : <Eye className="w-4 h-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground capitalize px-1.5 py-0.5 bg-muted rounded-full">
                      {item.action === "save" ? "Saved" : "Viewed"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(item.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>

    {/* Interaction Details Sheet */}
    <Sheet open={showInteractionDetails} onOpenChange={onInteractionDetailsChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            Your Interactions
            <span className="text-xs text-muted-foreground font-normal ml-auto">{interactionDetails.length} total</span>
          </SheetTitle>
        </SheetHeader>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          These are the places you've clicked and saved — they shape your Vibe DNA.
        </p>
        <div className="overflow-y-auto space-y-2 pr-1" style={{ maxHeight: 'calc(70vh - 120px)' }}>
          {isLoadingInteractions ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
          ) : interactionDetails.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No interactions yet</p>
          ) : (
            interactionDetails.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${item.action === 'save' ? 'bg-rose-500/10' : 'bg-primary/10'}`}>
                  {item.action === 'save' ? <Heart className="w-3.5 h-3.5 text-rose-500" /> : <Eye className="w-3.5 h-3.5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${item.action === 'save' ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary'}`}>
                      {item.action === 'save' ? `Saved (×${item.weight})` : `Viewed (×${item.weight})`}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(item.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  </>
);

export default HistorySheets;
