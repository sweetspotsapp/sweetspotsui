import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/components/HomePage";
import SavedPage from "@/components/SavedPage";
import TripPage from "@/components/TripPage";
import ProfilePage from "@/components/ProfilePage";
import ImportActionCard from "@/components/ImportActionCard";

import { useAuth } from "@/hooks/useAuth";
import { usePendingInvites } from "@/hooks/usePendingInvites";

const Index = () => {
  const { user, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const { pendingCount, markSeen } = usePendingInvites();
  
  const getInitialTab = (): "home" | "saved" | "trip" | "profile" => {
    const state = location.state as { openTrip?: boolean } | null;
    if (state?.openTrip) return "trip";
    if (location.pathname === "/saved") return "saved";
    if (location.pathname === "/trip") return "trip";
    return "home";
  };
  
  const [activeTab, setActiveTab] = useState<"home" | "saved" | "trip" | "profile">(getInitialTab);
  const [resumeTripId, setResumeTripId] = useState<string | null>(null);
  const [showImportCard, setShowImportCard] = useState(false);

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

  useEffect(() => {
    if (activeTab === "trip") {
      markSeen();
    }
  }, [activeTab, markSeen]);

  const handleTabChange = (tab: "home" | "saved" | "trip" | "profile") => {
    setActiveTab(tab);
  };

  const handleNavigateToTripFromHome = (tripId?: string) => {
    if (tripId) {
      setResumeTripId(tripId);
    }
    setActiveTab("trip");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:pt-16">
      <div style={{ display: activeTab === "home" ? "block" : "none" }}>
        <HomePage 
          onNavigateToTrip={handleNavigateToTripFromHome}
          onNavigateToSpots={() => setActiveTab("saved")}
        />
      </div>
      <div style={{ display: activeTab === "saved" ? "block" : "none" }}>
        <SavedPage onNavigateToProfile={() => setActiveTab("profile")} />
      </div>
      <div style={{ display: activeTab === "trip" ? "block" : "none" }}>
        <TripPage resumeTripId={resumeTripId} onResumed={() => setResumeTripId(null)} />
      </div>
      <div style={{ display: activeTab === "profile" ? "block" : "none" }}>
        <ProfilePage onNavigateToSaved={() => setActiveTab("saved")} />
      </div>
      
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        onPlusPress={() => setShowImportCard(true)}
        tripBadgeCount={pendingCount}
        showPlusButton={activeTab === "home"}
      />

      <ImportActionCard
        open={showImportCard}
        onClose={() => setShowImportCard(false)}
        onNavigateToTrip={() => {
          setShowImportCard(false);
          setActiveTab("trip");
        }}
      />
    </div>
  );
};

export default Index;
