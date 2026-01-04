import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/components/HomePage";
import SavedPage from "@/components/SavedPage";
import ProfilePage from "@/components/ProfilePage";
import EntryScreen from "@/components/EntryScreen";
import LoadingTransition from "@/components/LoadingTransition";
import AuthDialog from "@/components/AuthDialog";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/hooks/useAuth";
import type { OnboardingData } from "@/context/AppContext";

type AppState = "onboarding" | "loading" | "main";

const Index = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { 
    hasCompletedOnboarding, 
    setUserMood, 
    completeOnboarding,
    setOnboardingData,
    showAuthDialog,
    setShowAuthDialog,
    pendingSavePlaceId,
    toggleSave
  } = useApp();
  
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

  // Handle auth success - complete pending save if any
  const handleAuthSuccess = async () => {
    if (pendingSavePlaceId) {
      // Small delay to ensure auth state is fully updated
      setTimeout(() => {
        toggleSave(pendingSavePlaceId);
      }, 100);
    }
  };

  const handleOnboardingComplete = (data: OnboardingData) => {
    setOnboardingData(data);
    setAppState("loading");
    
    // Short loading transition
    setTimeout(() => {
      completeOnboarding("", []);
      setAppState("main");
    }, 800);
  };

  const handleMoodSubmit = (mood: string) => {
    setUserMood(mood);
    setAppState("loading");
    
    // Short loading transition
    setTimeout(() => {
      completeOnboarding(mood, []);
      setAppState("main");
    }, 1000);
  };

  const handleSkip = () => {
    // Set skip mode flag for HomePage to detect
    sessionStorage.setItem('sweetspots_skip_mode', 'true');
    setAppState("loading");
    
    setTimeout(() => {
      completeOnboarding("", []);
      setAppState("main");
    }, 800);
  };

  const handleTabChange = (tab: "home" | "saved" | "profile") => {
    setActiveTab(tab);
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
    return <EntryScreen onSubmit={handleMoodSubmit} onSkip={handleSkip} onOnboardingComplete={handleOnboardingComplete} />;
  }

  // Show loading transition
  if (appState === "loading") {
    const isSkipMode = sessionStorage.getItem('sweetspots_skip_mode') === 'true';
    return <LoadingTransition isSkipMode={isSkipMode} />;
  }

  // Show main app
  return (
    <div className="min-h-screen bg-background">
      {activeTab === "home" && <HomePage />}
      {activeTab === "saved" && <SavedPage />}
      {activeTab === "profile" && <ProfilePage />}
      
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
      />
      
      {/* Auth dialog for saving without login */}
      <AuthDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default Index;
