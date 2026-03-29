import { useState } from "react";
import { Link2, Loader2, MapPin, Star, X, Check, AlertCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/integrations/supabase/client";
import SaveToBoardDialog from "./SaveToBoardDialog";

interface ImportedPlace {
  place_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  photo_url: string | null;
}

type ImportState = "idle" | "loading" | "found" | "error";

interface ImportLinkDialogProps {
  open: boolean;
  onClose: () => void;
}

const ImportLinkDialog = ({ open, onClose }: ImportLinkDialogProps) => {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<ImportState>("idle");
  const [place, setPlace] = useState<ImportedPlace | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showBoardDialog, setShowBoardDialog] = useState(false);
  const { isSaved } = useApp();

  const handleImport = async () => {
    if (!url.trim()) return;

    setState("loading");
    setErrorMsg("");
    setPlace(null);

    try {
      const { data, error } = await supabase.functions.invoke("import-from-link", {
        body: { url: url.trim() },
      });

      if (error) {
        setState("error");
        setErrorMsg("Something went wrong. Please try again.");
        return;
      }

      if (data?.error) {
        setState("error");
        setErrorMsg(data.error);
        return;
      }

      setPlace(data as ImportedPlace);
      setState("found");
    } catch {
      setState("error");
      setErrorMsg("Network error. Please check your connection.");
    }
  };

  const handleSave = () => {
    if (!place) return;
    setShowBoardDialog(true);
  };

  const handleBoardSaved = () => {
    setShowBoardDialog(false);
    handleClose();
  };

  const handleClose = () => {
    setUrl("");
    setState("idle");
    setPlace(null);
    setErrorMsg("");
    onClose();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch {
      // Clipboard access denied
    }
  };

  if (!open) return null;

  const alreadySaved = place ? isSaved(place.place_id) : false;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative z-50 w-full max-w-md mx-4 mb-4 sm:mb-0 bg-card rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Import a Place</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* URL Input */}
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              Paste an Instagram, TikTok, or Google Maps link
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm placeholder:text-muted-foreground focus:outline-none"
                disabled={state === "loading"}
                onKeyDown={(e) => e.key === "Enter" && handleImport()}
              />
              <button
                onClick={handlePaste}
                className="px-3 py-2.5 rounded-xl bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors"
                disabled={state === "loading"}
              >
                Paste
              </button>
            </div>
          </div>

          {/* Loading State */}
          {state === "loading" && (
            <div className="flex items-center gap-3 py-6 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Finding place...</span>
            </div>
          )}

          {/* Found State - Place Preview */}
          {state === "found" && place && (
            <div className="rounded-xl bg-muted/30 overflow-hidden">
              <div className="flex gap-3 p-3">
                {place.photo_url ? (
                  <img
                    src={place.photo_url}
                    alt={place.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm truncate">{place.name}</h3>
                  {place.address && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{place.address}</p>
                  )}
                  {place.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-xs text-foreground font-medium">{place.rating}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {state === "error" && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-destructive/10">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 flex gap-2">
          {state === "found" && place ? (
            alreadySaved ? (
              <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-medium">
                <Check className="w-4 h-4" />
                Already saved
              </div>
            ) : (
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                Save to My Spots
              </button>
            )
          ) : (
            <button
              onClick={handleImport}
              disabled={!url.trim() || state === "loading"}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Import
            </button>
          )}
        </div>
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

export default ImportLinkDialog;
