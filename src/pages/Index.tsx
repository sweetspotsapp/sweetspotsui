import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import SavedPage from "@/components/SavedPage";
import TripPage from "@/components/TripPage";
import ProfilePage from "@/components/ProfilePage";
import EntryScreen from "@/components/EntryScreen";
import LoadingTransition from "@/components/LoadingTransition";

import { useApp } from "@/context/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { usePendingInvites } from "@/hooks/usePendingInvites";
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
  const { pendingCount, markSeen } = usePendingInvites();
  
  const getInitialTab = (): "spots" | "trip" | "profile" => {
    const state = location.state as { openTrip?: boolean } | null;
    if (state?.openTrip) return "trip";
    if (location.pathname === "/saved") return "spots";
    if (location.pathname === "/trip") return "trip";
    return "spots";
  };
  
  const [activeTab, setActiveTab] = useState<"spots" | "trip" | "profile">(getInitialTab);
  const [resumeTripId, setResumeTripId] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { openTrip?: boolean } | null;
    if (state?.openTrip) {
      setActiveTab("trip");
      const storedId = sessionStorage.getItem('sweetspots_resume_trip');
      if (storedId) {
        setResumeTripId(storedId);
        sessionStorage.removeItem('sweetspots_resume_trip');
      }
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Mark invites as seen when user visits trip tab
  useEffect(() => {
    if (activeTab === "trip") {
      markSeen();
    }
  }, [activeTab, markSeen]);

  const [appState, setAppState] = useState<AppState>(
    hasCompletedOnboarding ? "main" : "onboarding"
  );

  useEffect(() => {
    if (hasCompletedOnboarding && appState === "onboarding") {
      setAppState("main");
    } else if (!hasCompletedOnboarding && appState === "main") {
      setAppState("onboarding");
    }
  }, [hasCompletedOnboarding, appState]);

  const handleOnboardingComplete = (data: OnboardingData) => {
    setOnboardingData(data);
    if (data.mood) {
      setUserMood(data.mood);
    }
    setAppState("loading");
    
    setTimeout(() => {
      completeOnboarding(data.mood || "", []);
      setAppState("main");
    }, 800);
  };

  const handleSkip = () => {
    sessionStorage.setItem('sweetspots_skip_mode', 'true');
    setAppState("loading");
    
    setTimeout(() => {
      completeOnboarding("", []);
      setAppState("main");
    }, 800);
  };

  const handleTabChange = (tab: "spots" | "trip" | "profile") => {
    setActiveTab(tab);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (appState === "onboarding") {
    return <EntryScreen onComplete={handleOnboardingComplete} onSkip={handleSkip} />;
  }

  if (appState === "loading") {
    const isSkipMode = sessionStorage.getItem('sweetspots_skip_mode') === 'true';
    return <LoadingTransition isSkipMode={isSkipMode} />;
  }

  return (
    <div className="min-h-screen bg-background lg:pt-16">
      <div style={{ display: activeTab === "spots" ? "block" : "none" }}>
        <SavedPage onNavigateToProfile={() => setActiveTab("profile")} />
      </div>
      <div style={{ display: activeTab === "trip" ? "block" : "none" }}>
        <TripPage resumeTripId={resumeTripId} onResumed={() => setResumeTripId(null)} />
      </div>
      <div style={{ display: activeTab === "profile" ? "block" : "none" }}>
        <ProfilePage onNavigateToSaved={() => setActiveTab("spots")} />
      </div>
      
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        tripBadgeCount={pendingCount}
      />
    </div>
  );
};

export default Index;
