import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, Link2, MapPin, Star, Check, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/context/AppContext";
import SaveToBoardDialog from "@/components/saved/SaveToBoardDialog";

interface ImportedPlace {
  place_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  photo_url: string | null;
}

/**
 * Receives shared URLs from the PWA Share Target API (or direct navigation).
 * Extracts a URL from the query params (?url=...&text=...&title=...)
 * and automatically triggers the import-from-link flow.
 */
const ShareTarget = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSaved } = useApp();

  const [state, setState] = useState<"loading" | "found" | "error" | "no-url">("loading");
  const [place, setPlace] = useState<ImportedPlace | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showBoardDialog, setShowBoardDialog] = useState(false);
  const importAttempted = useRef(false);

  // Extract URL from share params — could be in ?url=, ?text=, or embedded in text
  const extractUrl = (): string | null => {
    const urlParam = searchParams.get("url");
    if (urlParam) return urlParam;

    const text = searchParams.get("text") || "";
    // Extract URL from text (TikTok/IG often put URL in the text field)
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) return urlMatch[0];

    const title = searchParams.get("title") || "";
    const titleMatch = title.match(/https?:\/\/[^\s]+/);
    if (titleMatch) return titleMatch[0];

    return null;
  };

  useEffect(() => {
    if (importAttempted.current) return;
    importAttempted.current = true;

    const url = extractUrl();
    if (!url) {
      setState("no-url");
      return;
    }

    const doImport = async () => {
      setState("loading");
      try {
        const { data, error } = await supabase.functions.invoke("import-from-link", {
          body: { url: url.trim() },
        });

        if (error || data?.error) {
          setState("error");
          setErrorMsg(data?.error || "Couldn't find a place from this link. Try a Google Maps, Instagram, or TikTok link.");
          return;
        }

        setPlace(data as ImportedPlace);
        setState("found");
      } catch {
        setState("error");
        setErrorMsg("Network error. Please check your connection.");
      }
    };

    doImport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    if (!user) {
      // Redirect to auth with return path
      navigate("/auth", { state: { returnTo: window.location.pathname + window.location.search } });
      return;
    }
    setShowBoardDialog(true);
  };

  const handleBoardSaved = () => {
    setShowBoardDialog(false);
    navigate("/saved");
  };

  const alreadySaved = place ? isSaved(place.place_id) : false;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Save a Spot</h1>
          </div>
        </div>

        {/* Loading */}
        {state === "loading" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium text-foreground">Finding place...</p>
              <p className="text-sm text-muted-foreground mt-1">Extracting details from the link</p>
            </div>
          </div>
        )}

        {/* No URL found */}
        {state === "no-url" && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Link2 className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">No link found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Share a link from TikTok, Instagram, or Google Maps to save a spot.
              </p>
            </div>
            <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl mt-2">
              Go Home
            </Button>
          </div>
        )}

        {/* Place found */}
        {state === "found" && place && (
          <div className="space-y-5">
            {/* Place card */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {place.photo_url ? (
                <img src={place.photo_url} alt={place.name} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-muted flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="p-4">
                <h2 className="text-lg font-semibold text-foreground">{place.name}</h2>
                {place.address && (
                  <p className="text-sm text-muted-foreground mt-1">{place.address}</p>
                )}
                {place.rating && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-medium text-foreground">{place.rating}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {alreadySaved ? (
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-muted text-muted-foreground font-medium">
                <Check className="w-5 h-5" />
                Already in your spots
              </div>
            ) : (
              <Button onClick={handleSave} className="w-full h-12 rounded-xl text-base font-semibold">
                Save to My Spots
              </Button>
            )}

            <button
              onClick={() => navigate(`/place/${place.place_id}`)}
              className="w-full text-center text-sm text-primary font-medium hover:underline"
            >
              View full details →
            </button>
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="font-medium text-foreground">Couldn't import</p>
                <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate("/")} variant="outline" className="flex-1 rounded-xl">
                Go Home
              </Button>
              <Button onClick={() => navigate("/saved")} className="flex-1 rounded-xl">
                My Spots
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Save to Board Dialog */}
      {showBoardDialog && place && (
        <SaveToBoardDialog
          placeId={place.place_id}
          placeName={place.name}
          onClose={() => setShowBoardDialog(false)}
          onSaved={handleBoardSaved}
        />
      )}
    </div>
  );
};

export default ShareTarget;
