import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

// Onboarding data structure
export interface OnboardingData {
  trip_intention: string | null;
  budget: string | null;
  travel_personality: string[];
}

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

// Single-select option row
interface OptionRowProps {
  emoji: string;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

const OptionRow: React.FC<OptionRowProps> = ({ emoji, label, isSelected, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
      isSelected
        ? 'bg-muted/80 border border-border'
        : 'hover:bg-muted/50'
    }`}
  >
    <span className="text-lg">{emoji}</span>
    <span className="text-foreground font-medium">{label}</span>
  </button>
);

// Multi-select checkbox row
interface CheckboxRowProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

const CheckboxRow: React.FC<CheckboxRowProps> = ({ label, isSelected, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-muted/30"
  >
    <div
      className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
        isSelected
          ? 'bg-foreground border-foreground'
          : 'border-muted-foreground/50'
      }`}
    >
      {isSelected && <Check className="w-3 h-3 text-background" strokeWidth={3} />}
    </div>
    <span className="text-foreground font-medium">{label}</span>
  </button>
);

// Fake dropdown selector header
const SelectorHeader = ({ text }: { text: string }) => (
  <div className="flex items-center justify-between px-4 py-3 border border-border rounded-xl mb-4">
    <span className="text-muted-foreground text-sm">{text}</span>
    <ChevronDown className="w-5 h-5 text-muted-foreground" />
  </div>
);

// Step options configuration
const TRIP_INTENTIONS = [
  { emoji: '😌', label: 'Relax & unwind', value: 'relax' },
  { emoji: '🎉', label: 'Have fun with friends', value: 'friends' },
  { emoji: '🌿', label: 'Explore hidden gems', value: 'explore' },
  { emoji: '🏛️', label: 'Learn something cultural', value: 'cultural' },
  { emoji: '📸', label: 'Discover cool spots', value: 'discover' },
];

const BUDGET_OPTIONS = [
  { emoji: '💸', label: 'Under $50', value: 'under50' },
  { emoji: '💵', label: '$50–100', value: '50to100' },
  { emoji: '💳', label: '$100+', value: 'over100' },
];

const TRAVEL_PERSONALITY = [
  { label: 'I like having a plan', value: 'planner' },
  { label: 'I go with the flow', value: 'spontaneous' },
  { label: 'A bit of both', value: 'balanced' },
];

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [data, setData] = useState<OnboardingData>({
    trip_intention: null,
    budget: null,
    travel_personality: [],
  });

  const totalSteps = 3;

  const handleNext = async () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - save to Supabase
      await saveProfile();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      saveProfile();
    }
  };

  const saveProfile = async () => {
    if (!user) {
      onComplete(data);
      return;
    }

    setIsSubmitting(true);
    try {
      const vibeData = {
        trip_intention: data.trip_intention,
        travel_personality: data.travel_personality,
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          vibe: vibeData,
          budget: data.budget,
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

  const togglePersonality = (value: string) => {
    setData(prev => ({
      ...prev,
      travel_personality: prev.travel_personality.includes(value)
        ? prev.travel_personality.filter(v => v !== value)
        : [...prev.travel_personality, value],
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <h1 className="text-3xl font-semibold text-foreground mb-2">Trip intention</h1>
            <p className="text-muted-foreground mb-6">What are you hoping to get out of this trip?</p>
            
            <div className="border border-border rounded-2xl p-4">
              <SelectorHeader text="Pick what matters most right now." />
              
              <div className="space-y-1">
                {TRIP_INTENTIONS.map((option) => (
                  <OptionRow
                    key={option.value}
                    emoji={option.emoji}
                    label={option.label}
                    isSelected={data.trip_intention === option.value}
                    onClick={() => setData(prev => ({ ...prev, trip_intention: option.value }))}
                  />
                ))}
              </div>
            </div>
          </>
        );
      
      case 1:
        return (
          <>
            <h1 className="text-3xl font-semibold text-foreground mb-2">Budget comfort</h1>
            <p className="text-muted-foreground mb-6">What's your budget per person?</p>
            
            <div className="border border-border rounded-2xl p-4">
              <SelectorHeader text="We'll only show places that feel worth it." />
              
              <div className="space-y-1">
                {BUDGET_OPTIONS.map((option) => (
                  <OptionRow
                    key={option.value}
                    emoji={option.emoji}
                    label={option.label}
                    isSelected={data.budget === option.value}
                    onClick={() => setData(prev => ({ ...prev, budget: option.value }))}
                  />
                ))}
              </div>
            </div>
          </>
        );
      
      case 2:
        return (
          <>
            <h1 className="text-3xl font-semibold text-foreground mb-2">Travel personality</h1>
            <p className="text-muted-foreground mb-6">How do you like to travel?</p>
            
            <div className="border border-border rounded-2xl p-4">
              <div className="flex items-center justify-center px-4 py-2 border border-border rounded-xl mb-4">
                <span className="text-muted-foreground text-sm text-center">
                  There's no right answer, we'll adapt to you.
                </span>
              </div>
              
              <div className="space-y-1">
                {TRAVEL_PERSONALITY.map((option) => (
                  <CheckboxRow
                    key={option.value}
                    label={option.label}
                    isSelected={data.travel_personality.includes(option.value)}
                    onClick={() => togglePersonality(option.value)}
                  />
                ))}
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
          Skip onboarding question
        </button>
      </div>
    </div>
  );
};

export default OnboardingWizard;
