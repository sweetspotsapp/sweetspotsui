import { useState } from "react";
import { X, MapPin, Navigation, ArrowRight, Check, Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import { usePlaceAutocomplete } from "@/hooks/usePlaceAutocomplete";

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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { predictions, isLoading } = usePlaceAutocomplete(showSuggestions ? locationInput : "");

  const handleSelectPrediction = (description: string) => {
    setLocationInput(description);
    setShowSuggestions(false);
  };

  const handleConfirmCity = () => {
    if (locationInput.trim()) {
      onSelectLocation(locationInput.trim());
      setLocationInput("");
      setShowSuggestions(false);
      onClose();
    }
  };

  const handleSelectNearby = () => {
    onSelectLocation("nearby");
    setLocationInput("");
    setShowSuggestions(false);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-card rounded-3xl shadow-elevated w-full max-w-[420px] max-h-[80vh] flex flex-col overflow-visible">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Change Location</h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-visible px-6 pb-6 space-y-4">
            {/* Location input */}
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
              <Input
                type="text"
                value={locationInput}
                onChange={(e) => {
                  setLocationInput(e.target.value);
                  setShowSuggestions(e.target.value.trim().length >= 2);
                }}
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
              {showSuggestions && !isLoading && predictions.length === 0 && locationInput.trim().length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-20 p-4 text-center">
                  <p className="text-muted-foreground text-sm">No locations found. Try a different search term.</p>
                </div>
              )}
              {showSuggestions && predictions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto">
                  {predictions.map((prediction) => (
                    <button
                      key={prediction.place_id}
                      onClick={() => handleSelectPrediction(prediction.description)}
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
