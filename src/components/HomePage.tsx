import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/context/AppContext";
import { useUpcomingTrip } from "@/hooks/useUpcomingTrip";
import { useProfileInfo } from "@/hooks/useProfileInfo";
import { supabase } from "@/integrations/supabase/client";
import { SS_RESUME_TRIP, lsRecsCache } from "@/lib/storageKeys";
import { CalendarDays, Search, ChevronRight, Sparkles, ArrowRight, Star, CloudRain, CloudSnow, Cloud, Sun, CloudLightning, Link2 } from "lucide-react";
import ImportLinkDialog from "./saved/ImportLinkDialog";
import { useWeatherForecast } from "@/hooks/useWeatherForecast";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import ProfileSlideMenu from "./ProfileSlideMenu";

import { useLocation as useGeoLocation } from "@/hooks/useLocation";
import { CURATED_SECTIONS, detectRegion } from "@/data/curatedTrips";
import type { TripSection } from "@/data/curatedTrips";

export interface DBTripTemplate {
  id: string;
  destination: string;
  duration: number;
  vibes: string[];
  budget: string;
  group_size: number;
  tagline: string | null;
  trip_data: any;
}

interface HomePageProps {
  onNavigateToProfile?: () => void;
  onNavigateToTab?: (tab: string) => void;
  onTripTemplate?: (template: DBTripTemplate) => void;
}

interface SavedPlaceWithDetails {
  place_id: string;
  name: string;
  image: string;
  rating: number | null;
}

// Small weather icon using lucide icons
const WeatherIconSmall = ({ icon }: { icon: string }) => {
  const cls = "w-3.5 h-3.5";
  switch (icon) {
    case "clear": return <Sun className={cls} />;
    case "rain": return <CloudRain className={cls} />;
    case "clouds": return <Cloud className={cls} />;
    case "snow": return <CloudSnow className={cls} />;
    case "thunderstorm": return <CloudLightning className={cls} />;
    default: return <Cloud className={cls} />;
  }
};

