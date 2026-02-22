import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Check, Loader2, Search, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnifiedSearch, UnifiedPlace } from "@/hooks/useUnifiedSearch";
import { Input } from "@/components/ui/input";

interface BrowsePlace {
  place_id: string;
  name: string;
  photo_url?: string;
  rating?: number;
  categories?: string[];
  address?: string;
}

interface BrowseForTripProps {
  destination: string;
  selectedPlaceIds: string[];
  onConfirm: (placeIds: string[]) => void;
  onBack: () => void;
}

const BrowseForTrip = ({ destination, selectedPlaceIds: initialSelected, onConfirm, onBack }: BrowseForTripProps) => {
  const { search, isSearching } = useUnifiedSearch();
  const [places, setPlaces] = useState<BrowsePlace[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [searchValue, setSearchValue] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);

  // Initial load — search for places in destination
  useEffect(() => {
    if (hasLoaded) return;
    const load = async () => {
      const result = await search(`popular spots in ${destination}`, { locationName: destination, skipCache: true });
      if (result?.places) {
        setPlaces(result.places.map(toPlace));
      }
      setHasLoaded(true);
    };
    load();
  }, [destination, search, hasLoaded]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    const result = await search(`${searchValue.trim()} in ${destination}`, { locationName: destination, skipCache: true });
    if (result?.places) {
      setPlaces(result.places.map(toPlace));
    }
  };

  const togglePlace = useCallback((placeId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }, []);

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
  };

  return (
    <div className="fixed inset-0 z-[70] bg-background flex flex-col animate-fade-up" style={{ animationDuration: "200ms" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground truncate">Browse Spots</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {destination}
            </p>
          </div>
          {selected.size > 0 && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              {selected.size} selected
            </span>
          )}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="max-w-lg mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={`Search in ${destination}...`}
              className="pl-10 pr-4 rounded-xl py-2.5 h-auto bg-card border-border text-sm"
            />
          </div>
        </form>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4">
          {!hasLoaded || isSearching ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : places.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <p className="text-sm text-muted-foreground">No spots found in {destination}</p>
              <p className="text-xs text-muted-foreground">Try a different search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {places.map((place) => {
                const isSelected = selected.has(place.place_id);
                return (
                  <button
                    key={place.place_id}
                    onClick={() => togglePlace(place.place_id)}
                    className={cn(
                      "relative rounded-2xl overflow-hidden border-2 transition-all text-left",
                      isSelected
                        ? "border-primary shadow-md"
                        : "border-transparent hover:border-border"
                    )}
                  >
                    {/* Image */}
                    <div className="aspect-[4/3] bg-muted relative">
                      {place.photo_url ? (
                        <img
                          src={place.photo_url}
                          alt={place.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-muted-foreground/40" />
                        </div>
                      )}

                      {/* Checkbox */}
                      <div className={cn(
                        "absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all",
                        isSelected
                          ? "bg-primary shadow-lg"
                          : "bg-background/80 backdrop-blur-sm border border-border"
                      )}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                      </div>

                      {/* Category pill */}
                      {place.categories?.[0] && (
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-card/90 backdrop-blur-sm text-[10px] font-medium text-foreground rounded-full max-w-[100px] truncate block">
                          {place.categories[0]}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-2.5 space-y-0.5">
                      <h3 className="text-sm font-medium text-foreground line-clamp-1">{place.name}</h3>
                      {place.rating && (
                        <p className="text-xs text-muted-foreground">★ {place.rating.toFixed(1)}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-md border-t border-border/40 px-4 py-4 pb-8 lg:pb-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleConfirm}
            className={cn(
              "w-full py-3.5 rounded-2xl text-sm font-semibold transition-all",
              selected.size > 0
                ? "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                : "bg-muted text-muted-foreground"
            )}
          >
            {selected.size > 0 ? `Add ${selected.size} Spot${selected.size > 1 ? "s" : ""} to Trip` : "Continue Without Adding"}
          </button>
        </div>
      </div>
    </div>
  );
};

const toPlace = (p: UnifiedPlace): BrowsePlace => ({
  place_id: p.place_id,
  name: p.name,
  photo_url: p.photo_url || undefined,
  rating: p.rating || undefined,
  categories: p.categories || undefined,
  address: p.address || undefined,
});

export default BrowseForTrip;
