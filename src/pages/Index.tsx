import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/components/HomePage";
import SavedPage from "@/components/SavedPage";
import ItineraryPage from "@/components/ItineraryPage";
import ProfilePage from "@/components/ProfilePage";
import EntryScreen from "@/components/EntryScreen";
import LoadingTransition from "@/components/LoadingTransition";


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
  } = useApp();
  
  const location = useLocation();
  
  // Determine initial tab from route
  const getInitialTab = (): "home" | "saved" | "itinerary" | "profile" => {
    const state = location.state as { openItinerary?: boolean } | null;
    if (state?.openItinerary) return "itinerary";
    if (location.pathname === "/saved") return "saved";
    // If arriving with a search param, force home tab
    const params = new URLSearchParams(location.search);
    if (params.get('search')) return "home";
    return "home";
  };
  
  const [activeTab, setActiveTab] = useState<"home" | "saved" | "itinerary" | "profile">(getInitialTab);
  const [resumeItineraryId, setResumeItineraryId] = useState<string | null>(null);

  // Handle navigation state changes (e.g. returning from place details to itinerary)
  useEffect(() => {
    const state = location.state as { openItinerary?: boolean } | null;
    if (state?.openItinerary) {
      setActiveTab("itinerary");
      const storedId = sessionStorage.getItem('sweetspots_resume_itinerary');
      if (storedId) {
        setResumeItineraryId(storedId);
        sessionStorage.removeItem('sweetspots_resume_itinerary');
      }
      window.history.replaceState({}, '');
    }
    // Switch to home tab when arriving with search param
    const params = new URLSearchParams(location.search);
    if (params.get('search')) {
      setActiveTab("home");
    }
  }, [location.state, location.search]);
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


  const handleOnboardingComplete = (data: OnboardingData) => {
    setOnboardingData(data);
    // Set the user mood from onboarding data if available
    if (data.mood) {
      setUserMood(data.mood);
    }
    setAppState("loading");
    
    // Short loading transition
    setTimeout(() => {
      completeOnboarding(data.mood || "", []);
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

  const handleTabChange = (tab: "home" | "saved" | "itinerary" | "profile") => {
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
    return <EntryScreen onComplete={handleOnboardingComplete} onSkip={handleSkip} />;
  }

  // Show loading transition
  if (appState === "loading") {
    const isSkipMode = sessionStorage.getItem('sweetspots_skip_mode') === 'true';
    return <LoadingTransition isSkipMode={isSkipMode} />;
  }

  // Show main app
  return (
    <div className="min-h-screen bg-background lg:pt-16">
      {activeTab === "home" && <HomePage onNavigateToProfile={() => setActiveTab("profile")} />}
      {activeTab === "saved" && <SavedPage onNavigateToProfile={() => setActiveTab("profile")} />}
      {activeTab === "itinerary" && <ItineraryPage resumeItineraryId={resumeItineraryId} onResumed={() => setResumeItineraryId(null)} />}
      {activeTab === "profile" && <ProfilePage onNavigateToSaved={() => setActiveTab("saved")} />}
      
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
      />
    </div>
  );
};

export default Index;
