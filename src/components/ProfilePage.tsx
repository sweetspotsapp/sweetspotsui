import { useState, useEffect, useRef } from "react";
import { User, Sparkles, TrendingUp, Loader2, Settings, ChevronRight, Search, Eye, Heart, Clock, Camera } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useVibeDNA } from "@/hooks/useVibeDNA";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ProfileSlideMenu from "./ProfileSlideMenu";
import LoginReminderBanner from "./LoginReminderBanner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { format } from "date-fns";

interface ProfilePageProps {
  onNavigateToSaved?: () => void;
}

interface SearchHistoryItem {
  id: string;
  prompt: string;
  created_at: string;
}

interface PlaceHistoryItem {
  place_id: string;
  name: string;
  action: string;
  created_at: string;
}

const ProfilePage = ({ onNavigateToSaved }: ProfilePageProps) => {
  const { savedPlaceIds, userVibes } = useApp();
  const { user } = useAuth();
  const { vibeBreakdown, personalityTraits, isLoading: isVibeLoading, totalInteractions, searchCount, placesShownCount } = useVibeDNA();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [showPlacesHistory, setShowPlacesHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [placesHistory, setPlacesHistory] = useState<PlaceHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSaved = savedPlaceIds.size;

  // Load avatar on mount
  useEffect(() => {
    if (!user) return;
    const loadAvatar = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
    };
    loadAvatar();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return; // 5MB max

    setIsUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      setAvatarUrl(publicUrl);
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const loadSearchHistory = async () => {
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("searches")
        .select("id, prompt, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data) setSearchHistory(data);
    } catch (e) {
      console.error("Error loading search history:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadPlacesHistory = async () => {
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("place_interactions")
        .select("place_id, action, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data) {
        // Deduplicate by place_id, keep latest
        const seen = new Set<string>();
        const unique: typeof data = [];
        for (const item of data) {
          if (!seen.has(item.place_id)) {
            seen.add(item.place_id);
            unique.push(item);
          }
        }
        // Fetch place names
        const placeIds = unique.map(i => i.place_id);
        const { data: places } = await supabase
          .from("places")
          .select("place_id, name")
          .in("place_id", placeIds);
        const nameMap = new Map(places?.map(p => [p.place_id, p.name]) || []);
        setPlacesHistory(unique.map(i => ({
          ...i,
          name: nameMap.get(i.place_id) || i.place_id,
        })));
      }
    } catch (e) {
      console.error("Error loading places history:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleOpenSearchHistory = () => {
    setShowSearchHistory(true);
    loadSearchHistory();
  };

  const handleOpenPlacesHistory = () => {
    setShowPlacesHistory(true);
    loadPlacesHistory();
  };

  return (
    <>
    <div className="min-h-screen bg-background pb-20 max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/40">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="w-10" />
            
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              SweetSpots
            </h1>
            
            <button 
              onClick={() => setIsProfileMenuOpen(true)}
              className="p-2 -mr-2 text-foreground hover:text-primary transition-colors"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </header>

        <LoginReminderBanner />

        {/* Page Title */}
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-foreground">Your Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">What Sweetspots knows about you</p>
        </div>

      <div className="p-4 space-y-5">
        {/* Profile Header */}
        <section className="flex items-center gap-4 opacity-0 animate-fade-up" style={{ animationFillMode: 'forwards' }}>
          <button 
            onClick={() => user && fileInputRef.current?.click()}
            className="relative w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group overflow-hidden"
            disabled={!user || isUploadingAvatar}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover rounded-full" />
            ) : (
              <User className="w-8 h-8 text-primary" />
            )}
            {user && (
              <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                {isUploadingAvatar ? (
                  <Loader2 className="w-5 h-5 text-background animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-background" />
                )}
              </div>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          <div>
            <h2 className="font-semibold text-foreground">Explorer</h2>
            <p className="text-sm text-muted-foreground">Finding your sweetspots since today</p>
          </div>
        </section>

        {/* Stats - Interactive */}
        <section className="grid grid-cols-3 gap-3 opacity-0 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
          <button 
            onClick={onNavigateToSaved}
            className="bg-card rounded-xl p-3 border border-border text-center hover:border-primary/30 hover:bg-primary/5 transition-all group"
          >
            <div className="text-2xl font-bold text-primary">{totalSaved}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 group-hover:text-primary transition-colors">Saved spots</div>
            <ChevronRight className="w-3 h-3 text-muted-foreground mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button 
            onClick={handleOpenPlacesHistory}
            className="bg-card rounded-xl p-3 border border-border text-center hover:border-primary/30 hover:bg-primary/5 transition-all group"
          >
            <div className="text-2xl font-bold text-primary">{placesShownCount}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 group-hover:text-primary transition-colors">Places shown</div>
            <ChevronRight className="w-3 h-3 text-muted-foreground mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button 
            onClick={handleOpenSearchHistory}
            className="bg-card rounded-xl p-3 border border-border text-center hover:border-primary/30 hover:bg-primary/5 transition-all group"
          >
            <div className="text-2xl font-bold text-primary">{searchCount || 0}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 group-hover:text-primary transition-colors">Mood searches</div>
            <ChevronRight className="w-3 h-3 text-muted-foreground mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </section>

        {/* Vibe Analysis */}
        <section className="bg-card rounded-xl p-4 border border-border shadow-soft space-y-3 opacity-0 animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">Your Vibe DNA</h3>
            {totalInteractions > 0 && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                Based on {totalInteractions} interaction{totalInteractions !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground">
            {totalInteractions > 0 
              ? "Based on what you save and explore, here's what you're drawn to:"
              : "Start exploring and saving places to build your unique Vibe DNA!"}
          </p>

          {isVibeLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {vibeBreakdown.map((vibe, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground font-medium">{vibe.label}</span>
                    <span className="text-muted-foreground">{vibe.percentage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${vibe.color} rounded-full transition-all duration-500`}
                      style={{ width: `${vibe.percentage}%`, animationDelay: `${index * 100}ms` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Personality Traits */}
        <section className="space-y-3 opacity-0 animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-2 px-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">What we've learned</h3>
          </div>
          
          {isVibeLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : personalityTraits.length === 0 ? (
            <div className="p-4 bg-card rounded-xl border border-border text-center">
              <p className="text-sm text-muted-foreground">
                Start saving and exploring places to discover your personality traits!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {personalityTraits.map((trait, index) => {
                const Icon = trait.icon;
                return (
                  <div 
                    key={index}
                    className="flex gap-3 p-3 bg-card rounded-xl border border-border"
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-foreground">{trait.label}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{trait.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Current preferences */}
        <section className="bg-warm-cream rounded-xl p-4 space-y-2 opacity-0 animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
          <h3 className="font-semibold text-foreground text-sm">Current mood preferences</h3>
          <div className="flex flex-wrap gap-1.5">
            {userVibes.map((vibe, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-2.5 py-1 rounded-full bg-background text-foreground text-xs font-medium border border-border"
              >
                {vibe}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>

    <ProfileSlideMenu 
      isOpen={isProfileMenuOpen} 
      onClose={() => setIsProfileMenuOpen(false)}
    />

    {/* Search History Sheet */}
    <Sheet open={showSearchHistory} onOpenChange={setShowSearchHistory}>
      <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            Mood Search History
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 overflow-y-auto max-h-[55vh] space-y-2">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : searchHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No searches yet. Start exploring!</p>
          ) : (
            searchHistory.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3 bg-card rounded-xl border border-border">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Search className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">{item.prompt}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {format(new Date(item.created_at), "MMM d, yyyy · h:mm a")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>

    {/* Places History Sheet */}
    <Sheet open={showPlacesHistory} onOpenChange={setShowPlacesHistory}>
      <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            Places You've Explored
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 overflow-y-auto max-h-[55vh] space-y-2">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : placesHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No places explored yet. Start discovering!</p>
          ) : (
            placesHistory.map((item, index) => (
              <div key={`${item.place_id}-${index}`} className="flex items-start gap-3 p-3 bg-card rounded-xl border border-border">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.action === "save" ? (
                    <Heart className="w-4 h-4 text-primary" />
                  ) : (
                    <Eye className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground capitalize px-1.5 py-0.5 bg-muted rounded-full">
                      {item.action === "save" ? "Saved" : "Viewed"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(item.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
};

export default ProfilePage;
