import { useState } from "react";
import OnboardingWizard from "./OnboardingWizard";
import type { OnboardingData } from "@/context/AppContext";

interface EntryScreenProps {
  onSubmit: (mood: string) => void;
  onSkip: () => void;
  onOnboardingComplete?: (data: OnboardingData) => void;
}

const EntryScreen = ({ onSubmit, onSkip, onOnboardingComplete }: EntryScreenProps) => {
  const [showMoodInput, setShowMoodInput] = useState(false);

  const handleOnboardingComplete = (data: OnboardingData) => {
    if (onOnboardingComplete) {
      onOnboardingComplete(data);
    }
    // After onboarding wizard, proceed to main app
    onSubmit("");
  };

  return <OnboardingWizard onComplete={handleOnboardingComplete} />;
};

export default EntryScreen;
