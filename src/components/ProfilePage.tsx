import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Sparkles, TrendingUp, Loader2, Settings, ChevronRight, Search, Eye, Heart, Clock, Camera, Share2, Wand2, RefreshCw, Pencil, Check, RotateCcw, ImageIcon, Upload } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useVibeDNA } from "@/hooks/useVibeDNA";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ProfileSlideMenu from "./ProfileSlideMenu";
import LoginReminderBanner from "./LoginReminderBanner";
import VibeShareCard from "./VibeShareCard";
import PersonalityTraitModal from "./PersonalityTraitModal";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import defaultCover from "@/assets/default-cover.jpg";
import coverBeach from "@/assets/covers/cover-beach.jpg";
import coverMountains from "@/assets/covers/cover-mountains.jpg";
import coverCity from "@/assets/covers/cover-city.jpg";
import coverDesert from "@/assets/covers/cover-desert.jpg";
import coverTemple from "@/assets/covers/cover-temple.jpg";

const PRESET_COVERS = [
  { src: coverBeach, label: "Beach Paradise" },
  { src: coverMountains, label: "Mountain Roads" },
  { src: coverCity, label: "City Nights" },
  { src: coverDesert, label: "Desert Sunset" },
  { src: coverTemple, label: "Ancient Temples" },
];

const PRESET_COVER_MAP: Record<string, string> = Object.fromEntries(
  PRESET_COVERS.map(c => [c.label, c.src])
);

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

interface CharacterMatch {
  character_name: string;
  known_for: string;
  source: string;
  match_reason: string;
  emoji: string;
  match_percentage: number;
}

