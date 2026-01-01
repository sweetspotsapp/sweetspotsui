import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/components/HomePage";
import SavedPage from "@/components/SavedPage";
import ProfilePage from "@/components/ProfilePage";
import EntryScreen from "@/components/EntryScreen";
import LoadingTransition from "@/components/LoadingTransition";
import ProfileSlideMenu from "@/components/ProfileSlideMenu";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/hooks/useAuth";

type AppState = "onboarding" | "loading" | "main";

const Index = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { hasCompletedOnboarding, setUserMood, completeOnboarding } = useApp();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<"home" | "saved" | "profile">("home");
  const [appState, setAppState] = useState<AppState>(
    hasCompletedOnboarding ? "main" : "onboarding"
  );
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

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
    if (tab === "profile") {
      setIsProfileMenuOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show mood input screen
  if (appState === "onboarding") {
    return <EntryScreen onSubmit={handleMoodSubmit} onSkip={handleSkip} />;
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
      
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        isProfileMenuOpen={isProfileMenuOpen}
      />
      
      <ProfileSlideMenu 
        isOpen={isProfileMenuOpen} 
        onClose={() => setIsProfileMenuOpen(false)} 
      />
    </div>
  );
};

export default Index;
