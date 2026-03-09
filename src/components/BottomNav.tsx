import { Home, Heart, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface BottomNavProps {
  activeTab: "home" | "saved" | "trip" | "profile";
  onTabChange: (tab: "home" | "saved" | "trip" | "profile") => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const { user } = useAuth();

  const tabs = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "saved" as const, label: "Saved", icon: Heart },
    { id: "trip" as const, label: "Trip", icon: CalendarDays },
    { id: "profile" as const, label: "Profile", icon: null },
  ];

  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = (user?.email?.[0] || "U").toUpperCase();

  return (
    <>
      {/* Mobile Floating Pill Nav */}
      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 lg:hidden">
        <div className="flex items-center gap-5 px-6 py-3 rounded-full bg-foreground/90 backdrop-blur-md shadow-lg shadow-foreground/10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isProfile = tab.id === "profile";

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                data-saved-tab={tab.id === "saved" ? "true" : undefined}
                className={cn(
                  "relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200",
                  isActive
                    ? "bg-background"
                    : "bg-transparent"
                )}
              >
                {isProfile ? (
                  <Avatar className={cn(
                    "w-6 h-6",
                    isActive && "ring-2 ring-primary"
                  )}>
                    {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
                    <AvatarFallback className="text-[10px] font-semibold bg-muted text-muted-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                ) : Icon ? (
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-colors duration-200",
                      isActive
                        ? "text-primary"
                        : "text-background/70"
                    )}
                    fill={isActive && tab.id === "saved" ? "currentColor" : "none"}
                  />
                ) : null}
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
                  {Icon ? (
                    <Icon 
                      className="w-4 h-4" 
                      fill={isActive && tab.id === "saved" ? "currentColor" : "none"}
                    />
                  ) : (
                    <Avatar className="w-5 h-5">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
                      <AvatarFallback className="text-[8px] font-semibold bg-muted text-muted-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  )}
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
