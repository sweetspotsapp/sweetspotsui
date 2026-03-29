import { Home, Heart, CalendarDays, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface BottomNavProps {
  activeTab: "home" | "saved" | "trip" | "profile";
  onTabChange: (tab: "home" | "saved" | "trip" | "profile") => void;
  onPlusPress?: () => void;
  tripBadgeCount?: number;
  showPlusButton?: boolean;
}

const BottomNav = ({ activeTab, onTabChange, onPlusPress, tripBadgeCount = 0, showPlusButton = true }: BottomNavProps) => {
  const { user } = useAuth();

  const tabs = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "saved" as const, label: "Save", icon: Heart },
    { id: "trip" as const, label: "Trip", icon: CalendarDays },
    { id: "profile" as const, label: "Profile", icon: null },
  ];

  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = (user?.email?.[0] || "U").toUpperCase();

  return (
    <>
      {/* Mobile Floating Pill Nav */}
      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 lg:hidden">
        {/* Plus Button - centered above the pill, only on Home */}
        {showPlusButton && (
          <button
            onClick={onPlusPress}
            className="absolute -top-14 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-foreground/90 backdrop-blur-md shadow-lg shadow-foreground/10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isProfile = tab.id === "profile";
            const showBadge = tab.id === "trip" && tripBadgeCount > 0;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200",
                  isActive ? "bg-background" : "bg-transparent"
                )}
              >
                {isProfile ? (
                  <Avatar className={cn("w-6 h-6", isActive && "ring-2 ring-primary")}>
                    {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
                    <AvatarFallback className="text-[10px] font-semibold bg-muted text-muted-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                ) : Icon ? (
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-colors duration-200",
                      isActive ? "text-primary" : "text-background/70"
                    )}
                  />
                ) : null}
                {showBadge && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                    {tripBadgeCount > 9 ? "9+" : tripBadgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Top Nav */}
      <nav className="hidden lg:block fixed top-0 left-0 right-0 z-50 bg-card shadow-soft">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 h-16">
          <button onClick={() => onTabChange("home")} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <img src="/sweetspots-logo.svg" alt="SweetSpots" className="h-8 w-auto" />
          </button>

          <div className="flex items-center gap-1">
            {/* Plus button for desktop - only on Home */}
            {showPlusButton && (
              <button
                onClick={onPlusPress}
                className="mr-2 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}

            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const showBadge = tab.id === "trip" && tripBadgeCount > 0;

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {Icon ? (
                    <Icon className="w-4 h-4" />
                  ) : (
                    <Avatar className="w-5 h-5">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
                      <AvatarFallback className="text-[8px] font-semibold bg-muted text-muted-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {tab.label}
                  {showBadge && (
                    <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
                      {tripBadgeCount > 9 ? "9+" : tripBadgeCount}
                    </span>
                  )}
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
