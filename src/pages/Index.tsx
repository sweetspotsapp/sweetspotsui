import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/components/HomePage";
import DiscoverPage from "@/components/DiscoverPage";
import SavedPage from "@/components/SavedPage";
import TripPage from "@/components/TripPage";
import ProfilePage from "@/components/ProfilePage";
import MapPage from "@/components/MapPage";
import EntryScreen from "@/components/EntryScreen";
import LoadingTransition from "@/components/LoadingTransition";
import ErrorBoundary from "@/components/ErrorBoundary";

import { useApp } from "@/context/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { usePendingInvites } from "@/hooks/usePendingInvites";
import type { OnboardingData } from "@/context/AppContext";
import { SS_RESUME_TRIP } from "@/lib/storageKeys";
import AuthDialog from "@/components/AuthDialog";

type TabType = "home" | "discover" | "saved" | "trip";
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
  } = useApp();
  
  const location = useLocation();
  const { pendingCount, markSeen } = usePendingInvites();
  
  const getInitialTab = (): TabType => {
    const state = location.state as { openTrip?: boolean } | null;
    if (state?.openTrip) return "trip";
    if (location.pathname === "/saved") return "saved";
    if (location.pathname === "/trip") return "trip";
    const params = new URLSearchParams(location.search);
    if (params.get('search')) return "discover";
    return "home";
  };
  
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);
  const [resumeTripId, setResumeTripId] = useState<string | null>(null);
  const [tripTemplate, setTripTemplate] = useState<any>(null);

  useEffect(() => {
    const state = location.state as { openTrip?: boolean } | null;
    if (state?.openTrip) {
      setActiveTab("trip");
      const storedId = sessionStorage.getItem(SS_RESUME_TRIP);
      if (storedId) {
        setResumeTripId(storedId);
        sessionStorage.removeItem(SS_RESUME_TRIP);
      }
      window.history.replaceState({}, '');
    }
    const params = new URLSearchParams(location.search);
    if (params.get('search')) {
      setActiveTab("discover");
    }
  }, [location.state, location.search]);

  useEffect(() => {
    if (activeTab === "trip") markSeen();
  }, [activeTab, markSeen]);

  const [appState, setAppState] = useState<AppState>(
    hasCompletedOnboarding ? "main" : "onboarding"
  );

  useEffect(() => {
    if (hasCompletedOnboarding && appState === "onboarding") setAppState("main");
    else if (!hasCompletedOnboarding && appState === "main") setAppState("onboarding");
  }, [hasCompletedOnboarding, appState]);

  const handleOnboardingComplete = (data: OnboardingData) => {
    setOnboardingData(data);
    if (data.mood) setUserMood(data.mood);
    setAppState("loading");
    setTimeout(() => {
      completeOnboarding(data.mood || "", []);
      setActiveTab(data.mood ? "discover" : "home");
      setAppState("main");
    }, 800);
  };

  const handleMoodSubmit = (mood: string) => {
    setUserMood(mood);
    setAppState("loading");
    setTimeout(() => { completeOnboarding(mood, []); setAppState("main"); }, 1000);
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === "trip") {
      const storedId = sessionStorage.getItem(SS_RESUME_TRIP);
      if (storedId) {
        setResumeTripId(storedId);
        sessionStorage.removeItem(SS_RESUME_TRIP);
      }
    }
    setActiveTab(tab);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (appState === "onboarding") return <EntryScreen onComplete={handleOnboardingComplete} />;
  if (appState === "loading") {
    return <LoadingTransition />;
  }

  return (
    <div className="min-h-screen bg-background lg:pt-16">
      <div style={{ display: activeTab === "home" ? "block" : "none" }}>
        <ErrorBoundary fallbackTitle="Couldn't load Home">
          <HomePage onNavigateToTab={(tab) => handleTabChange(tab as TabType)} onTripTemplate={(template) => { setTripTemplate(template); handleTabChange("trip"); }} />
        </ErrorBoundary>
      </div>
      <div style={{ display: activeTab === "discover" ? "block" : "none" }}>
        <ErrorBoundary fallbackTitle="Couldn't load Discover">
          <DiscoverPage />
        </ErrorBoundary>
      </div>
      <div style={{ display: activeTab === "saved" ? "block" : "none" }}>
        <ErrorBoundary fallbackTitle="Couldn't load your saves">
          <SavedPage />
        </ErrorBoundary>
      </div>
      <div style={{ display: activeTab === "trip" ? "block" : "none" }}>
        <ErrorBoundary fallbackTitle="Trip planner hit a snag">
          <TripPage resumeTripId={resumeTripId} onResumed={() => setResumeTripId(null)} tripTemplate={tripTemplate} onTemplateConsumed={() => setTripTemplate(null)} />
        </ErrorBoundary>
      </div>
      
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tripBadgeCount={pendingCount}
      />
      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        defaultMode="signup"
        title="Sign in to save more spots"
        description="You've saved 3 spots already! Sign in to keep building your collection."
      />
    </div>
  );
};

export default Index;
