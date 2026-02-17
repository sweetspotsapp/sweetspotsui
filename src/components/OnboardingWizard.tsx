import { useState } from "react";
import { ArrowRight, MapPin, Navigation } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { OnboardingData } from "@/context/AppContext";
import { usePlaceAutocomplete } from "@/hooks/usePlaceAutocomplete";

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => void;
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

// Step dot indicator
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
  <div className="flex items-center justify-center gap-2">
    {Array.from({ length: totalSteps }).map((_, idx) => (
      <div
        key={idx}
        className={`w-2.5 h-2.5 rounded-full transition-colors ${
          idx === currentStep ? 'bg-primary' : 'bg-muted'
        }`}
      />
    ))}
  </div>
);

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [moodValue, setMoodValue] = useState("");
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  
  const [data, setData] = useState<OnboardingData>({
    trip_intention: null,
    budget: null,
    travel_personality: [],
    explore_location: null,
  });

  const totalSteps = 2;

  const moodSuggestions = [
    "chill vibes",
    "outdoor",
    "nature",
    "coffee",
    "date night",
    "family friendly",
    "late night",
    "live music",
  ];

  const { predictions, isLoading } = usePlaceAutocomplete(showSuggestions ? locationInput : "");

  const handleSelectCity = (description: string) => {
    setLocationInput(description);
    setData(prev => ({ ...prev, explore_location: description }));
    setShowSuggestions(false);
  };

  const handleConfirmCity = () => {
    if (locationInput.trim()) {
      setData(prev => ({ ...prev, explore_location: locationInput.trim() }));
      setShowSuggestions(false);
    }
  };

  const handleNext = async () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await saveAndComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    const skipData = { ...data, explore_location: "nearby" };
    setData(skipData);
    onComplete(skipData);
  };

  const saveAndComplete = async () => {
    // Build the mood string from user input and selected suggestions
    const parts: string[] = [];
    if (moodValue.trim()) {
      parts.push(moodValue.trim());
    }
    selectedSuggestions.forEach(s => {
      if (!moodValue.toLowerCase().includes(s.toLowerCase())) {
        parts.push(s);
      }
    });
    
    const finalMood = parts.join(", ");
    
    // Create the final data with mood included
    const finalData = { ...data, mood: finalMood || null };

    if (!user) {
      onComplete(finalData);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          vibe: { explore_location: data.explore_location, mood: finalMood },
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
      onComplete(finalData);
    }
  };

  const handleSelectNearby = () => {
    setData(prev => ({ ...prev, explore_location: "nearby" }));
    setLocationInput("");
    setShowSuggestions(false);
  };

  const handleLocationInputChange = (value: string) => {
    setLocationInput(value);
    setShowSuggestions(value.trim().length > 0);
    if (!value.trim()) {
      setData(prev => ({ ...prev, explore_location: null }));
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(suggestion)) {
        newSet.delete(suggestion);
      } else {
        newSet.add(suggestion);
      }
      return newSet;
    });
  };

  const isLocationConfirmed = data.explore_location && data.explore_location !== "nearby" && data.explore_location === locationInput;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <h1 className="text-3xl font-semibold text-foreground mb-2">Where to explore?</h1>
            <p className="text-muted-foreground mb-6">Tell us where you'd like to discover amazing spots</p>
            
            <div className="border border-border rounded-2xl p-4 space-y-4">
              {/* Location input - Main */}
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground z-10" />
                <Input
                  type="text"
                  value={locationInput}
                  onChange={(e) => handleLocationInputChange(e.target.value)}
                  placeholder="Search city, suburb, or address..."
                  className={`pl-12 pr-14 h-16 rounded-2xl text-lg ${
                    isLocationConfirmed
                      ? 'border-primary ring-1 ring-primary'
                      : ''
                  }`}
                  onFocus={() => {
                    if (locationInput.trim()) {
                      setShowSuggestions(true);
                    }
                    if (data.explore_location === "nearby") {
                      setData(prev => ({ ...prev, explore_location: null }));
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding to allow clicking on suggestions
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                />
                {/* Confirm button */}
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
                
                {/* City suggestions dropdown */}
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
              
              {/* Nearby option - Secondary/smaller */}
              <button
                onClick={handleSelectNearby}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                  data.explore_location === "nearby"
                    ? 'bg-primary/10 border border-primary'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  data.explore_location === "nearby" ? 'bg-primary' : 'bg-muted'
                }`}>
                  <Navigation className={`w-3 h-3 ${
                    data.explore_location === "nearby" ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`} />
                </div>
                <div>
                  <span className="text-foreground font-medium text-xs block">Nearby places</span>
                  <span className="text-muted-foreground text-[10px]">Use my current location</span>
                </div>
              </button>
            </div>
          </>
        );

      case 1:
        return (
          <>
            <h1 className="text-3xl font-semibold text-foreground mb-2">What are you in the mood for?</h1>
            <p className="text-muted-foreground mb-6">Just describe what you're feeling, and we'll show you places that match.</p>
            
            <div className="space-y-4">
              {/* Input container with selected tags */}
              <div className="relative border-2 border-border rounded-2xl bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-300">
                {/* Selected vibe tags displayed inside the input area */}
                {selectedSuggestions.size > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-1">
                    {Array.from(selectedSuggestions).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-sm rounded-full bg-primary/15 text-primary font-medium"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleSuggestionClick(tag)}
                          className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-primary/20 transition-colors"
                        >
                          <span className="text-xs leading-none">×</span>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  value={moodValue}
                  onChange={(e) => setMoodValue(e.target.value)}
                  placeholder={selectedSuggestions.size > 0 ? "Add more details..." : "Cheap eats, nice views, fun with friends…"}
                  className={`
                    w-full px-4 text-base bg-transparent text-foreground placeholder:text-muted-foreground
                    focus:outline-none border-none
                    ${selectedSuggestions.size > 0 ? 'pt-2 pb-3' : 'py-4'}
                  `}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {moodSuggestions.map((suggestion) => {
                  const isSelected = selectedSuggestions.has(suggestion);
                  return (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {suggestion}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-[420px] mx-auto px-6 py-8">
      <div className="mb-12">
        <SweetSpotsLogo />
      </div>
      
      <div className="flex-1">
        {renderStepContent()}
      </div>
      
      <div className="mt-8 space-y-4">
        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex-1 h-12 rounded-xl border-border text-primary hover:bg-muted"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={isSubmitting}
            className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? 'Saving...' : 'Next'}
          </Button>
        </div>
        
        <button
          onClick={handleSkip}
          disabled={isSubmitting}
          className="w-full text-center text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Skip to home
        </button>
      </div>
    </div>
  );
};

export default OnboardingWizard;
