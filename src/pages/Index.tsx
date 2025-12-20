import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/components/HomePage";
import SavedPage from "@/components/SavedPage";
import ProfilePage from "@/components/ProfilePage";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"home" | "saved" | "profile">("home");

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
