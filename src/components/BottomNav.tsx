import { Home, Heart, CalendarDays, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: "home" | "saved" | "trip" | "profile";
  onTabChange: (tab: "home" | "saved" | "trip" | "profile") => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const tabs = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "saved" as const, label: "Saved", icon: Heart },
    { id: "trip" as const, label: "Trip", icon: CalendarDays },
    { id: "profile" as const, label: "Profile", icon: User },
  ];

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom lg:hidden">
        <div className="max-w-md mx-auto flex items-center justify-around py-2 px-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                data-saved-tab={tab.id === "saved" ? "true" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl transition-all duration-200",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon 
                  className={cn(
                    "w-5 h-5 transition-all duration-200",
                    isActive && "scale-110"
                  )} 
                  fill={isActive && tab.id === "saved" ? "currentColor" : "none"}
                />
                <span className={cn(
                  "text-[10px] font-medium",
                  isActive && "font-semibold"
                )}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Top Nav */}
      <nav className="hidden lg:block fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 h-16">
          {/* Logo */}
          <button onClick={() => onTabChange("home")} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <img src="/sweetspots-logo.svg" alt="SweetSpots" className="h-8 w-auto" />
          </button>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  data-saved-tab={tab.id === "saved" ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon 
                    className="w-4 h-4" 
                    fill={isActive && tab.id === "saved" ? "currentColor" : "none"}
                  />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
