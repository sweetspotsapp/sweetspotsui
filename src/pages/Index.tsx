import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/components/HomePage";
import SavedPage from "@/components/SavedPage";
import ProfilePage from "@/components/ProfilePage";
import EntryScreen from "@/components/EntryScreen";
import LoadingTransition from "@/components/LoadingTransition";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { useSearch } from "@/hooks/useSearch";
import { useToast } from "@/hooks/use-toast";

type AppState = "onboarding" | "loading" | "main";

const Index = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { hasCompletedOnboarding, completeOnboarding, travelMode } = useApp();
  const { search, isSearching, error: searchError } = useSearch();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<"home" | "saved" | "profile">("home");
  const [appState, setAppState] = useState<AppState>(
    hasCompletedOnboarding ? "main" : "onboarding"
  );

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Show search error
  useEffect(() => {
    if (searchError) {
      toast({
        title: "Search failed",
        description: searchError,
        variant: "destructive",
      });
    }
  }, [searchError, toast]);

  const handleMoodSubmit = async (mood: string) => {
    setAppState("loading");
    
    const result = await search(mood, travelMode);
    
    if (result && result.places.length > 0) {
      completeOnboarding(mood, result.places);
      setAppState("main");
    } else if (result && result.places.length === 0) {
      toast({
        title: "No places found",
        description: "Try a different search or expand your area.",
      });
      setAppState("onboarding");
    } else {
      // Error occurred, handled by useEffect above
      setAppState("onboarding");
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

  // Show onboarding screen
  if (appState === "onboarding") {
    return <EntryScreen onSubmit={handleMoodSubmit} />;
  }

  // Show loading transition
  if (appState === "loading" || isSearching) {
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
