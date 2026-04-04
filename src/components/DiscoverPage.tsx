import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Sparkles, Loader2, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnifiedSearch, type UnifiedPlace } from "@/hooks/useUnifiedSearch";
import { useNavigate } from "react-router-dom";
import AISummaryCard from "./AISummaryCard";
import { useSavedPlaces } from "@/hooks/useSavedPlaces";
import RecentSearches from "./RecentSearches";
import FirstSearchTooltip from "./FirstSearchTooltip";
const vibeChips = [
  "Cozy cafés",
  "Rooftop bars",
  "Hidden gems",
  "Street food",
  "Sunset spots",
  "Art & culture",
  "Nature escapes",
  "Late-night eats",
];

const getPhotoUrl = (photoName: string | null): string | null => {
  if (!photoName) return null;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/place-photo?photo_name=${encodeURIComponent(photoName)}&maxWidthPx=400`;
};

const DiscoverPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { places, summary, isSearching, error, search, clearResults } = useUnifiedSearch();
  const { savedPlaceIds, toggleSave } = useSavedPlaces();
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;
    setHasSearched(true);
    await search(q, {
      locationName: searchLocation || undefined,
      radiusM: 5000,
      limit: 20,
    });
  };

  const handleChipClick = (chip: string) => {
    setQuery(chip);
    handleSearch(chip);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClear = () => {
    setQuery("");
    setHasSearched(false);
    clearResults();
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-4 pt-14 lg:pt-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">Discover</h1>
          <p className="text-sm text-muted-foreground">Find spots that match your vibe</p>
        </div>

        {/* Search bar */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-3">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. cozy cafes with good matcha"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {query && (
              <button onClick={handleClear} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Location input */}
          <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-2.5">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="City or area (optional)"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <button
            onClick={() => handleSearch()}
            disabled={!query.trim() || isSearching}
            className={cn(
              "w-full py-3 rounded-xl text-sm font-semibold transition-all",
              query.trim() && !isSearching
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isSearching ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </span>
            ) : (
              "Search"
            )}
          </button>
        </div>

        {/* Guided tooltip + Recent searches + Vibe chips — show when no results yet */}
        {!hasSearched && (
          <>
            <FirstSearchTooltip />
            <RecentSearches onSelect={(q) => { setQuery(q); handleSearch(q); }} />
            <div className="mb-8">
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Try a vibe</p>
              <div className="flex flex-wrap gap-2">
                {vibeChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleChipClick(chip)}
                    className="px-3 py-1.5 rounded-full text-sm bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* AI Summary */}
        {summary && <AISummaryCard summary={summary} searchQuery={query} />}

        {/* Error */}
        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">{error}</p>
            <button onClick={() => handleSearch()} className="mt-2 text-sm text-primary font-medium">
              Try again
            </button>
          </div>
        )}

        {/* Results */}
        {places.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{places.length} spots found</p>
            {places.map((place) => (
              <DiscoverPlaceCard
                key={place.place_id}
                place={place}
                isSaved={savedPlaceIds.has(place.place_id)}
                onSave={() => toggleSave(place.place_id)}
                onClick={() => navigate(`/place/${place.place_id}`)}
              />
            ))}
          </div>
        )}

        {/* Empty state after search */}
        {hasSearched && !isSearching && places.length === 0 && !error && (
          <div className="text-center py-16">
            <Sparkles className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No spots found. Try a different vibe or location.</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Compact result card ── */
const DiscoverPlaceCard = ({
  place,
  isSaved,
  onSave,
  onClick,
}: {
  place: UnifiedPlace;
  isSaved: boolean;
  onSave: () => void;
  onClick: () => void;
}) => {
  const photoUrl = getPhotoUrl(place.photo_name);
  const distanceKm = place.distance_meters ? (place.distance_meters / 1000).toFixed(1) : null;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all text-left group"
    >
      {/* Photo */}
      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
        {photoUrl ? (
          <img src={photoUrl} alt={place.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <MapPin className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {place.name}
        </h3>
        {place.address && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{place.address}</p>
        )}
        <p className="text-xs text-foreground/70 mt-1 line-clamp-2 leading-relaxed">{place.why}</p>
        <div className="flex items-center gap-2 mt-1.5">
          {place.rating && (
            <span className="text-[11px] font-medium text-amber-600">★ {place.rating}</span>
          )}
          {distanceKm && (
            <span className="text-[11px] text-muted-foreground">{distanceKm} km</span>
          )}
          {place.price_level && (
            <span className="text-[11px] text-muted-foreground">{"$".repeat(place.price_level)}</span>
          )}
        </div>
      </div>
    </button>
  );
};

export default DiscoverPage;
