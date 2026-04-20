import { useState, useEffect } from "react";
import { ArrowRight, MapPin, Navigation, Loader2, Mail, Lock } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import posthog from "@/lib/posthog";
import type { OnboardingData } from "@/context/AppContext";
import { usePlaceAutocomplete } from "@/hooks/usePlaceAutocomplete";
import MoodInput from "./MoodInput";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().trim().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

interface EntryScreenProps {
  onComplete: (data: OnboardingData) => void;
}

// SweetSpots Logo
const SweetSpotsLogo = ({ size = "md" }: { size?: "md" | "lg" }) => (
  <img src="/sweetspots-logo.svg" alt="SweetSpots" className={size === "lg" ? "h-20 w-auto" : "h-12 w-auto"} />
);

const EntryScreen = ({ onComplete }: EntryScreenProps) => {
  const { user, signInWithGoogle, signUp, signIn } = useAuth();
  // If user is already signed in (e.g. returning from Google OAuth), skip to location
  const [step, setStep] = useState<"welcome" | "location" | "mood">(user ? "location" : "welcome");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authErrors, setAuthErrors] = useState<{ email?: string; password?: string }>({});
  const [mood, setMood] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [exploreLocation, setExploreLocation] = useState<string | null>("nearby");
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
    posthog.capture('onboarding_location_set', { location: exploreLocation || 'nearby' });
    setStep("mood");
  };

  const handleSelectCity = (description: string) => {
    setLocationInput(description);
    setExploreLocation(description);
    setShowSuggestions(false);
  };


  const handleSelectNearby = () => {
    setExploreLocation("nearby");
    setLocationInput("");
    setShowSuggestions(false);
    // Request location permission early so it's ready by the time they search
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 15000, maximumAge: 300000 });
    }
  };

  const handleLocationInputChange = (value: string) => {
    setLocationInput(value);
    setShowSuggestions(value.trim().length > 0);
    if (!value.trim()) {
      setExploreLocation(null);
    }
  };

  // Pre-request geolocation when location step loads with "nearby" selected
  useEffect(() => {
    if (step === "location" && exploreLocation === "nearby" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 15000, maximumAge: 300000 });
    }
  }, [step]);

  const isLocationConfirmed = exploreLocation && exploreLocation !== "nearby" && exploreLocation === locationInput;

  const handleFinishWithMood = async (moodValue: string) => {
    const data: OnboardingData = {
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

    posthog.capture('onboarding_completed', { location: data.explore_location, mood: moodValue || 'skipped' });
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrors({});

    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "email") fieldErrors.email = err.message;
        if (err.path[0] === "password") fieldErrors.password = err.message;
      });
      setAuthErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({ title: "Account exists", description: "This email is already registered. Try signing in instead.", variant: "destructive" });
          } else {
            toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
          }
        } else {
          toast({ title: "Welcome!", description: "Your account has been created." });
          handleAuthSuccess();
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: "Sign in failed", description: "Invalid email or password. Please try again.", variant: "destructive" });
        } else {
          handleAuthSuccess();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canFinish = exploreLocation !== null;

  // Step 0: Welcome / Auth
  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center max-w-[420px] mx-auto px-8 py-12">
        <div className="flex-1 flex flex-col items-center justify-center w-full gap-8">
          {/* Logo */}
          <div className="opacity-0 animate-fade-up">
            <SweetSpotsLogo size="lg" />
          </div>

          {/* Hero copy */}
          <div className="text-center space-y-3 opacity-0 animate-fade-up delay-200">
            <h1 className="text-3xl font-bold text-foreground tracking-tight leading-[1.15]">
              Welcome to SweetSpots
            </h1>
            <p className="text-muted-foreground text-sm max-w-[360px] mx-auto leading-relaxed">
              Save spots you find anywhere, and let AI plan your trip.<br />
              Simple, easy, and better with friends.
            </p>
          </div>

          {/* Auth form */}
          <div className="w-full space-y-4 opacity-0 animate-fade-up delay-500">
            {/* Google */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isSubmitting}
              className="w-full h-11 rounded-xl text-base border-border font-medium"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Email/Password form */}
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 rounded-xl"
                    autoComplete="email"
                  />
                </div>
                {authErrors.email && (
                  <p className="text-xs text-destructive px-1">{authErrors.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-11 rounded-xl"
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                  />
                </div>
                {authErrors.password && (
                  <p className="text-xs text-destructive px-1">{authErrors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-xl text-base font-medium"
                disabled={isSubmitting || isGoogleLoading}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isSignUp ? "Create account" : "Sign in with email"}
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </>
                )}
              </Button>
            </form>

            {/* Toggle sign up / sign in */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setAuthErrors({}); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isSignUp ? (
                  <>Already have an account? <span className="text-primary font-medium">Sign in</span></>
                ) : (
                  <>Don't have an account? <span className="text-primary font-medium">Sign up</span></>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Step dots */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <div className="w-2 h-2 rounded-full bg-border" />
          <div className="w-2 h-2 rounded-full bg-border" />
        </div>

        <button
          onClick={() => setStep("location")}
          className="mt-3 text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip this for now
        </button>
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

      </div>
    </div>
  );
};

export default EntryScreen;
