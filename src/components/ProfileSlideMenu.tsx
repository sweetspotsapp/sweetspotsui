import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { useProfileInfo } from "@/hooks/useProfileInfo";
import { 
  User, 
  Settings, 
  Sun, 
  Moon, 
  Crown, 
  HelpCircle, 
  LogOut,
  X,
  ChevronRight
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProfileSlideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToProfile?: () => void;
}

const ProfileSlideMenu = ({ isOpen, onClose, onNavigateToProfile }: ProfileSlideMenuProps) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { avatarUrl, username } = useProfileInfo();

  const handleLogout = async () => {
    await signOut();
    onClose();
    navigate("/auth");
  };

  const handleViewProfile = () => {
    onClose();
    if (onNavigateToProfile) {
      onNavigateToProfile();
    }
  };

  const handleNavigateToSettings = () => {
    onClose();
    navigate("/settings");
  };

  const menuItems = [
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      onClick: handleNavigateToSettings,
      trailing: <ChevronRight className="w-4 h-4 text-muted-foreground" />,
    },
    {
      id: "appearance",
      label: "Appearance",
      icon: theme === "dark" ? Moon : Sun,
      onClick: () => {},
      trailing: (
        <Switch
          checked={theme === "dark"}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        />
      ),
    },
    {
      id: "subscription",
      label: "Subscription",
      icon: Crown,
      onClick: () => {
        onClose();
        navigate("/pricing");
      },
      trailing: <ChevronRight className="w-4 h-4 text-muted-foreground" />,
    },
    {
      id: "help",
      label: "Help & Support",
      icon: HelpCircle,
      onClick: () => {
        onClose();
        navigate("/help-support");
      },
      trailing: <ChevronRight className="w-4 h-4 text-muted-foreground" />,
    },
    {
      id: "logout",
      label: "Log Out",
      icon: LogOut,
      onClick: handleLogout,
      trailing: null,
      isDestructive: true,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-[60] h-full w-[300px] bg-card border-l border-border shadow-elevated transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Profile</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* User info */}
            <button
              onClick={handleViewProfile}
              className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-colors -mx-3"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">
                  {username || user?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                  {user?.email || "No email"}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Menu items */}
          <div className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isDestructive = 'isDestructive' in item && item.isDestructive;
              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={cn(
                    "flex items-center gap-3 w-full p-3 rounded-xl transition-colors",
                    isDestructive 
                      ? "hover:bg-destructive/10 text-destructive mt-4" 
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    isDestructive ? "bg-destructive/10" : "bg-muted/50"
                  )}>
                    <Icon className={cn(
                      "w-5 h-5",
                      isDestructive ? "text-destructive" : "text-foreground"
                    )} />
                  </div>
                  <span className={cn(
                    "flex-1 text-left font-medium",
                    isDestructive ? "text-destructive" : "text-foreground"
                  )}>
                    {item.label}
                  </span>
                  {item.trailing}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileSlideMenu;
