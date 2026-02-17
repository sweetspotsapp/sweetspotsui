import { useState, useEffect, useRef } from "react";
import { X, MapPin, Navigation, ArrowRight, Check, Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";

interface Prediction {
  description: string;
  place_id: string;
  main_text: string;
  secondary_text: string;
}

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: string) => void;
  currentLocation?: string | null;
}

const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  currentLocation,
}) => {
  const [locationInput, setLocationInput] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autocomplete fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (locationInput.trim().length < 2) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("place-autocomplete", {
          body: { input: locationInput.trim() },
        });
        if (!error && data?.predictions) {
          setPredictions(data.predictions);
        }
      } catch (e) {
        console.error("Autocomplete error:", e);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [locationInput]);

  const handleSelectPrediction = (prediction: Prediction) => {
    setLocationInput(prediction.description);
    setPredictions([]);
  };

  const handleConfirmCity = () => {
    if (locationInput.trim()) {
      onSelectLocation(locationInput.trim());
      setLocationInput("");
      setPredictions([]);
      onClose();
    }
  };

  const handleSelectNearby = () => {
    onSelectLocation("nearby");
    setLocationInput("");
    setPredictions([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-w-[420px] mx-auto animate-fade-up pb-20">
        <div className="bg-card rounded-t-3xl shadow-elevated max-h-[70vh] overflow-hidden flex flex-col">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-6 pt-2 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Change Location</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Search for a city, suburb, or address
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
            {/* Location input */}
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
              <Input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="Search city, suburb, or address..."
                className="pl-12 pr-14 h-14 rounded-2xl text-base"
                autoFocus
              />
              
              {/* Confirm / Loading button */}
              {locationInput.trim() && (
                <button
                  onClick={handleConfirmCity}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-colors bg-primary text-primary-foreground"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                </button>
              )}

              {/* Autocomplete suggestions */}
              {predictions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto">
                  {predictions.map((prediction) => (
                    <button
                      key={prediction.place_id}
                      onClick={() => handleSelectPrediction(prediction)}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left first:rounded-t-xl last:rounded-b-xl"
                    >
                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="text-foreground text-sm font-medium block truncate">
                          {prediction.main_text}
                        </span>
                        {prediction.secondary_text && (
                          <span className="text-muted-foreground text-xs block truncate">
                            {prediction.secondary_text}
                          </span>
                        )}
                      </div>
                      {currentLocation === prediction.description && (
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted-foreground text-sm">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Nearby option */}
            <button
              onClick={handleSelectNearby}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                currentLocation === "nearby"
                  ? 'bg-primary/10 border border-primary'
                  : 'bg-muted/30 hover:bg-muted/50'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentLocation === "nearby" ? 'bg-primary' : 'bg-muted'
              }`}>
                <Navigation className={`w-5 h-5 ${
                  currentLocation === "nearby" ? 'text-primary-foreground' : 'text-muted-foreground'
                }`} />
              </div>
              <div className="flex-1">
                <span className="text-foreground font-medium block">Nearby places</span>
                <span className="text-muted-foreground text-sm">Use my current location</span>
              </div>
              {currentLocation === "nearby" && (
                <Check className="w-5 h-5 text-primary" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LocationPickerModal;
