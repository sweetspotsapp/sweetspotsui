import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/context/AppContext";
import { useUpcomingTrip } from "@/hooks/useUpcomingTrip";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, Search, MapPin, Sparkles, ChevronRight, Plane } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";

interface HomePageProps {
  onNavigateToProfile?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

interface SavedPlaceWithDetails {
  place_id: string;
  name: string;
  image: string;
  rating: number | null;
}

const TRIP_TEMPLATES = [
  { destination: "Tokyo", duration: "5 days", emoji: "🗼", vibe: "Culture & street food" },
  { destination: "Bali", duration: "7 days", emoji: "🌴", vibe: "Beaches & hidden gems" },
  { destination: "Melbourne", duration: "3 days", emoji: "☕", vibe: "Cafés & laneways" },
  { destination: "Bangkok", duration: "4 days", emoji: "🛕", vibe: "Night markets & temples" },
];

const HomePage = ({ onNavigateToProfile, onNavigateToTab }: HomePageProps) => {
  const { user } = useAuth();
  const { onboardingData } = useApp();
  const upcomingTrip = useUpcomingTrip();

  const [recentlySaved, setRecentlySaved] = useState<SavedPlaceWithDetails[]>([]);
  const [savesCount, setSavesCount] = useState(0);
  const [tripsCount, setTripsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch user stats and recently saved
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      // Fetch counts and recently saved in parallel
      const [savesRes, tripsRes, recentRes] = await Promise.all([
        supabase.from("saved_places").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("trips").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("saved_places").select("place_id, places(name, rating, photo_name)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);

      setSavesCount(savesRes.count || 0);
      setTripsCount(tripsRes.count || 0);

      if (recentRes.data) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const places: SavedPlaceWithDetails[] = recentRes.data
          .filter((r: any) => r.places)
          .map((r: any) => ({
            place_id: r.place_id,
            name: r.places.name,
            rating: r.places.rating,
            image: r.places.photo_name
              ? `${supabaseUrl}/functions/v1/place-photo?photo_name=${encodeURIComponent(r.places.photo_name)}&maxWidthPx=400`
              : `https://source.unsplash.com/400x300/?place&${r.places.name?.slice(0, 3)}`,
          }));
        setRecentlySaved(places);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const userName = user?.user_metadata?.full_name?.split(" ")[0] || user?.user_metadata?.name?.split(" ")[0] || "Explorer";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = (user?.email?.[0] || "E").toUpperCase();

  // Determine user engagement level
  const engagementLevel = useMemo(() => {
    if (tripsCount > 0) return "engaged";
    if (savesCount > 0) return "active";
    return "new";
  }, [savesCount, tripsCount]);

  const handlePlanTrip = () => onNavigateToTab?.("trip");
  const handleDiscover = () => onNavigateToTab?.("discover");

  const handleTemplateClick = (destination: string) => {
    // Navigate to trip tab — in future can pre-fill destination
    onNavigateToTab?.("trip");
  };

  return (
    <div className="min-h-screen bg-background max-w-[420px] lg:max-w-3xl mx-auto relative pb-24 lg:pb-8">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Hi {userName} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your next adventure awaits
            </p>
          </div>
          <button onClick={onNavigateToProfile} className="shrink-0">
            <Avatar className="w-10 h-10 ring-2 ring-border">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
              <AvatarFallback className="text-sm font-semibold bg-muted text-muted-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>

      {/* Upcoming Trip Card */}
      {upcomingTrip && engagementLevel === "engaged" && (
        <div className="px-5 pb-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border border-primary/20 p-5">
            <div className="absolute top-3 right-3 text-3xl opacity-30">🎒</div>
            <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">Upcoming Trip</p>
            <h2 className="text-xl font-bold text-foreground">
              {upcomingTrip.destination} in {upcomingTrip.daysUntil === 0 ? "today!" : `${upcomingTrip.daysUntil} day${upcomingTrip.daysUntil === 1 ? "" : "s"}!`}
            </h2>
            <Button
              variant="default"
              size="sm"
              className="mt-3 rounded-full"
              onClick={handlePlanTrip}
            >
              View Itinerary
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-5 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePlanTrip}
            className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <CalendarDays className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Plan a Trip</span>
          </button>
          <button
            onClick={handleDiscover}
            className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Discover Spots</span>
          </button>
        </div>
      </div>

      {/* Recently Saved — Active & Engaged users */}
      {recentlySaved.length > 0 && (
        <div className="pb-6">
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="text-lg font-semibold text-foreground">Recently Saved</h2>
            <button onClick={() => onNavigateToTab?.("saved")} className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
              See all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }}>
            {recentlySaved.map((place) => (
              <div
                key={place.place_id}
                className="shrink-0 w-36 rounded-xl overflow-hidden border border-border bg-card cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => window.location.href = `/place/${place.place_id}`}
              >
                <div className="h-24 bg-muted">
                  <img src={place.image} alt={place.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-medium text-foreground truncate">{place.name}</p>
                  {place.rating && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">⭐ {place.rating.toFixed(1)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trip Ideas / Templates */}
      <div className="px-5 pb-6">
        <h2 className="text-lg font-semibold text-foreground mb-3">Trip Ideas</h2>
        <div className="grid grid-cols-2 gap-3">
          {TRIP_TEMPLATES.map((template) => (
            <button
              key={template.destination}
              onClick={() => handleTemplateClick(template.destination)}
              className="flex flex-col items-start p-4 rounded-2xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-left"
            >
              <span className="text-2xl mb-2">{template.emoji}</span>
              <p className="text-sm font-semibold text-foreground">{template.destination}</p>
              <p className="text-xs text-muted-foreground">{template.duration} · {template.vibe}</p>
            </button>
          ))}
        </div>
      </div>

      {/* New user empty state */}
      {engagementLevel === "new" && !loading && (
        <div className="px-5 pb-6">
          <div className="rounded-2xl bg-muted/30 border border-border p-6 text-center">
            <Plane className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Start your journey</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Discover amazing spots and plan your perfect trip
            </p>
            <Button onClick={handleDiscover} className="rounded-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Explore Spots
            </Button>
          </div>
        </div>
      )}

      {/* Stats — Engaged users */}
      {engagementLevel !== "new" && !loading && (
        <div className="px-5 pb-6">
          <div className="flex items-center justify-center gap-8 py-4 rounded-2xl bg-muted/30 border border-border">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{savesCount}</p>
              <p className="text-xs text-muted-foreground">Spots Saved</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{tripsCount}</p>
              <p className="text-xs text-muted-foreground">Trips Planned</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
