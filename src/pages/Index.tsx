import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/components/HomePage";
import SavedPage from "@/components/SavedPage";
import ProfilePage from "@/components/ProfilePage";
import EntryScreen from "@/components/EntryScreen";
import LoadingTransition from "@/components/LoadingTransition";
import { useApp } from "@/context/AppContext";

type AppState = "onboarding" | "loading" | "main";

const Index = () => {
  const { hasCompletedOnboarding, completeOnboarding } = useApp();
  const [activeTab, setActiveTab] = useState<"home" | "saved" | "profile">("home");
  const [appState, setAppState] = useState<AppState>(
    hasCompletedOnboarding ? "main" : "onboarding"
  );

  const handleMoodSubmit = (mood: string) => {
    setAppState("loading");
    
    // Simulate finding places
    setTimeout(() => {
      completeOnboarding(mood);
      setAppState("main");
    }, 2000);
  };

  // Show onboarding screen
  if (appState === "onboarding") {
    return <EntryScreen onSubmit={handleMoodSubmit} />;
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
