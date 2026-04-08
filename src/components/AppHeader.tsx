import { Settings, Link2, Sparkles } from "lucide-react";
import { ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";

interface AppHeaderProps {
  onSettingsClick: () => void;
  /** Extra action buttons rendered before the settings gear */
  actions?: ReactNode;
}

/**
 * Shared sticky header used on every main tab (Home, Saved, Trips, Profile).
 * Centered "SweetSpots" title with consistent font/spacing.
 * Hidden on desktop (≥lg) since the top nav handles branding there.
 */
const AppHeader = ({ onSettingsClick, actions }: AppHeaderProps) => {
  const { isPro } = useSubscription();

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/40 lg:hidden pt-safe">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
        <div className="w-10" />
        <div className="flex items-center gap-1.5">
          <h1 className="text-xl font-bold text-primary tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
            SweetSpots
          </h1>
          {isPro && (
            <Sparkles className="w-4 h-4 text-amber-500" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {actions}
          <button
            onClick={onSettingsClick}
            className="p-2 -mr-2 text-foreground hover:text-primary transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
