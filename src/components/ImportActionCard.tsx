import { useState } from "react";
import { X, Loader2, Star, MapPin, ClipboardPaste, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/context/AppContext";
import SaveToBoardDialog from "./saved/SaveToBoardDialog";

interface ImportedPlace {
  place_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  photo_url: string | null;
}

type Stage = "actions" | "import-options" | "loading" | "found" | "saved";

interface ImportActionCardProps {
  open: boolean;
  onClose: () => void;
  onNavigateToTrip?: () => void;
}

const ImportActionCard = ({ open, onClose, onNavigateToTrip }: ImportActionCardProps) => {
  const [stage, setStage] = useState<Stage>("actions");
  const [url, setUrl] = useState("");
  const [place, setPlace] = useState<ImportedPlace | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showBoardDialog, setShowBoardDialog] = useState(false);
  const { isSaved } = useApp();

  if (!open) return null;

  const handleClose = () => {
    setStage("actions");
    setUrl("");
    setPlace(null);
    setErrorMsg("");
    onClose();
  };

  const handleReset = () => {
    setStage("actions");
    setUrl("");
    setPlace(null);
    setErrorMsg("");
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch {
      // Clipboard access denied
    }
  };

  const handleImport = async () => {
    if (!url.trim()) return;
    setStage("loading");
    setErrorMsg("");

    try {
      const { data, error } = await supabase.functions.invoke("import-from-link", {
        body: { url: url.trim() },
      });

      if (error || data?.error) {
        setErrorMsg(data?.error || "Something went wrong. Please try again.");
        setStage("import-options");
        return;
      }

      setPlace(data as ImportedPlace);
      setStage("found");
    } catch {
      setErrorMsg("Network error. Please check your connection.");
      setStage("import-options");
    }
  };

  const handleSaveToSweetspots = () => {
    if (!place) return;
    setShowBoardDialog(true);
  };

  const handleBoardSaved = () => {
    setShowBoardDialog(false);
    setStage("saved");
  };

  const platformIcons = [
    {
      id: "instagram",
      label: "IG",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="currentColor" opacity="0.15"/>
          <rect x="2" y="2" width="20" height="20" rx="5" fill="currentColor" opacity="0.15"/>
          <circle cx="12" cy="12" r="5" fill="currentColor" opacity="0.3"/>
          <circle cx="18" cy="6" r="1.5" fill="currentColor"/>
        </svg>
      ),
      disabled: true,
    },
    {
      id: "google",
      label: "Google",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      ),
      disabled: true,
    },
    {
      id: "tiktok",
      label: "TikTok",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.75a8.18 8.18 0 004.76 1.52V6.84a4.84 4.84 0 01-1-.15z"/>
        </svg>
      ),
      disabled: true,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

        {/* Card */}
        <div className="relative z-10 w-full max-w-md mx-4 mb-24 animate-in slide-in-from-bottom-8 duration-300">
          {/* Stage: Actions */}
          {stage === "actions" && (
            <div className="space-y-3">
              {/* Create New Trip - Disabled */}
              <div className="bg-card rounded-2xl p-4 opacity-50 cursor-not-allowed shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="currentColor">
                      <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">Create New Trip</p>
                    <p className="text-xs text-muted-foreground">Create New Trip</p>
                  </div>
                </div>
              </div>

              {/* Import Your SweetSpots */}
              <button
                onClick={() => setStage("import-options")}
                className="w-full bg-card rounded-2xl p-4 text-left shadow-lg transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="currentColor">
                      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">Import Your SweetSpots</p>
                    <p className="text-xs text-muted-foreground">Import Your SweetSpots</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Stage: Import Options */}
          {stage === "import-options" && (
            <div className="space-y-3">
              {/* Import Header Card */}
              <div className="bg-card rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="currentColor">
                      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">Import Your SweetSpots</p>
                    <p className="text-xs text-muted-foreground">Import Your SweetSpots</p>
                  </div>
                </div>
              </div>

              {/* URL Input */}
              <div className="bg-card rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste Your URL"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleImport();
                    }}
                    autoFocus
                  />
                  <button
                    onClick={url.trim() ? handleImport : handlePaste}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    Paste
                  </button>
                </div>
                {errorMsg && (
                  <p className="text-xs text-destructive mt-2">{errorMsg}</p>
                )}
              </div>

              {/* Platform Icons */}
              <div className="flex gap-3">
                {platformIcons.map((platform) => (
                  <div
                    key={platform.id}
                    className={cn(
                      "flex-1 bg-card rounded-2xl p-4 flex items-center justify-center shadow-lg",
                      platform.disabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <div className="text-foreground">
                      {platform.icon}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stage: Loading */}
          {stage === "loading" && (
            <div className="bg-card rounded-2xl p-8 shadow-lg flex flex-col items-center gap-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Finding your spot</p>
                <p className="text-xs text-muted-foreground mt-1">This might take a moment</p>
              </div>
            </div>
          )}

          {/* Stage: Found */}
          {stage === "found" && place && (
            <div className="bg-card rounded-2xl shadow-lg overflow-hidden">
              {/* Place Image */}
              {place.photo_url ? (
                <img
                  src={place.photo_url}
                  alt={place.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center">
                  <MapPin className="w-10 h-10 text-muted-foreground/40" />
                </div>
              )}

              <div className="p-5">
                {/* Rating */}
                {place.rating && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Star className="w-5 h-5 text-foreground" />
                    <span className="text-base font-semibold text-foreground">{place.rating}</span>
                  </div>
                )}

                {/* Name */}
                <h3 className="text-xl font-bold text-foreground mb-4">{place.name}</h3>

                {/* Save Button */}
                <button
                  onClick={handleSaveToSweetspots}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors active:scale-[0.98]"
                >
                  Save to Sweetspots
                </button>
              </div>
            </div>
          )}

          {/* Stage: Saved */}
          {stage === "saved" && place && (
            <div className="bg-card rounded-2xl shadow-lg overflow-hidden">
              {/* Success Banner */}
              <div className="bg-primary text-primary-foreground py-3 text-center text-sm font-semibold">
                Your spot has been saved!
              </div>

              {/* Place Image */}
              {place.photo_url ? (
                <img
                  src={place.photo_url}
                  alt={place.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center">
                  <MapPin className="w-10 h-10 text-muted-foreground/40" />
                </div>
              )}

              <div className="p-5">
                {place.rating && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Star className="w-5 h-5 text-foreground" />
                    <span className="text-base font-semibold text-foreground">{place.rating}</span>
                  </div>
                )}

                <h3 className="text-xl font-bold text-foreground mb-5">{place.name}</h3>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      handleClose();
                      onNavigateToTrip?.();
                    }}
                    className="w-full py-3 rounded-xl bg-muted text-foreground font-semibold text-sm hover:bg-muted/80 transition-colors"
                  >
                    Check My trip
                  </button>
                  <button
                    onClick={handleReset}
                    className="w-full py-3 rounded-xl bg-muted text-foreground font-semibold text-sm hover:bg-muted/80 transition-colors"
                  >
                    Stay in Home
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Board Dialog */}
      {showBoardDialog && place && (
        <SaveToBoardDialog
          placeId={place.place_id}
          placeName={place.name}
          onClose={() => setShowBoardDialog(false)}
          onSaved={handleBoardSaved}
        />
      )}
    </>
  );
};

export default ImportActionCard;
