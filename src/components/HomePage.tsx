import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTrip, type SavedTrip } from "@/hooks/useTrip";
import { Star, CalendarDays, MapPin, Menu, Compass } from "lucide-react";
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

  useEffect(() => {
    if (!user) {
      setSavedCount(0);
      setTopCity(null);
      return;
    }

    const fetchSavedStats = async () => {
      const { data: savedData } = await supabase
        .from("saved_places")
        .select("place_id, places(address)")
        .eq("user_id", user.id);

      if (!savedData) return;
      setSavedCount(savedData.length);

      const cityCounts: Record<string, number> = {};
      savedData.forEach((sp: any) => {
        if (sp.places?.address) {
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
      <div className="px-5 pt-14 pb-32 max-w-lg mx-auto space-y-6">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 ring-2 ring-primary/10">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Welcome back</p>
              <h1 className="text-lg font-bold text-foreground leading-tight">
                {displayName}
              </h1>
            </div>
          </div>
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Adaptive Section */}
        {userTier === "engaged" && topCity ? (
          <PlanItNudge
            city={topCity.city}
            spotCount={topCity.count}
            onPlanTrip={handlePlanTrip}
          />
        ) : (
          <ImportBanner onImportPress={handleImport} />
        )}

        {/* Recently Saved */}
        {userTier !== "new" && <RecentlySavedSection />}

        {/* Compact import for engaged users */}
        {userTier === "engaged" && (
          <ImportBanner compact onImportPress={handleImport} />
        )}

        {/* Trip Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">
              {userTier === "new" ? "Get inspired" : "Your Trips"}
            </h3>
            {displayTrips.length > 0 && (
              <button
                onClick={() => onNavigateToTrip?.()}
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                See all
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="h-52 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : displayTrips.length > 0 ? (
            <div className="space-y-4">
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
                    <div className="relative rounded-2xl overflow-hidden aspect-[16/9]">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={trip.name || trip.destination}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <h3 className="text-lg font-bold text-white mb-1.5">
                          {trip.name || `${trip.destination} Trip`}
                        </h3>
                        <div className="flex items-center gap-3 text-white/70 text-xs">
                          {spotCount > 0 && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {spotCount} spots
                            </span>
                          )}
                          {duration && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {duration}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Compass className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No trips yet</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Start by saving spots you love, then plan your perfect trip.
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
