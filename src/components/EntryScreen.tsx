import { useState } from "react";
import { ArrowRight, MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { OnboardingData } from "@/context/AppContext";
import { usePlaceAutocomplete } from "@/hooks/usePlaceAutocomplete";
import MoodInput from "./MoodInput";
import AuthDialog from "./AuthDialog";

interface EntryScreenProps {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
}

// SweetSpots Logo
const SweetSpotsLogo = () => (
  <img src="/sweetspots-logo.svg" alt="SweetSpots" className="h-12 w-auto" />
);

const EntryScreen = ({ onComplete, onSkip }: EntryScreenProps) => {
  const { user, signInWithGoogle } = useAuth();
  const [step, setStep] = useState<"welcome" | "location" | "mood">("welcome");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [mood, setMood] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [exploreLocation, setExploreLocation] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { predictions, isLoading } = usePlaceAutocomplete(showSuggestions ? locationInput : "");

  const handleMoodSubmit = (moodValue: string) => {
    setMood(moodValue);
    handleFinishWithMood(moodValue);
  };

  const handleMoodSkip = () => {
    setMood("");
    handleFinishWithMood("");
  };

  const handleLocationNext = () => {
    setStep("mood");
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

  const handleFinishWithMood = async (moodValue: string) => {
    const data: OnboardingData = {
      trip_intention: null,
      budget: null,
      travel_personality: [],
      explore_location: exploreLocation || "nearby",
      mood: moodValue || undefined,
    };

    if (user) {
      setIsSubmitting(true);
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            vibe: { explore_location: data.explore_location, mood: moodValue },
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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: "Google sign in failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setStep("location");
  };

  const canFinish = exploreLocation !== null;

  // Step 0: Welcome / Introduction
  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center max-w-[420px] mx-auto px-8 py-12">
        <div className="flex-1 flex flex-col items-center justify-center w-full gap-12">
          {/* Logo */}
          <div className="opacity-0 animate-fade-up">
            <SweetSpotsLogo />
          </div>

          {/* Hero copy — aspirational, identity-driven */}
          <div className="text-center space-y-4 opacity-0 animate-fade-up delay-200">
            <h1 className="text-4xl font-bold text-foreground tracking-tight leading-[1.15]">
              The places you love<br />
              are already waiting.
            </h1>
            <p className="text-muted-foreground text-base max-w-[280px] mx-auto leading-relaxed">
              Tell us who you are. We'll show you where you belong.
            </p>
          </div>

          {/* Testimonials */}
          <div className="w-full space-y-2.5 opacity-0 animate-fade-up delay-300">
            {[
              { quote: "Found the best hidden café in Bali in 2 mins 🤯", name: "Sarah K." },
              { quote: "Planned my whole Tokyo trip from saved spots. Game changer.", name: "Marcus L." },
              { quote: "It actually gets my vibe. Way better than Google Maps.", name: "Priya D." },
            ].map((t) => (
              <div key={t.name} className="flex items-start gap-2.5 px-3 py-2 rounded-xl bg-muted/40">
                <span className="text-xs leading-relaxed text-muted-foreground flex-1">
                  "{t.quote}" — <span className="font-medium text-foreground">{t.name}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Auth actions */}
          <div className="w-full space-y-3 opacity-0 animate-fade-up delay-500">
            <Button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full h-13 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-base font-medium"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowAuthDialog(true)}
              className="w-full h-13 rounded-xl text-base border-border font-medium"
            >
              Sign in with email
            </Button>

            <button
              onClick={() => setStep("location")}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors pt-3"
            >
              Continue as guest
            </button>
          </div>
        </div>

        {/* Step dots */}
        <div className="mt-10 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <div className="w-2 h-2 rounded-full bg-border" />
          <div className="w-2 h-2 rounded-full bg-border" />
        </div>

        <button
          onClick={onSkip}
          className="mt-4 text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip
        </button>

        <AuthDialog
          open={showAuthDialog}
          onOpenChange={setShowAuthDialog}
          onSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  // Step 1: Mood input
  if (step === "mood") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="w-full max-w-md flex flex-col items-center gap-8">
          <div>
            <SweetSpotsLogo />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              What are you in the mood for?
            </h1>
            <p className="text-muted-foreground text-base">
              Tell us whatever you feel right now. We'll find places that match your vibe.
            </p>
          </div>
          <div className="w-full">
            <MoodInput onSubmit={handleMoodSubmit} onSkip={handleMoodSkip} onBack={() => setStep("location")} />
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="w-2 h-2 rounded-full bg-border" />
            <div className="w-2 h-2 rounded-full bg-border" />
            <div className="w-2 h-2 rounded-full bg-primary" />
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Location picker
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-[420px] mx-auto px-6 py-8">
      <div className="mb-12">
        <SweetSpotsLogo />
      </div>

      <div className="flex-1">
        <h1 className="text-3xl font-semibold text-foreground mb-2">
          Where should we look?
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
                onClick={isLocationConfirmed ? handleLocationNext : handleConfirmCity}
                className={`absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  isLocationConfirmed
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            )}

            {showSuggestions && !isLoading && predictions.length === 0 && locationInput.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 p-4 text-center">
                <p className="text-muted-foreground text-sm">No locations found. Try a different search term.</p>
              </div>
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

      <div className="mt-8 space-y-4">
        {/* Step dots */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-muted" />
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <div className="w-2.5 h-2.5 rounded-full bg-muted" />
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setStep("welcome")}
            className="h-12 px-6 rounded-xl"
          >
            Back
          </Button>
          <Button
            onClick={handleLocationNext}
            disabled={!canFinish}
            className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Next
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
