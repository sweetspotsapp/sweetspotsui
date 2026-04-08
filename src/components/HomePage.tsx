import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/context/AppContext";
import { useUpcomingTrip } from "@/hooks/useUpcomingTrip";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, Search, ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";

import tripTokyo from "@/assets/trip-tokyo.jpg";
import tripBali from "@/assets/trip-bali.jpg";
import tripMelbourne from "@/assets/trip-melbourne.jpg";
import tripBangkok from "@/assets/trip-bangkok.jpg";

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

// Fallback images keyed by destination
const TEMPLATE_IMAGES: Record<string, string> = {
  Tokyo: tripTokyo,
  Bali: tripBali,
  Melbourne: tripMelbourne,
  Bangkok: tripBangkok,
};

const HomePage = ({ onNavigateToProfile, onNavigateToTab, onTripTemplate }: HomePageProps) => {
  const { user } = useAuth();
  const { onboardingData } = useApp();
  const upcomingTrip = useUpcomingTrip();

  const [recentlySaved, setRecentlySaved] = useState<SavedPlaceWithDetails[]>([]);
  const [savesCount, setSavesCount] = useState(0);
  const [tripsCount, setTripsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<DBTripTemplate[]>([]);

  useEffect(() => {
    // Fetch trip templates from DB (public, no auth needed)
    supabase.from("trip_templates" as any).select("id, destination, duration, vibes, budget, group_size, tagline, trip_data").eq("is_active", true).then(({ data }) => {
      if (data) setTemplates(data as any[]);
    });
  }, []);

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

  const userName = user?.user_metadata?.full_name?.split(" ")[0] || user?.user_metadata?.name?.split(" ")[0] || "Explorer";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = (user?.email?.[0] || "E").toUpperCase();

  const engagementLevel = useMemo(() => {
    if (tripsCount > 0) return "engaged";
    if (savesCount > 0) return "active";
    return "new";
  }, [savesCount, tripsCount]);

  const handlePlanTrip = () => onNavigateToTab?.("trip");
  const handleDiscover = () => onNavigateToTab?.("discover");
  const handleTemplateClick = (template: DBTripTemplate) => {
    if (onTripTemplate) {
      onTripTemplate(template);
    } else {
      onNavigateToTab?.("trip");
    }
  };

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
          <button onClick={onNavigateToProfile} className="shrink-0">
            <Avatar className="w-11 h-11 ring-2 ring-border/50">
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
        <div className="px-5 pt-4 pb-2 animate-fade-in" style={{ animationDelay: "50ms", animationFillMode: "both" }}>
          <button
            onClick={handlePlanTrip}
            className="w-full relative overflow-hidden rounded-2xl bg-primary/10 p-5 text-left transition-all hover:bg-primary/15 active:scale-[0.98]"
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Upcoming</p>
            <h2 className="text-xl font-bold text-foreground">
              {upcomingTrip.destination} in {upcomingTrip.daysUntil === 0 ? "today!" : `${upcomingTrip.daysUntil} day${upcomingTrip.daysUntil === 1 ? "" : "s"}`}
            </h2>
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
            onClick={handleDiscover}
            className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-muted/40 transition-all hover:bg-muted/60 active:scale-[0.97] group"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Discover Spots</span>
          </button>
        </div>
      </div>

      {/* Recently Saved */}
      {recentlySaved.length > 0 && (
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
                onClick={() => window.location.href = `/place/${place.place_id}`}
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

      {/* Trip Ideas — photo cards */}
      <div className="px-5 pt-6 pb-4 animate-fade-in" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
        <h2 className="text-base font-semibold text-foreground mb-3">Trip Ideas</h2>
        <div className="grid grid-cols-2 gap-3">
          {TRIP_TEMPLATES.map((template, i) => (
            <button
              key={template.destination}
              onClick={() => handleTemplateClick(template)}
              className="relative overflow-hidden rounded-2xl h-[160px] text-left transition-all hover:shadow-lg active:scale-[0.97] group"
            >
              <img
                src={template.image}
                alt={template.destination}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                width={640}
                height={512}
              />
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              {/* Text */}
              <div className="relative h-full flex flex-col justify-end p-4">
                <p className="text-[15px] font-bold text-white leading-tight">{template.destination}</p>
                <p className="text-[11px] text-white/75 mt-0.5">{template.duration} days · {template.vibe}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* New user CTA */}
      {engagementLevel === "new" && !loading && (
        <div className="px-5 pb-6 animate-fade-in" style={{ animationDelay: "250ms", animationFillMode: "both" }}>
          <div className="rounded-2xl bg-muted/30 p-7 text-center">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-bold text-foreground mb-1">Start your journey</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Discover hidden gems and plan unforgettable trips
            </p>
            <Button onClick={handleDiscover} className="rounded-full px-6">
              Explore Spots
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