const ProfilePage = ({ onNavigateToSaved }: ProfilePageProps) => {
  const navigate = useNavigate();
  const { savedPlaceIds, userVibes } = useApp();
  const { user } = useAuth();
  const { vibeBreakdown, personalityTraits, isLoading: isVibeLoading, totalInteractions, searchCount, placesShownCount, refresh: refreshVibeDNA } = useVibeDNA();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [showPlacesHistory, setShowPlacesHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [placesHistory, setPlacesHistory] = useState<PlaceHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showVibeCard, setShowVibeCard] = useState(false);
  const [showInteractionDetails, setShowInteractionDetails] = useState(false);
  const [interactionDetails, setInteractionDetails] = useState<Array<{ place_id: string; name: string; action: string; created_at: string; weight: number }>>([]);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);
  const [characterMatch, setCharacterMatch] = useState<CharacterMatch | null>(null);
  const [characterPool, setCharacterPool] = useState<CharacterMatch[]>([]);
  const [characterIndex, setCharacterIndex] = useState(0);
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(false);
  const [username, setUsername] = useState("Explorer");
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [selectedTrait, setSelectedTrait] = useState<typeof personalityTraits[0] | null>(null);
  const [hiddenTraits, setHiddenTraits] = useState<Set<string>>(new Set());
  const [customVibes, setCustomVibes] = useState<Array<{ label: string; description: string }>>([]);
  const [isAddingVibe, setIsAddingVibe] = useState(false);
  const [newVibeLabel, setNewVibeLabel] = useState("");
  const [newVibeDescription, setNewVibeDescription] = useState("");

  const [isResettingTrait, setIsResettingTrait] = useState(false);

  const handleResetTrait = async (trait: typeof personalityTraits[0]) => {
    if (!user) return;
    setIsResettingTrait(true);
    try {
      // Find the personality definition to get trigger tags/categories
      const { PERSONALITY_DEFINITIONS } = await import("@/hooks/useVibeDNA");
      const definition = PERSONALITY_DEFINITIONS.find(d => d.label === trait.label);
      
      if (!definition) {
        // Custom vibe — just hide it
        setHiddenTraits(prev => new Set(prev).add(trait.label));
        toast({ title: `"${trait.label}" removed` });
        setSelectedTrait(null);
        setIsResettingTrait(false);
        return;
      }

      const triggerTags = definition.triggers.tags || [];
      const triggerCategories = definition.triggers.categories || [];

      // Fetch user's interactions with place data
      const { data: interactions } = await supabase
        .from('place_interactions')
        .select('id, place_id')
        .eq('user_id', user.id);

      if (interactions && interactions.length > 0) {
        const placeIds = [...new Set(interactions.map(i => i.place_id))];
        const { data: places } = await supabase
          .from('places')
          .select('place_id, filter_tags, categories')
          .in('place_id', placeIds);

        // Find place_ids that match this trait's triggers
        const matchingPlaceIds = new Set<string>();
        places?.forEach(place => {
          const tags = (place.filter_tags || []).map((t: string) => t.toLowerCase().replace(/-/g, '_'));
          const cats = (place.categories || []).map((c: string) => c.toLowerCase().replace(/-/g, '_'));
          const hasMatchingTag = tags.some((t: string) => triggerTags.some(tt => t.includes(tt) || tt.includes(t)));
          const hasMatchingCat = cats.some((c: string) => triggerCategories.some(tc => c.includes(tc) || tc.includes(c)));
          if (hasMatchingTag || hasMatchingCat) {
            matchingPlaceIds.add(place.place_id);
          }
        });

        // Delete interactions for matching places
        const idsToDelete = interactions
          .filter(i => matchingPlaceIds.has(i.place_id))
          .map(i => i.id);

        if (idsToDelete.length > 0) {
          const { error } = await supabase
            .from('place_interactions')
            .delete()
            .in('id', idsToDelete);
          if (error) throw error;
        }
      }

      // Also delete related searches based on trigger keywords
      const searchKeywords = [...triggerTags, ...triggerCategories].map(k => k.replace(/_/g, ' '));
      if (searchKeywords.length > 0 && user) {
        const { data: searches } = await supabase
          .from('searches')
          .select('id, prompt')
          .eq('user_id', user.id);
        
        const searchIdsToDelete = searches?.filter(s => 
          searchKeywords.some(kw => s.prompt.toLowerCase().includes(kw))
        ).map(s => s.id) || [];

        if (searchIdsToDelete.length > 0) {
          await supabase.from('searches').delete().in('id', searchIdsToDelete);
        }
      }

      // Hide the trait and refresh Vibe DNA
      setHiddenTraits(prev => new Set(prev).add(trait.label));
      refreshVibeDNA();
      toast({ title: `"${trait.label}" reset`, description: `Removed ${trait.label.toLowerCase()} signals from your vibe analysis.` });
      setSelectedTrait(null);
    } catch (err) {
      console.error("Failed to reset trait:", err);
      toast({ title: "Failed to reset", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsResettingTrait(false);
    }
  };

  const visibleTraits = personalityTraits.filter(t => !hiddenTraits.has(t.label));

  const fetchCharacterMatch = async (existingPool: CharacterMatch[] = []) => {
    setIsLoadingCharacter(true);
    try {
      const excludeNames = existingPool.map(c => c.character_name);
      const { data, error } = await supabase.functions.invoke("character-match", {
        body: { vibeBreakdown, personalityTraits: personalityTraits.map(t => ({ label: t.label, description: t.description })), excludeNames },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const newPool = [...existingPool, data];
      setCharacterPool(newPool);
      setCharacterMatch(data);
      setCharacterIndex(newPool.length - 1);
    } catch (err) {
      console.error("Character match error:", err);
      toast({ title: "Couldn't find your match", description: "Try again in a moment.", variant: "destructive" });
    } finally {
      setIsLoadingCharacter(false);
    }
  };

  const handleTryAnother = () => {
    if (characterPool.length < 3) {
      // Fetch a new unique character
      fetchCharacterMatch(characterPool);
    } else {
      // Cycle through existing 3
      const nextIndex = (characterIndex + 1) % characterPool.length;
      setCharacterIndex(nextIndex);
      setCharacterMatch(characterPool[nextIndex]);
    }
  };

  const handleOpenInteractionDetails = async () => {
    if (!user) return;
    setShowInteractionDetails(true);
    setIsLoadingInteractions(true);
    try {
      const { data } = await supabase
        .from("place_interactions")
        .select("place_id, action, created_at, weight")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const placeIds = [...new Set(data.map(d => d.place_id))];
        const { data: places } = await supabase
          .from("places")
          .select("place_id, name")
          .in("place_id", placeIds);

        const nameMap = new Map(places?.map(p => [p.place_id, p.name]) || []);
        setInteractionDetails(data.map(d => ({
          ...d,
          name: nameMap.get(d.place_id) || d.place_id,
          weight: d.weight || 1,
        })));
      } else {
        setInteractionDetails([]);
      }
    } catch (err) {
      console.error("Failed to load interactions:", err);
    } finally {
      setIsLoadingInteractions(false);
    }
  };

  const totalSaved = savedPlaceIds.size;

  // Load avatar on mount
  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data } = await (supabase
        .from("profiles") as any)
        .select("avatar_url, username, cover_url")
        .eq("id", user.id)
        .single();
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      if (data?.username) setUsername(data.username);
      if (data?.cover_url) {
        // Resolve preset labels to actual image imports, or use as URL for custom uploads
        const resolved = PRESET_COVER_MAP[data.cover_url] || data.cover_url;
        setCoverUrl(resolved);
      }
    };
    loadProfile();
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

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;

    setIsUploadingCover(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/cover.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      await (supabase
        .from("profiles") as any)
        .update({ cover_url: publicUrl })
        .eq("id", user.id);

      setCoverUrl(publicUrl);
      toast({ title: "Cover photo updated!" });
    } catch (err) {
      console.error("Cover upload failed:", err);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploadingCover(false);
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

        {/* Profile Hero with Cover Banner */}
        <div className="relative">
          {/* Cover Banner */}
          <div className="relative h-36 overflow-hidden">
            <img 
              src={coverUrl || defaultCover} 
              alt="Cover" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
            
            {/* Subtle Cover Edit Button */}
            {user && (
              <button
                onClick={() => setShowCoverPicker(true)}
                disabled={isUploadingCover}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/60 hover:text-white/90 hover:bg-white/25 transition-all"
              >
                {isUploadingCover ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Pencil className="w-3.5 h-3.5" />
                )}
              </button>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
            />
          </div>

          {/* Avatar overlapping the cover */}
          <div className="flex flex-col items-center -mt-14 relative z-10 pb-4 px-4">
            <button 
              onClick={() => user && fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full bg-background flex items-center justify-center group overflow-hidden mb-3 ring-4 ring-background shadow-lg"
              disabled={!user || isUploadingAvatar}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-10 h-10 text-primary" />
                </div>
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

            {isEditingName ? (
              <div className="flex items-center gap-1.5 mb-0.5">
                <input
                  ref={nameInputRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const trimmed = editName.trim();
                      if (trimmed && user) {
                        setUsername(trimmed);
                        setIsEditingName(false);
                        supabase.from("profiles").update({ username: trimmed }).eq("id", user.id).then();
                      }
                    }
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                  className="bg-transparent border-b border-primary text-foreground font-bold text-lg outline-none text-center max-w-[200px]"
                  maxLength={24}
                  autoFocus
                />
                <button
                  onClick={() => {
                    const trimmed = editName.trim();
                    if (trimmed && user) {
                      setUsername(trimmed);
                      setIsEditingName(false);
                      supabase.from("profiles").update({ username: trimmed }).eq("id", user.id).then();
                    }
                  }}
                  className="p-1 text-primary"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditName(username); setIsEditingName(true); }}
                className="flex items-center gap-1.5 group mb-0.5"
              >
                <h1 className="text-lg font-bold text-foreground">{username}</h1>
                <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            )}

            <p className="text-xs text-muted-foreground">
              {vibeBreakdown.length > 0
                ? `${vibeBreakdown[0]?.label} soul · ${personalityTraits[0]?.label || 'Curious explorer'}`
                : "Curious explorer"}
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
              Traveller since {user?.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear()}
            </p>
          </div>
        </div>

      <div className="p-4 space-y-5">

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
              <button 
                onClick={handleOpenInteractionDetails}
                className="text-[10px] text-muted-foreground ml-auto mr-2 hover:text-primary transition-colors underline decoration-dotted underline-offset-2"
              >
                Based on {totalInteractions} interaction{totalInteractions !== 1 ? 's' : ''}
              </button>
            )}
            <button
              onClick={() => setShowVibeCard(true)}
              className="p-1.5 rounded-full hover:bg-muted transition-colors ml-auto"
              title="Share your Vibe"
            >
              <Share2 className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
            </button>
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
              {vibeBreakdown.map((vibe, index) => {
                const vibeDescriptions: Record<string, string> = {
                  'Chill': 'Quiet cafes, peaceful spots, cozy corners',
                  'Aesthetic': 'Scenic views, Insta-worthy, artsy spaces',
                  'Social': 'Group hangouts, lively bars, nightlife',
                  'Foodie': 'Great food spots, street food, fine dining',
                  'Adventure': 'Hidden gems, outdoor spots, off-the-beaten-path',
                };
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs">
                    <span className="text-foreground font-medium">{vibe.label}</span>
                      <span className="text-muted-foreground flex-shrink-0 ml-2">{vibe.percentage}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${vibe.color} rounded-full transition-all duration-500`}
                        style={{ width: `${vibe.percentage}%`, animationDelay: `${index * 100}ms` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Personality Traits */}
        <section className="space-y-3 opacity-0 animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">What we've learned</h3>
            </div>
            {hiddenTraits.size > 0 && (
              <button
                onClick={() => setHiddenTraits(new Set())}
                className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Undo ({hiddenTraits.size})
              </button>
            )}
          </div>
          
          {isVibeLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : visibleTraits.length === 0 && hiddenTraits.size === 0 ? (
            <div className="p-4 bg-card rounded-xl border border-border text-center">
              <p className="text-sm text-muted-foreground">
                Start saving and exploring places to discover your personality traits!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleTraits.map((trait, index) => {
                const Icon = trait.icon;
                return (
                  <button 
                    key={index}
                    onClick={() => setSelectedTrait(trait)}
                    className="flex gap-3 p-3 bg-card rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group w-full text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground">{trait.label}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{trait.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground self-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}

              {/* Custom vibes */}
              {customVibes.map((vibe, index) => (
                <button
                  key={`custom-${index}`}
                  onClick={() => setSelectedTrait({ icon: Sparkles, label: vibe.label, description: vibe.description, score: 0 })}
                  className="flex gap-3 p-3 bg-card rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group w-full text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground">{vibe.label}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{vibe.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground self-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}

              {/* Add your own vibe */}
              {isAddingVibe ? (
                <div className="p-3 bg-card rounded-xl border border-primary/30 space-y-2">
                  <input
                    autoFocus
                    placeholder="Vibe name (e.g. Rooftop lover)"
                    value={newVibeLabel}
                    onChange={(e) => setNewVibeLabel(e.target.value)}
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    placeholder="Short description"
                    value={newVibeDescription}
                    onChange={(e) => setNewVibeDescription(e.target.value)}
                    className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setIsAddingVibe(false); setNewVibeLabel(""); setNewVibeDescription(""); }}
                      className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (newVibeLabel.trim()) {
                          setCustomVibes(prev => [...prev, { label: newVibeLabel.trim(), description: newVibeDescription.trim() || `You identify as a ${newVibeLabel.trim().toLowerCase()}` }]);
                          setNewVibeLabel(""); setNewVibeDescription(""); setIsAddingVibe(false);
                          toast({ title: `"${newVibeLabel.trim()}" added!` });
                        }
                      }}
                      disabled={!newVibeLabel.trim()}
                      className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingVibe(true)}
                  className="flex gap-3 p-3 bg-card/50 rounded-xl border border-dashed border-border hover:border-primary/30 hover:bg-primary/5 transition-all group w-full text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-lg text-muted-foreground">+</span>
                  </div>
                  <div className="flex-1 min-w-0 self-center">
                    <h4 className="text-sm font-medium text-muted-foreground">Add your own vibe</h4>
                  </div>
                </button>
              )}
            </div>
          )}
        </section>

        {/* Character Match */}
        <section className="bg-card rounded-xl p-4 border border-border shadow-soft space-y-3 opacity-0 animate-fade-up" style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">
              {characterMatch ? "With this travel style, you remind us of..." : "Your Character Match"}
            </h3>
          </div>

          {characterMatch ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="text-3xl">{characterMatch.emoji}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-foreground">{characterMatch.character_name}</h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {characterMatch.match_percentage}% match
                    </span>
                  </div>
                  <p className="text-[11px] text-primary/80 font-medium">{characterMatch.known_for}</p>
                  <p className="text-[10px] text-muted-foreground">{characterMatch.source}</p>
                  <p className="text-sm text-foreground mt-1.5">{characterMatch.match_reason}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleTryAnother}
                  disabled={isLoadingCharacter}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingCharacter ? 'animate-spin' : ''}`} />
                  Try another match
                </button>
              </div>

              {/* Explore CTA for Character Match */}
              <button
                onClick={() => navigate(`/?search=${encodeURIComponent(`explore spots ${characterMatch.character_name} would love`)}`)}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary/10 hover:bg-primary/15 transition-colors group"
              >
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-primary truncate">
                  Explore spots {characterMatch.character_name} would love
                </span>
                <ChevronRight className="w-4 h-4 text-primary/60 ml-auto flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          ) : (
            <div className="text-center py-3">
              <p className="text-sm text-muted-foreground mb-3">
                Discover which famous character matches your vibe
              </p>
              <button
                onClick={() => fetchCharacterMatch()}
                disabled={isLoadingCharacter}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isLoadingCharacter ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                Find my match
              </button>
            </div>
          )}
        </section>

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
          <SheetTitle className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              Mood Search History
            </div>
            {searchHistory.length > 0 && (
              <button
                onClick={async () => {
                  if (!user) return;
                  await supabase.from('searches').delete().eq('user_id', user.id);
                  await supabase.from('place_interactions').delete().eq('user_id', user.id);
                  setSearchHistory([]);
                  refreshVibeDNA();
                  toast({ title: "Search history cleared", description: "Your mood searches and interaction data have been reset." });
                }}
                className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Clear all
              </button>
            )}
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

    {/* Interaction Details Sheet */}
    <Sheet open={showInteractionDetails} onOpenChange={setShowInteractionDetails}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            Your Interactions
            <span className="text-xs text-muted-foreground font-normal ml-auto">
              {interactionDetails.length} total
            </span>
          </SheetTitle>
        </SheetHeader>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          These are the places you've clicked and saved — they shape your Vibe DNA.
        </p>
        <div className="overflow-y-auto space-y-2 pr-1" style={{ maxHeight: 'calc(70vh - 120px)' }}>
          {isLoadingInteractions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : interactionDetails.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No interactions yet</p>
          ) : (
            interactionDetails.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  item.action === 'save' ? 'bg-rose-500/10' : 'bg-primary/10'
                }`}>
                  {item.action === 'save' ? (
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      item.action === 'save' 
                        ? 'bg-rose-500/10 text-rose-500' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {item.action === 'save' ? `Saved (×${item.weight})` : `Viewed (×${item.weight})`}
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

    <VibeShareCard
      open={showVibeCard}
      onClose={() => setShowVibeCard(false)}
      vibeBreakdown={vibeBreakdown}
      personalityTraits={personalityTraits}
      userName={user?.email?.split("@")[0]}
      characterMatch={characterMatch}
    />

    <PersonalityTraitModal
      trait={selectedTrait}
      onClose={() => setSelectedTrait(null)}
      onExplore={(trait) => {
        setSelectedTrait(null);
        navigate(`/?search=${encodeURIComponent(`best spots for a ${trait.label.toLowerCase()}`)}`);
      }}
      onReset={handleResetTrait}
      isResetting={isResettingTrait}
    />

    {/* Cover Picker Sheet */}
    <Sheet open={showCoverPicker} onOpenChange={setShowCoverPicker}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[60vh]">
        <SheetHeader>
          <SheetTitle>Choose cover photo</SheetTitle>
        </SheetHeader>
        <div className="mt-4 overflow-y-auto max-h-[calc(60vh-80px)] pb-20">
          <div className="grid grid-cols-3 gap-2">
            {PRESET_COVERS.map((cover) => (
              <button
                key={cover.label}
                onClick={async () => {
                  setCoverUrl(cover.src);
                  setShowCoverPicker(false);
                  if (user) {
                    await (supabase.from("profiles") as any)
                      .update({ cover_url: cover.label })
                      .eq("id", user.id);
                  }
                  toast({ title: "Cover updated!" });
                }}
                className="relative rounded-lg overflow-hidden aspect-[3/2] group border border-border hover:border-primary/50 transition-all"
              >
                <img src={cover.src} alt={cover.label} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute bottom-1 left-1.5 text-[10px] font-medium text-white/90">
                  {cover.label}
                </span>
              </button>
            ))}

            {/* Upload your own */}
            <button
              onClick={() => {
                setShowCoverPicker(false);
                setTimeout(() => coverInputRef.current?.click(), 200);
              }}
              className="relative rounded-lg overflow-hidden aspect-[3/2] border-2 border-dashed border-border hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Upload className="w-4 h-4" />
              <span className="text-[10px] font-medium">Upload yours</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    </>

  );
};

export default ProfilePage;
