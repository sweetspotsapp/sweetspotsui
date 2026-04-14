import { useState, useEffect, useMemo } from "react";
import { Loader2, MapPin } from "lucide-react";
import AppHeader from "./AppHeader";
import ProfileSlideMenu from "./ProfileSlideMenu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "@/hooks/useLocation";
import BoardMapView from "./saved/BoardMapView";
import type { RankedPlace } from "@/hooks/useSearch";
import { useNavigate } from "react-router-dom";

const MapPage = () => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [places, setPlaces] = useState<RankedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { location: userLocation } = useLocation();

  // Load all saved places with their place data
  useEffect(() => {
    const load = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const { data: savedRows } = await supabase
          .from("saved_places")
          .select("place_id")
          .eq("user_id", user.id);

        if (!savedRows?.length) {
          setIsLoading(false);
          return;
        }

        const placeIds = savedRows.map((r) => r.place_id);
        const { data: placeRows } = await supabase
          .from("places")
          .select("*")
          .in("place_id", placeIds);

        if (placeRows) {
          setPlaces(placeRows as unknown as RankedPlace[]);
        }
      } catch (err) {
        console.error("Failed to load saved places for map:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user]);

  const getPlaceImage = (place: RankedPlace) => {
    if (place.photos?.[0]) return place.photos[0];
    return "/placeholder.svg";
  };

  const handlePlaceClick = (place: RankedPlace) => {
    navigate(`/place/${place.place_id}`);
  };

  const validPlaces = useMemo(() => places.filter((p) => p.lat && p.lng), [places]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader onSettingsClick={() => setIsProfileMenuOpen(true)} />

      <div className="flex-1 relative">
        {isLoading ? (
          <div className="h-full flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading your spots...</p>
            </div>
          </div>
        ) : validPlaces.length === 0 ? (
          <div className="h-full flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">No spots to show</h2>
              <p className="text-sm text-muted-foreground">
                Save some places first, and they'll appear here on the map
              </p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0" style={{ paddingBottom: '80px' }}>
            <BoardMapView
              places={validPlaces}
              userLocation={userLocation}
              onPlaceClick={handlePlaceClick}
              getPlaceImage={getPlaceImage}
            />
          </div>
        )}
      </div>

      <ProfileSlideMenu
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
      />
    </div>
  );
};

export default MapPage;
