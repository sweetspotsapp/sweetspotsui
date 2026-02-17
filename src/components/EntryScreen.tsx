import { useState } from "react";
import MoodInput from "./MoodInput";
import OnboardingWizard from "./OnboardingWizard";
import type { OnboardingData } from "@/context/AppContext";

interface EntryScreenProps {
  onSubmit: (mood: string) => void;
  onSkip: () => void;
  onOnboardingComplete?: (data: OnboardingData) => void;
}

const EntryScreen = ({ onSubmit, onSkip, onOnboardingComplete }: EntryScreenProps) => {
  const [moodCollected, setMoodCollected] = useState(false);

  const handleMoodSubmit = (mood: string) => {
    setMoodCollected(true);
  };

  const handleSkip = () => {
    setMoodCollected(true);
  };

  const handleOnboardingComplete = (data: OnboardingData) => {
    if (onOnboardingComplete) {
      onOnboardingComplete(data);
    }
    onSubmit("");
  };

  if (moodCollected) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="opacity-0 animate-fade-up">
          <img
            src="/sweetspots-logo.svg"
            alt="SweetSpots"
            className="h-10"
          />
        </div>

        {/* Headline */}
        <div className="text-center space-y-2 opacity-0 animate-fade-up delay-200">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Let's find your sweet spot 🍯
          </h1>
          <p className="text-muted-foreground text-base">
            Tell us what you're craving and we'll do the rest
          </p>
        </div>

        {/* Mood Input */}
        <div className="w-full opacity-0 animate-fade-up delay-400">
          <MoodInput onSubmit={handleMoodSubmit} onSkip={handleSkip} />
        </div>
      </div>
    </div>
  );
};

export default EntryScreen;
