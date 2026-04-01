import { Menu } from "lucide-react";
import { ReactNode } from "react";

interface AppHeaderProps {
  onSettingsClick: () => void;
  /** Extra action buttons rendered before the menu icon */
  actions?: ReactNode;
}

/**
 * Shared sticky header used on every main tab.
 * Centered "SweetSpots" title with menu icon to open profile slide menu.
 */
const AppHeader = ({ onSettingsClick, actions }: AppHeaderProps) => (
  <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/40">
    <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
      <div className="w-10" />
      <h1 className="text-xl font-bold text-primary tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
        SweetSpots
      </h1>
      <div className="flex items-center gap-1">
        {actions}
        <button
          onClick={onSettingsClick}
          className="p-2 -mr-2 text-foreground hover:text-primary transition-colors"
          aria-label="Menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </div>
  </header>
);

export default AppHeader;