const HomePage = ({ onNavigateToProfile, onNavigateToTab, onTripTemplate }: HomePageProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { onboardingData } = useApp();
  const { location: geoLocation } = useGeoLocation();
  const tripStatus = useUpcomingTrip();
  const { avatarUrl: profileAvatarUrl, username: profileUsername } = useProfileInfo();

  // Weather for trip banner
  const tripDestination = tripStatus?.live?.destination || tripStatus?.upcoming?.destination || null;
  const { forecast: tripWeather } = useWeatherForecast(tripDestination);
  const todayWeather = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return tripWeather.get(todayStr) || null;
  }, [tripWeather]);

  const [recentlySaved, setRecentlySaved] = useState<SavedPlaceWithDetails[]>([]);
  const [savesCount, setSavesCount] = useState(0);
  const [tripsCount, setTripsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<Array<{
    place_id: string; name: string; rating: number | null; photo_name: string | null; ai_reason: string;
  }>>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showDiscoverMenu, setShowDiscoverMenu] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetchData = async () => {
      setLoading(true);
      const [savesRes, tripsRes, recentRes] = await Promise.all([
        supabase.from("saved_places").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("trips").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("saved_places").select("place_id, places(name, rating, photo_name)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      setSavesCount(savesRes.count || 0);
      setTripsCount(tripsRes.count || 0);
      if (recentRes.data) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        setRecentlySaved(recentRes.data.filter((r: any) => r.places).map((r: any) => ({
          place_id: r.place_id,
          name: r.places.name,
          rating: r.places.rating,
          image: r.places.photo_name
            ? `${supabaseUrl}/functions/v1/place-photo?photo_name=${encodeURIComponent(r.places.photo_name)}&maxWidthPx=400`
            : `https://source.unsplash.com/400x300/?place&${r.places.name?.slice(0, 3)}`,
        })));
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  // Fetch notification_settings to check recommendations preference
  const [recsEnabled, setRecsEnabled] = useState(true);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("notification_settings").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.notification_settings) {
        const ns = data.notification_settings as any;
        if (ns.recommendations === false) setRecsEnabled(false);
      }
    });
  }, [user]);

  // Fetch personalized recommendations (cached for 30 minutes)
  useEffect(() => {
    if (!user || savesCount === 0 || !recsEnabled) return;

    const CACHE_KEY = lsRecsCache(user.id);
    const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data: cachedData, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL && cachedData?.length > 0) {
          setRecommendations(cachedData);
          return;
        }
      }
    } catch { /* ignore parse errors */ }

    setRecsLoading(true);
    supabase.functions.invoke("recommend-for-you", {
      body: { limit: 6 },
    }).then(({ data }) => {
      if (data?.recommendations) {
        setRecommendations(data.recommendations);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: data.recommendations, ts: Date.now() }));
      }
    }).catch(() => {}).finally(() => setRecsLoading(false));
  }, [user, savesCount, recsEnabled]);

  const userName = profileUsername || user?.user_metadata?.full_name?.split(" ")[0] || "Explorer";
  const avatarUrl = profileAvatarUrl || user?.user_metadata?.avatar_url;
  const initials = (user?.email?.[0] || "E").toUpperCase();

  const engagementLevel = useMemo(() => {
    if (tripsCount > 0) return "engaged";
    if (savesCount > 0) return "active";
    return "new";
  }, [savesCount, tripsCount]);

  // Personalized trip ideas based on user's location
  const tripSections = useMemo((): TripSection[] => {
    const region = detectRegion(onboardingData?.explore_location, geoLocation?.lat);
    return CURATED_SECTIONS[region] || CURATED_SECTIONS.global;
  }, [onboardingData?.explore_location, geoLocation?.lat]);

  const handlePlanTrip = () => onNavigateToTab?.("trip");
  const handleGoToTrip = (tripId: string) => {
    sessionStorage.setItem(SS_RESUME_TRIP, tripId);
    onNavigateToTab?.("trip");
  };
  const handleDiscover = () => onNavigateToTab?.("discover");

  // Skeleton for recently saved section
  const RecentSavedSkeleton = () => (
    <div className="pt-6 pb-2">
      <div className="flex items-center justify-between px-5 mb-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="flex gap-3 overflow-hidden px-5">
        {[1, 2, 3].map(i => (
          <div key={i} className="shrink-0 w-[140px] rounded-2xl overflow-hidden">
            <Skeleton className="h-[100px] w-full" />
            <div className="p-2.5 space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Skeleton for recommendations section
  const RecsSkeleton = () => (
    <div className="pt-6 pb-2">
      <div className="flex items-center justify-between px-5 mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
      </div>
      <div className="flex gap-3 overflow-hidden px-5">
        {[1, 2, 3].map(i => (
          <div key={i} className="shrink-0 w-[160px] rounded-2xl overflow-hidden border border-border/40">
            <Skeleton className="h-[110px] w-full" />
            <div className="p-2.5 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background max-w-[420px] lg:max-w-3xl mx-auto relative pb-24 lg:pb-8">

      {/* Header — staggered entrance */}
      <div className="px-5 pt-8 pb-2 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Hi {userName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your next adventure awaits
            </p>
          </div>
          <button onClick={() => setIsProfileMenuOpen(true)} className="shrink-0">
            <Avatar className="w-11 h-11 ring-2 ring-border/50">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
              <AvatarFallback className="text-sm font-semibold bg-muted text-muted-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>

      <ProfileSlideMenu
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
        onNavigateToProfile={onNavigateToProfile}
      />

      {/* Live Trip Banner */}
      {tripStatus?.type === "live" && tripStatus.live && (
        <div className="px-5 pt-4 pb-2 animate-fade-in" style={{ animationDelay: "50ms", animationFillMode: "both" }}>
          <button
            onClick={() => handleGoToTrip(tripStatus.live!.id)}
            className="w-full relative overflow-hidden rounded-2xl bg-green-500/10 dark:bg-green-900/20 p-5 text-left transition-all hover:bg-green-500/15 active:scale-[0.98] border border-green-500/20"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-widest">Live Trip</p>
            </div>
            <h2 className="text-xl font-bold text-foreground">
              You're in {tripStatus.live.destination}!
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-muted-foreground">
                Day {tripStatus.live.currentDay} of {tripStatus.live.totalDays}
              </p>
              {todayWeather && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <WeatherIconSmall icon={todayWeather.icon} /> {todayWeather.tempHigh}°C, {todayWeather.summary}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm text-green-700 dark:text-green-400 font-medium">
              Open Live View <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Upcoming Trip Card */}
      {tripStatus?.type === "upcoming" && tripStatus.upcoming && engagementLevel === "engaged" && (
        <div className="px-5 pt-4 pb-2 animate-fade-in" style={{ animationDelay: "50ms", animationFillMode: "both" }}>
          <button
            onClick={() => handleGoToTrip(tripStatus.upcoming!.id)}
            className="w-full relative overflow-hidden rounded-2xl bg-primary/10 p-5 text-left transition-all hover:bg-primary/15 active:scale-[0.98]"
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Upcoming</p>
            <h2 className="text-xl font-bold text-foreground">
              {tripStatus.upcoming.destination} in {tripStatus.upcoming.daysUntil === 0 ? "today!" : `${tripStatus.upcoming.daysUntil} day${tripStatus.upcoming.daysUntil === 1 ? "" : "s"}`}
            </h2>
            {todayWeather && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <WeatherIconSmall icon={todayWeather.icon} /> {todayWeather.tempHigh}°C, {todayWeather.summary}
              </p>
            )}
            <div className="flex items-center gap-1 mt-2 text-sm text-primary font-medium">
              View Itinerary <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-5 pt-5 pb-2 animate-fade-in" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePlanTrip}
            className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-muted/40 transition-all hover:bg-muted/60 active:scale-[0.97] group"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Plan a Trip</span>
          </button>
          <button
            onClick={() => setShowDiscoverMenu(true)}
            className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-muted/40 transition-all hover:bg-muted/60 active:scale-[0.97] group"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Discover Spots</span>
          </button>
        </div>
      </div>

      {/* Discover Action Sheet */}
      {showDiscoverMenu && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[55]" onClick={() => setShowDiscoverMenu(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-card rounded-t-2xl p-4 pb-28 max-w-md mx-auto shadow-lg animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
            <h3 className="text-base font-semibold text-foreground mb-3">Discover Spots</h3>
            <button
              onClick={() => { setShowDiscoverMenu(false); handleDiscover(); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-medium text-foreground">Search by Vibe</span>
                <p className="text-xs text-muted-foreground">Find places that match your mood</p>
              </div>
            </button>
            <button
              onClick={() => { setShowDiscoverMenu(false); setShowImportDialog(true); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <span className="text-sm font-medium text-foreground">Save from Link</span>
                <p className="text-xs text-muted-foreground">Paste a TikTok, Instagram, or Google Maps link</p>
              </div>
            </button>
          </div>
        </>
      )}

      <ImportLinkDialog open={showImportDialog} onClose={() => setShowImportDialog(false)} />

      {/* Recently Saved */}
      {loading && user && <RecentSavedSkeleton />}
      {!loading && recentlySaved.length > 0 && (
        <div className="pt-6 pb-2 animate-fade-in" style={{ animationDelay: "150ms", animationFillMode: "both" }}>
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="text-base font-semibold text-foreground">Recently Saved</h2>
            <button onClick={() => onNavigateToTab?.("saved")} className="flex items-center gap-0.5 text-sm text-primary font-medium">
              See all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }}>
            {recentlySaved.map((place) => (
              <div
                key={place.place_id}
                className="shrink-0 w-[140px] rounded-2xl overflow-hidden bg-card cursor-pointer hover:shadow-md transition-all active:scale-[0.97]"
                onClick={() => navigate(`/place/${place.place_id}`)}
              >
                <div className="h-[100px] bg-muted">
                  <img src={place.image} alt={place.name} className="w-full h-full object-cover" loading="lazy" width={140} height={100} />
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-foreground truncate">{place.name}</p>
                  {place.rating && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{place.rating.toFixed(1)} rating</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spots You Might Like */}
      {recsEnabled && recsLoading && <RecsSkeleton />}
      {recsEnabled && !recsLoading && recommendations.length > 0 && (
        <div className="pt-6 pb-2 animate-fade-in" style={{ animationDelay: "180ms", animationFillMode: "both" }}>
          <div className="flex items-center justify-between px-5 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Spots You Might Like</h2>
            </div>
            <button onClick={handleDiscover} className="flex items-center gap-0.5 text-sm text-primary font-medium">
              More <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }}>
            {recommendations.map((rec) => {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              const imgSrc = rec.photo_name
                ? `${supabaseUrl}/functions/v1/place-photo?photo_name=${encodeURIComponent(rec.photo_name)}&maxWidthPx=400`
                : null;
              return (
                <div
                  key={rec.place_id}
                  className="shrink-0 w-[160px] rounded-2xl overflow-hidden bg-card cursor-pointer hover:shadow-md transition-all active:scale-[0.97] border border-border/40"
                  onClick={() => navigate(`/place/${rec.place_id}`)}
                >
                  <div className="h-[110px] bg-muted relative">
                    {imgSrc ? (
                      <img src={imgSrc} alt={rec.name} className="w-full h-full object-cover" loading="lazy" width={160} height={110} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Star className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-foreground truncate">{rec.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{rec.ai_reason}</p>
                    {rec.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-[11px] text-muted-foreground">{rec.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trip Ideas — personalized sections by location */}
      {tripSections.map((section, sIdx) => (
        <div key={section.title} className="pt-6 pb-2 animate-fade-in" style={{ animationDelay: `${200 + sIdx * 50}ms`, animationFillMode: "both" }}>
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
            {sIdx === 0 && (
              <button onClick={handlePlanTrip} className="flex items-center gap-0.5 text-sm text-primary font-medium">
                Plan yours <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }}>
            {section.trips.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  if (onTripTemplate) {
                    onTripTemplate({
                      id: t.id,
                      destination: t.destination,
                      duration: t.duration,
                      vibes: t.vibes,
                      budget: t.budget,
                      group_size: t.groupSize,
                      tagline: t.subtitle,
                      trip_data: t.tripData,
                    });
                  } else {
                    onNavigateToTab?.("trip");
                  }
                }}
                className="shrink-0 w-[200px] relative overflow-hidden rounded-2xl h-[150px] text-left transition-all hover:shadow-lg active:scale-[0.97] group"
              >
                <img
                  src={t.image}
                  alt={t.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  width={400}
                  height={300}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="relative h-full flex flex-col justify-end p-3.5">
                  <p className="text-sm font-bold text-white leading-tight">{t.title}</p>
                  <p className="text-[11px] text-white/70 mt-0.5">{t.duration} {t.duration === 1 ? "day" : "days"} · {t.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* New user CTA */}
      {engagementLevel === "new" && !loading && (
        <div className="px-5 pb-6 animate-fade-in" style={{ animationDelay: "250ms", animationFillMode: "both" }}>
          <div className="rounded-2xl bg-muted/30 p-7 text-center">
            <Link2 className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-bold text-foreground mb-1">Found a spot on TikTok or Instagram?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Save it here, organise your boards, and let AI plan your trip.
            </p>
            <Button onClick={() => setShowImportDialog(true)} className="rounded-full px-6">
              Save Your First Spot
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      {engagementLevel !== "new" && !loading && (
        <div className="px-5 pb-6 animate-fade-in" style={{ animationDelay: "250ms", animationFillMode: "both" }}>
          <div className="flex items-center justify-center gap-10 py-5 rounded-2xl bg-muted/30">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{savesCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Spots Saved</p>
            </div>
            <div className="w-px h-9 bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{tripsCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Trips Planned</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
