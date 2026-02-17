import { useState } from "react";
import { ArrowRight, MapPin, Navigation } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { OnboardingData } from "@/context/AppContext";
import { usePlaceAutocomplete } from "@/hooks/usePlaceAutocomplete";
import MoodInput from "./MoodInput";

interface EntryScreenProps {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
}

// SweetSpots Logo SVG
const SweetSpotsLogo = () => (
  <svg
    width="64"
    height="48"
    viewBox="0 0 64 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-primary"
  >
    <path
      d="M8 8C8 8 16 8 20 16C24 24 16 32 24 32C32 32 24 16 32 8C40 0 48 16 40 24C32 32 40 40 48 40C56 40 48 24 56 16"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const EntryScreen = ({ onComplete, onSkip }: EntryScreenProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"mood" | "location">("mood");
  const [mood, setMood] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [exploreLocation, setExploreLocation] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { predictions } = usePlaceAutocomplete(showSuggestions ? locationInput : "");

  const handleMoodSubmit = (moodValue: string) => {
    setMood(moodValue);
    setStep("location");
  };

  const handleMoodSkip = () => {
    setMood("");
    setStep("location");
  };

  const handleSelectCity = (description: string) => {
    setLocationInput(description);
    setExploreLocation(description);
    setShowSuggestions(false);
  };

  const handleConfirmCity = () => {
    if (locationInput.trim()) {
      setExploreLocation(locationInput.trim());
      setShowSuggestions(false);
    }
  };

  const handleSelectNearby = () => {
    setExploreLocation("nearby");
    setLocationInput("");
    setShowSuggestions(false);
  };

  const handleLocationInputChange = (value: string) => {
    setLocationInput(value);
    setShowSuggestions(value.trim().length > 0);
    if (!value.trim()) {
      setExploreLocation(null);
    }
  };

  const isLocationConfirmed = exploreLocation && exploreLocation !== "nearby" && exploreLocation === locationInput;

  const handleFinish = async () => {
    const data: OnboardingData = {
      trip_intention: null,
      budget: null,
      travel_personality: [],
      explore_location: exploreLocation || "nearby",
      mood: mood || undefined,
    };

    if (user) {
      setIsSubmitting(true);
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            vibe: { explore_location: data.explore_location, mood: mood },
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error saving profile:', error);
          toast({
            title: 'Error saving preferences',
            description: 'Your preferences will still be used for this session.',
            variant: 'destructive',
          });
        }
      } catch (err) {
        console.error('Error saving profile:', err);
      } finally {
        setIsSubmitting(false);
      }
    }

    onComplete(data);
  };

  const canFinish = exploreLocation !== null;

  // Step 1: Mood input (The Hype Friend)
  if (step === "mood") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="w-full max-w-md flex flex-col items-center gap-8">
          <div className="opacity-0 animate-fade-up">
            <SweetSpotsLogo />
          </div>
          <div className="text-center space-y-2 opacity-0 animate-fade-up delay-200">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Let's find your sweet spot 🍯
            </h1>
            <p className="text-muted-foreground text-base">
              Tell us what you're craving and we'll do the rest
            </p>
          </div>
          <div className="w-full opacity-0 animate-fade-up delay-400">
            <MoodInput onSubmit={handleMoodSubmit} onSkip={handleMoodSkip} />
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Location picker
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-[420px] mx-auto px-6 py-8">
      <div className="mb-12 opacity-0 animate-fade-up">
        <SweetSpotsLogo />
      </div>

      <div className="flex-1 opacity-0 animate-fade-up delay-200">
        <h1 className="text-3xl font-semibold text-foreground mb-2">
          Where should we look? 📍
        </h1>
        <p className="text-muted-foreground mb-6">
          {mood
            ? `We'll find "${mood}" vibes here`
            : "Pick a city or explore nearby"}
        </p>

        <div className="border border-border rounded-2xl p-4 space-y-4">
          {/* City search input */}
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground z-10" />
            <Input
              type="text"
              value={locationInput}
              onChange={(e) => handleLocationInputChange(e.target.value)}
              placeholder="Search city, suburb, or address..."
              className={`pl-12 pr-14 h-16 rounded-2xl text-lg ${
                isLocationConfirmed ? 'border-primary ring-1 ring-primary' : ''
              }`}
              onFocus={() => {
                if (locationInput.trim()) setShowSuggestions(true);
                if (exploreLocation === "nearby") setExploreLocation(null);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {locationInput.trim() && (
              <button
                onClick={handleConfirmCity}
                className={`absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  isLocationConfirmed
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            )}

            {showSuggestions && predictions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden max-h-56 overflow-y-auto">
                {predictions.map((prediction) => (
                  <button
                    key={prediction.place_id}
                    onClick={() => handleSelectCity(prediction.description)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0"
                  >
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground font-medium block truncate">{prediction.main_text}</span>
                      {prediction.secondary_text && (
                        <span className="text-muted-foreground text-xs block truncate">{prediction.secondary_text}</span>
                      )}
                    </div>
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
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
              exploreLocation === "nearby"
                ? 'bg-primary/10 border border-primary'
                : 'hover:bg-muted/50'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              exploreLocation === "nearby" ? 'bg-primary' : 'bg-muted'
            }`}>
              <Navigation className={`w-3 h-3 ${
                exploreLocation === "nearby" ? 'text-primary-foreground' : 'text-muted-foreground'
              }`} />
            </div>
            <div>
              <span className="text-foreground font-medium text-xs block">Nearby places</span>
              <span className="text-muted-foreground text-[10px]">Use my current location</span>
            </div>
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-4 opacity-0 animate-fade-up delay-300">
        {/* Step dots */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-muted" />
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setStep("mood")}
            className="flex-1 h-12 rounded-xl border-border text-primary hover:bg-muted"
          >
            Back
          </Button>
          <Button
            onClick={handleFinish}
            disabled={!canFinish || isSubmitting}
            className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? 'Saving...' : "Let's go"}
          </Button>
        </div>

        <button
          onClick={onSkip}
          disabled={isSubmitting}
          className="w-full text-center text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Skip to home
        </button>
      </div>
    </div>
  );
};

export default EntryScreen;
