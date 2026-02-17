import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Sparkles, TrendingUp, Loader2, Settings, ChevronRight, Search, Eye, Heart, Clock, Camera, Share2, Wand2, RefreshCw, Pencil, Check, RotateCcw } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showVibeCard, setShowVibeCard] = useState(false);
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
          const tags = place.filter_tags || [];
          const cats = place.categories || [];
          const hasMatchingTag = tags.some((t: string) => triggerTags.includes(t));
          const hasMatchingCat = cats.some((c: string) => triggerCategories.some(tc => c.toLowerCase().includes(tc)));
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

  const totalSaved = savedPlaceIds.size;

  // Load avatar on mount
  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, username")
        .eq("id", user.id)
        .single();
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      if (data?.username) setUsername(data.username);
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
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-1.5">
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
                  className="bg-transparent border-b border-primary text-foreground font-semibold outline-none w-full max-w-[160px] text-sm"
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
                className="flex items-center gap-1.5 group"
              >
                <h2 className="font-semibold text-foreground truncate">{username}</h2>
                <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            )}
            <p className="text-sm text-muted-foreground">
              {vibeBreakdown.length > 0
                ? `${vibeBreakdown[0]?.label} soul · ${personalityTraits[0]?.label || 'Curious explorer'}`
                : "Finding your sweetspots since today"}
            </p>
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
              <span className="text-[10px] text-muted-foreground ml-auto mr-2">
                Based on {totalInteractions} interaction{totalInteractions !== 1 ? 's' : ''}
              </span>
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

          {/* Explore CTA for Vibe DNA */}
          {vibeBreakdown.length > 0 && (
            <button
              onClick={() => navigate(`/?search=${encodeURIComponent(`${vibeBreakdown[0].label} spots near me`)}`)}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary/10 hover:bg-primary/15 transition-colors group"
            >
              <Search className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium text-primary truncate">
                Explore {vibeBreakdown[0].label} spots near you
              </span>
              <ChevronRight className="w-4 h-4 text-primary/60 ml-auto flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
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
    </>
  );
};

export default ProfilePage;
