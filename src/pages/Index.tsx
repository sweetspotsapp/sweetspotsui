import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/components/HomePage";
import SavedPage from "@/components/SavedPage";
import ProfilePage from "@/components/ProfilePage";
import { AppProvider } from "@/context/AppContext";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"home" | "saved" | "profile">("home");

  return (
    <AppProvider>
      <div className="min-h-screen bg-background">
        {activeTab === "home" && <HomePage />}
        {activeTab === "saved" && <SavedPage />}
        {activeTab === "profile" && <ProfilePage />}
        
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </AppProvider>
  );
};

export default Index;
