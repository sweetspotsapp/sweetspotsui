import { MapPin } from "lucide-react";
import AppHeader from "./AppHeader";
import ProfileSlideMenu from "./ProfileSlideMenu";
import { useState } from "react";

const MapPage = () => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader onSettingsClick={() => setIsProfileMenuOpen(true)} />

      <div className="max-w-md mx-auto lg:max-w-4xl px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <MapPin className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Map View</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Explore your saved spots and nearby discoveries on the map
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Coming soon</p>
      </div>

      <ProfileSlideMenu
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
      />
    </div>
  );
};

export default MapPage;
