import { useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import type { OnboardingData } from "@/context/AppContext";

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
  const [moodValue, setMoodValue] = useState("");
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  
  const [data, setData] = useState<OnboardingData>({
    trip_intention: null,
    budget: null,
    travel_personality: [],
    explore_location: null,
  });

  const totalSteps = 2; // Just location + mood prompt

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

  const handleNext = async () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - save and complete
      await saveAndComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    // When skipping, default to nearby places
    const skipData = { ...data, explore_location: "nearby" };
    setData(skipData);
    onComplete(skipData);
  };

  const saveAndComplete = async () => {
    // Combine mood input with selected suggestions
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
    const finalData = { ...data, mood: finalMood };

    if (!user) {
      onComplete(data);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          vibe: { explore_location: data.explore_location },
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
      onComplete(data);
    }
  };

  const handleSelectNearby = () => {
    setData(prev => ({ ...prev, explore_location: "nearby" }));
    setLocationInput("");
  };

  const handleLocationInputChange = (value: string) => {
    setLocationInput(value);
    if (value.trim()) {
      setData(prev => ({ ...prev, explore_location: value.trim() }));
    } else {
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

  const hasMoodInput = moodValue.trim() || selectedSuggestions.size > 0;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <h1 className="text-3xl font-semibold text-foreground mb-2">Where to explore?</h1>
            <p className="text-muted-foreground mb-6">Tell us where you'd like to discover amazing spots</p>
            
            <div className="border border-border rounded-2xl p-4 space-y-4">
              {/* Nearby option */}
              <button
                onClick={handleSelectNearby}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl text-left transition-all ${
                  data.explore_location === "nearby"
                    ? 'bg-primary/10 border-2 border-primary'
                    : 'bg-muted/50 hover:bg-muted/80 border border-border'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  data.explore_location === "nearby" ? 'bg-primary' : 'bg-muted'
                }`}>
                  <Navigation className={`w-5 h-5 ${
                    data.explore_location === "nearby" ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`} />
                </div>
                <div>
                  <span className="text-foreground font-medium block">Nearby places</span>
                  <span className="text-muted-foreground text-sm">Use my current location</span>
                </div>
              </button>
              
              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-muted-foreground text-sm">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              
              {/* Location input */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={locationInput}
                  onChange={(e) => handleLocationInputChange(e.target.value)}
                  placeholder="Enter a city or area (e.g., Tokyo, Bali)"
                  className={`pl-10 h-12 rounded-xl ${
                    data.explore_location && data.explore_location !== "nearby"
                      ? 'border-primary ring-1 ring-primary'
                      : ''
                  }`}
                  onFocus={() => {
                    if (data.explore_location === "nearby") {
                      setData(prev => ({ ...prev, explore_location: null }));
                    }
                  }}
                />
              </div>
            </div>
          </>
        );

      case 1:
        return (
          <>
            <h1 className="text-3xl font-semibold text-foreground mb-2">What are you in the mood for?</h1>
            <p className="text-muted-foreground mb-6">Just describe what you're feeling, and we'll show you places that match.</p>
            
            <div className="space-y-4">
              <input
                type="text"
                value={moodValue}
                onChange={(e) => setMoodValue(e.target.value)}
                placeholder="Cheap eats, nice views, fun with friends…"
                className="
                  w-full px-4 py-4 text-base rounded-2xl border-2 border-border 
                  bg-card text-foreground placeholder:text-muted-foreground
                  focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10
                  transition-all duration-300
                "
              />

              {/* Suggestion chips */}
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
      {/* Logo */}
      <div className="mb-12">
        <SweetSpotsLogo />
      </div>
      
      {/* Step Content */}
      <div className="flex-1">
        {renderStepContent()}
      </div>
      
      {/* Bottom Section */}
      <div className="mt-8 space-y-4">
        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
        
        {/* Navigation Buttons */}
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
        
        {/* Skip Link */}
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
