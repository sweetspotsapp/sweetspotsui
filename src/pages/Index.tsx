import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/components/HomePage";
import SavedPage from "@/components/SavedPage";
import ProfilePage from "@/components/ProfilePage";
import OnboardingWizard from "@/components/OnboardingWizard";
import LoadingTransition from "@/components/LoadingTransition";
import { useApp, OnboardingData } from "@/context/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type AppState = "onboarding" | "loading" | "main";

const Index = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { hasCompletedOnboarding, setOnboardingData, completeOnboarding } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<"home" | "saved" | "profile">("home");
  const [appState, setAppState] = useState<AppState>(
    hasCompletedOnboarding ? "main" : "onboarding"
  );

  // Sync appState when onboarding status changes
  useEffect(() => {
    if (hasCompletedOnboarding && appState === "onboarding") {
      setAppState("main");
    } else if (!hasCompletedOnboarding && appState === "main") {
      setAppState("onboarding");
    }
  }, [hasCompletedOnboarding, appState]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleOnboardingComplete = (data: OnboardingData) => {
    setOnboardingData(data);
    setAppState("loading");
    
    // Short loading transition
    setTimeout(() => {
      completeOnboarding("", []);
      setAppState("main");
    }, 1000);
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show onboarding wizard
  if (appState === "onboarding") {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  // Show loading transition
  if (appState === "loading") {
    return <LoadingTransition />;
  }

  // Show main app
  return (
    <div className="min-h-screen bg-background">
      {activeTab === "home" && <HomePage />}
      {activeTab === "saved" && <SavedPage />}
      {activeTab === "profile" && <ProfilePage />}
      
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
