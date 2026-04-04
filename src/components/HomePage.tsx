import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTrip, type SavedTrip } from "@/hooks/useTrip";
import { Star, CalendarDays, MapPin, Menu } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import TripPreviewSheet from "./TripPreviewSheet";
import ImportBanner from "./home/ImportBanner";
import PlanItNudge from "./home/PlanItNudge";
import RecentlySavedSection from "./home/RecentlySavedSection";

interface HomePageProps {
  onNavigateToTrip?: (tripId?: string) => void;
  onNavigateToSpots?: () => void;
  onMenuClick?: () => void;
  onImportPress?: () => void;
  onNavigateToTripWithCity?: (city: string) => void;
}

type UserTier = "new" | "active" | "engaged";

interface CityCount {
  city: string;
  count: number;
}

const HomePage = ({ onNavigateToTrip, onNavigateToSpots, onMenuClick, onImportPress, onNavigateToTripWithCity }: HomePageProps) => {
  const { user } = useAuth();
  const { savedTrips, isLoading } = useTrip();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [previewTrip, setPreviewTrip] = useState<SavedTrip | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [topCity, setTopCity] = useState<CityCount | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();
      if (data?.username) setProfileName(data.username);
    };
    fetchProfile();
  }, [user]);

  // Fetch saved place count and top city
  useEffect(() => {
    if (!user) {
      setSavedCount(0);
      setTopCity(null);
      return;
    }

    const fetchSavedStats = async () => {
      // Get total saved count
      const { data: savedData } = await supabase
        .from("saved_places")
        .select("place_id, places(address)")
        .eq("user_id", user.id);

      if (!savedData) return;
      setSavedCount(savedData.length);

      // Extract city from address and count
      const cityCounts: Record<string, number> = {};
      savedData.forEach((sp: any) => {
        if (sp.places?.address) {
          // Try to extract city from address (usually after first comma)
          const parts = sp.places.address.split(",");
          const city = parts.length >= 2 ? parts[parts.length - 2].trim() : parts[0].trim();
          if (city) {
            cityCounts[city] = (cityCounts[city] || 0) + 1;
          }
        }
      });

      const sorted = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0 && sorted[0][1] >= 5) {
        setTopCity({ city: sorted[0][0], count: sorted[0][1] });
      } else {
        setTopCity(null);
      }
    };

    fetchSavedStats();
  }, [user]);

  const userTier: UserTier = savedCount >= 5 && topCity ? "engaged" : savedCount > 0 ? "active" : "new";

  const displayName = profileName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Explorer";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = (user?.email?.[0] || displayName[0] || "E").toUpperCase();

  const displayTrips = savedTrips.slice(0, 3);

  const getTripDuration = (trip: SavedTrip) => {
    try {
      const days = differenceInDays(parseISO(trip.end_date), parseISO(trip.start_date)) + 1;
      return `${days} days`;
    } catch {
      return "";
    }
  };

  const getTripSpotCount = (trip: SavedTrip) => {
    if (!trip.trip_data?.days) return 0;
    return trip.trip_data.days.reduce((count, day) => {
      return count + day.slots.reduce((sc, slot) => sc + slot.activities.length, 0);
    }, 0);
  };

  const getTripPhotoUrl = (trip: SavedTrip) => {
    if (trip.trip_data?.days) {
      for (const day of trip.trip_data.days) {
        for (const slot of day.slots) {
          for (const activity of slot.activities) {
            if (activity.photoName) {
              return `https://bqjuoxckvrkykfqpbkpv.supabase.co/functions/v1/place-photo?photo_name=${encodeURIComponent(activity.photoName)}&maxWidthPx=800`;
            }
          }
        }
      }
    }
    return null;
  };

  const handlePlanTrip = (city: string) => {
    if (onNavigateToTripWithCity) {
      onNavigateToTripWithCity(city);
    } else {
      onNavigateToTrip?.();
    }
  };

  const handleImport = () => {
    onImportPress?.();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="px-5 pt-14 pb-32 max-w-lg mx-auto space-y-5">
        {/* Greeting with avatar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-bold text-primary">
              Hello, {displayName}
            </h1>
          </div>
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 text-foreground hover:text-primary transition-colors"
              aria-label="Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Adaptive Section: Import Banner or Plan-It Nudge */}
        {userTier === "engaged" && topCity ? (
          <PlanItNudge
            city={topCity.city}
            spotCount={topCity.count}
            onPlanTrip={handlePlanTrip}
          />
        ) : (
          <ImportBanner onImportPress={handleImport} />
        )}

        {/* Recently Saved (active & engaged) */}
        {userTier !== "new" && (
          <RecentlySavedSection />
        )}

        {/* Compact import for engaged users */}
        {userTier === "engaged" && (
          <ImportBanner compact onImportPress={handleImport} />
        )}

        {/* Trip Cards */}
        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">
            {userTier === "new" ? "Get inspired" : "Your Trips"}
          </h3>
          {isLoading ? (
            <div className="space-y-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : displayTrips.length > 0 ? (
            <div className="space-y-5">
              {displayTrips.map((trip) => {
                const photoUrl = getTripPhotoUrl(trip);
                const spotCount = getTripSpotCount(trip);
                const duration = getTripDuration(trip);

                return (
                  <button
                    key={trip.id}
                    onClick={() => setPreviewTrip(trip)}
                    className="w-full text-left group"
                  >
                    <div className="relative rounded-2xl overflow-hidden shadow-lg shadow-foreground/5 aspect-[4/3]">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={trip.name || trip.destination}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-primary/15" />
                      )}
                      <div className="absolute inset-0 bg-black/50" />
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <h3 className="text-xl font-bold text-white mb-2">
                          {trip.name || `${trip.destination} Trip`}
                        </h3>
                        <div className="flex items-center gap-3 text-white/80 text-xs">
                          {spotCount > 0 && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {spotCount}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5" />
                            4.5
                          </span>
                          {duration && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {duration}
                            </span>
                          )}
                        </div>
                        {trip.trip_data?.summary && (
                          <p className="text-white/70 text-xs mt-2 line-clamp-2">
                            {trip.trip_data.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <MapPin className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">No trips yet</h2>
              <p className="text-sm text-muted-foreground">
                Start by importing your favorite spots
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Trip Preview Bottom Sheet */}
      {previewTrip && (
        <TripPreviewSheet
          trip={previewTrip}
          onClose={() => setPreviewTrip(null)}
          onSaveToMyTrips={(trip) => {
            setPreviewTrip(null);
            onNavigateToTrip?.(trip.id);
          }}
        />
      )}
    </div>
  );
};

export default HomePage;
