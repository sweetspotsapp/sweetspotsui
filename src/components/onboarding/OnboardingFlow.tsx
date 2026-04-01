import { useState } from "react";
import WelcomeScreen from "./WelcomeScreen";
import AuthScreen from "./AuthScreen";
import TutorialScreen from "./TutorialScreen";

type Step = "welcome" | "auth" | "tutorial";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState<Step>("welcome");

  const finish = () => {
    localStorage.setItem("sweetspots_onboarding_done", "true");
    onComplete();
  };

  if (step === "welcome") {
    return <WelcomeScreen onGetStarted={() => setStep("auth")} />;
  }

  if (step === "auth") {
    return (
      <AuthScreen
        onSuccess={() => setStep("tutorial")}
        onSkip={() => setStep("tutorial")}
      />
    );
  }

  return <TutorialScreen onFinish={finish} />;
};

export default OnboardingFlow;
