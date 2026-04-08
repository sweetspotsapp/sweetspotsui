import { useState, useEffect, useRef } from "react";
import { X, Search, Loader2, MapPin, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { SwapAlternative } from "@/hooks/useTrip";

interface ReplaceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  destination: string;
  onSelectPlace: (place: { name: string; placeId?: string; category: string; description: string; photoName?: string; lat?: number; lng?: number; address?: string }) => void;
  onFetchSuggestions: () => Promise<SwapAlternative[] | undefined>;
}

const ReplaceSheet = ({ isOpen, onClose, currentName, destination, onSelectPlace, onFetchSuggestions }: ReplaceSheetProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SwapAlternative[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "similar">("search");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-load suggestions when opening
  useEffect(() => {
    if (isOpen && !suggestionsLoaded) {
      setSuggestionsLoading(true);
      onFetchSuggestions().then((alts) => {
        if (alts) setSuggestions(alts);
        setSuggestionsLoaded(true);
        setSuggestionsLoading(false);
      }).catch(() => setSuggestionsLoading(false));
    }
  }, [isOpen]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setSuggestions([]);
      setSuggestionsLoaded(false);
      setActiveTab("search");
    }
  }, [isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && activeTab === "search") {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, activeTab]);

  // Debounced place search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("place-autocomplete", {
          body: { input: `${searchQuery} in ${destination}` },
        });
        if (!error && data?.predictions) {
          setSearchResults(data.predictions.slice(0, 6));
        }
      } catch (e) {
        console.error("Search failed:", e);
      }
      setSearchLoading(false);
    }, 400);

    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery, destination]);

  const handleSelectSearchResult = (result: any) => {
    onSelectPlace({
      name: result.main_text || result.description,
      placeId: result.place_id,
      category: "landmark",
      description: result.description || "",
    });
    onClose();
  };

  const handleSelectSuggestion = (alt: SwapAlternative) => {
    onSelectPlace({
      name: alt.name,
      category: alt.category,
      description: alt.description,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 z-50 max-w-[420px] mx-auto animate-fade-up">
        <div className="bg-card rounded-t-3xl shadow-elevated max-h-[75vh] overflow-hidden flex flex-col">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-6 pt-2 pb-3 flex items-center justify-between border-b border-border">
            <div>
              <h3 className="text-base font-semibold text-foreground">Replace Activity</h3>
              <p className="text-xs text-muted-foreground">Replacing "{currentName}"</p>
            </div>
            <button onClick={onClose} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-6 pt-3 pb-2">
            <button
              onClick={() => setActiveTab("search")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === "search"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Search className="w-3 h-3" />
              Search Places
            </button>
            <button
              onClick={() => setActiveTab("similar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === "similar"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              Similar Places
              {suggestionsLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2 min-h-[200px]">
            {activeTab === "search" && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search places in ${destination}...`}
                    className="pl-9 rounded-xl h-10 bg-muted/30 border-border"
                  />
                  {searchLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {searchResults.map((result, i) => (
                      <button
                        key={result.place_id || i}
                        onClick={() => handleSelectSearchResult(result)}
                        className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground block truncate">{result.main_text}</span>
                          {result.secondary_text && (
                            <span className="text-xs text-muted-foreground block truncate">{result.secondary_text}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">No places found. Try a different search.</p>
                )}

                {searchQuery.length < 2 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Search for any place in {destination} to add to your trip
                  </p>
                )}
              </>
            )}

            {activeTab === "similar" && (
              <>
                {suggestionsLoading && (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <p className="text-xs text-muted-foreground">Finding similar places...</p>
                  </div>
                )}

                {!suggestionsLoading && suggestions.length > 0 && (
                  <div className="space-y-2">
                    {suggestions.map((alt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectSuggestion(alt)}
                        className="w-full text-left px-4 py-3 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors space-y-1"
                      >
                        <span className="text-sm font-medium text-foreground block">{alt.name}</span>
                        <p className="text-xs text-muted-foreground">{alt.description}</p>
                        {alt.reasoning && (
                          <p className="text-[11px] text-primary italic">{alt.reasoning}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {!suggestionsLoading && suggestions.length === 0 && suggestionsLoaded && (
                  <p className="text-xs text-muted-foreground text-center py-6">No similar places found. Try searching instead.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ReplaceSheet;
