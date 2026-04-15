import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, TrendingUp, Loader2, Settings, ChevronRight, RotateCcw } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useVibeDNA } from "@/hooks/useVibeDNA";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import LoginReminderBanner from "./LoginReminderBanner";
import VibeShareCard from "./VibeShareCard";
import PersonalityTraitModal from "./PersonalityTraitModal";
import { toast } from "@/hooks/use-toast";
import defaultCover from "@/assets/default-cover.jpg";
import coverBeach from "@/assets/covers/cover-beach.jpg";
import coverMountains from "@/assets/covers/cover-mountains.jpg";
import coverCity from "@/assets/covers/cover-city.jpg";
import coverDesert from "@/assets/covers/cover-desert.jpg";
import coverTemple from "@/assets/covers/cover-temple.jpg";

// Sub-components
import ProfileHero from "./profile/ProfileHero";
import ProfileStats from "./profile/ProfileStats";
import VibeDNASection from "./profile/VibeDNASection";
import CharacterMatchSection from "./profile/CharacterMatchSection";
import type { CharacterMatch } from "./profile/CharacterMatchSection";
import HistorySheets from "./profile/HistorySheets";
import CoverPickerSheet from "./profile/CoverPickerSheet";

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

interface SearchHistoryItem { id: string; prompt: string; created_at: string; }
interface PlaceHistoryItem { place_id: string; name: string; action: string; created_at: string; }

const ProfilePage = ({ onNavigateToSaved }: ProfilePageProps) => {
  const navigate = useNavigate();
  const { savedPlaceIds, userVibes } = useApp();
  const { user } = useAuth();
  const { vibeBreakdown, personalityTraits, isLoading: isVibeLoading, totalInteractions, searchCount, placesShownCount, refresh: refreshVibeDNA } = useVibeDNA();

  // State
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [showPlacesHistory, setShowPlacesHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [placesHistory, setPlacesHistory] = useState<PlaceHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
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
  const [sweetSpotsId, setSweetSpotsId] = useState<string | null>(null);
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
      const { PERSONALITY_DEFINITIONS } = await import("@/hooks/useVibeDNA");
      const definition = PERSONALITY_DEFINITIONS.find(d => d.label === trait.label);
      if (!definition) {
        setHiddenTraits(prev => new Set(prev).add(trait.label));
        toast({ title: `"${trait.label}" removed` });
        setSelectedTrait(null);
        setIsResettingTrait(false);
        return;
      }
      const triggerTags = definition.triggers.tags || [];
      const triggerCategories = definition.triggers.categories || [];
      const { data: interactions } = await supabase.from('place_interactions').select('id, place_id').eq('user_id', user.id);
      if (interactions && interactions.length > 0) {
        const placeIds = [...new Set(interactions.map(i => i.place_id))];
        const { data: places } = await supabase.from('places').select('place_id, filter_tags, categories').in('place_id', placeIds);
        const matchingPlaceIds = new Set<string>();
        places?.forEach(place => {
          const tags = (place.filter_tags || []).map((t: string) => t.toLowerCase().replace(/-/g, '_'));
          const cats = (place.categories || []).map((c: string) => c.toLowerCase().replace(/-/g, '_'));
          if (tags.some((t: string) => triggerTags.some(tt => t.includes(tt) || tt.includes(t))) ||
              cats.some((c: string) => triggerCategories.some(tc => c.includes(tc) || tc.includes(c)))) {
            matchingPlaceIds.add(place.place_id);
          }
        });
        const idsToDelete = interactions.filter(i => matchingPlaceIds.has(i.place_id)).map(i => i.id);
        if (idsToDelete.length > 0) {
          const { error } = await supabase.from('place_interactions').delete().in('id', idsToDelete);
          if (error) throw error;
        }
      }
      const searchKeywords = [...triggerTags, ...triggerCategories].map(k => k.replace(/_/g, ' '));
      if (searchKeywords.length > 0) {
        const { data: searches } = await supabase.from('searches').select('id, prompt').eq('user_id', user.id);
        const searchIdsToDelete = searches?.filter(s => searchKeywords.some(kw => s.prompt.toLowerCase().includes(kw))).map(s => s.id) || [];
        if (searchIdsToDelete.length > 0) await supabase.from('searches').delete().in('id', searchIdsToDelete);
      }
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
    if (characterPool.length < 3) fetchCharacterMatch(characterPool);
    else {
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
      const { data } = await supabase.from("place_interactions").select("place_id, action, created_at, weight").eq("user_id", user.id).order("created_at", { ascending: false });
      if (data && data.length > 0) {
        const placeIds = [...new Set(data.map(d => d.place_id))];
        const { data: places } = await supabase.from("places").select("place_id, name").in("place_id", placeIds);
        const nameMap = new Map(places?.map(p => [p.place_id, p.name]) || []);
        setInteractionDetails(data.map(d => ({ ...d, name: nameMap.get(d.place_id) || d.place_id, weight: d.weight || 1 })));
      } else setInteractionDetails([]);
    } catch (err) { console.error("Failed to load interactions:", err); }
    finally { setIsLoadingInteractions(false); }
  };

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data } = await (supabase.from("profiles") as any).select("avatar_url, username, cover_url, sweetspots_id").eq("id", user.id).single();
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      if (data?.username) setUsername(data.username);
      if (data?.sweetspots_id) setSweetSpotsId(data.sweetspots_id);
      if (data?.cover_url) setCoverUrl(PRESET_COVER_MAP[data.cover_url] || data.cover_url);
    };
    loadProfile();
  }, [user]);

  const loadSearchHistory = async () => {
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase.from("searches").select("id, prompt, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      if (!error && data) setSearchHistory(data);
    } catch (e) { console.error("Error loading search history:", e); }
    finally { setIsLoadingHistory(false); }
  };

  const loadPlacesHistory = async () => {
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase.from("place_interactions").select("place_id, action, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      if (!error && data) {
        const seen = new Set<string>(); const unique: typeof data = [];
        for (const item of data) { if (!seen.has(item.place_id)) { seen.add(item.place_id); unique.push(item); } }
        const placeIds = unique.map(i => i.place_id);
        const { data: places } = await supabase.from("places").select("place_id, name").in("place_id", placeIds);
        const nameMap = new Map(places?.map(p => [p.place_id, p.name]) || []);
        setPlacesHistory(unique.map(i => ({ ...i, name: nameMap.get(i.place_id) || i.place_id })));
      }
    } catch (e) { console.error("Error loading places history:", e); }
    finally { setIsLoadingHistory(false); }
  };

  const totalSaved = savedPlaceIds.size;

  return (
    <>
      <div className="min-h-screen bg-background pb-20 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
            <ChevronRight className="w-5 h-5 rotate-180 text-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">Profile</h1>
          <button onClick={() => navigate("/settings")} className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <LoginReminderBanner />

        <ProfileHero
          user={user}
          username={username}
          sweetSpotsId={sweetSpotsId}
          avatarUrl={avatarUrl}
          coverUrl={coverUrl}
          defaultCover={defaultCover}
          vibeBreakdown={vibeBreakdown}
          personalityTraits={personalityTraits}
          onAvatarChange={setAvatarUrl}
          onCoverEdit={() => setShowCoverPicker(true)}
          onUsernameChange={setUsername}
          onCopyId={() => {
            if (sweetSpotsId) {
              navigator.clipboard.writeText(sweetSpotsId);
              toast({ title: "Copied!", description: `${sweetSpotsId} copied to clipboard` });
            }
          }}
          isUploadingCover={isUploadingCover}
        />

        <div className="p-4 space-y-5">
          <ProfileStats
            totalSaved={totalSaved}
            placesShownCount={placesShownCount}
            searchCount={searchCount}
            onNavigateToSaved={onNavigateToSaved}
            onOpenPlacesHistory={() => { setShowPlacesHistory(true); loadPlacesHistory(); }}
            onOpenSearchHistory={() => { setShowSearchHistory(true); loadSearchHistory(); }}
          />

          <VibeDNASection
            vibeBreakdown={vibeBreakdown}
            totalInteractions={totalInteractions}
            isLoading={isVibeLoading}
            onOpenInteractionDetails={handleOpenInteractionDetails}
            onShareVibe={() => setShowVibeCard(true)}
          />

          {/* Personality Traits */}
          <section className="space-y-3 opacity-0 animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">What we've learned</h3>
              </div>
              {hiddenTraits.size > 0 && (
                <button onClick={() => setHiddenTraits(new Set())} className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> Undo ({hiddenTraits.size})
                </button>
              )}
            </div>

            {isVibeLoading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
            ) : visibleTraits.length === 0 && hiddenTraits.size === 0 ? (
              <div className="p-4 bg-card rounded-xl border border-border text-center">
                <p className="text-sm text-muted-foreground">Start saving and exploring places to discover your personality traits!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {visibleTraits.map((trait, index) => {
                  const Icon = trait.icon;
                  return (
                    <button key={index} onClick={() => setSelectedTrait(trait)} className="flex gap-3 p-3 bg-card rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group w-full text-left">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0"><Icon className="w-5 h-5 text-secondary-foreground" /></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-foreground">{trait.label}</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{trait.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground self-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
                {customVibes.map((vibe, index) => (
                  <button key={`custom-${index}`} onClick={() => setSelectedTrait({ icon: Sparkles, label: vibe.label, description: vibe.description, score: 0 })} className="flex gap-3 p-3 bg-card rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group w-full text-left">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0"><Sparkles className="w-5 h-5 text-secondary-foreground" /></div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground">{vibe.label}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{vibe.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground self-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
                {isAddingVibe ? (
                  <div className="p-3 bg-card rounded-xl border border-primary/30 space-y-2">
                    <input autoFocus placeholder="Vibe name (e.g. Rooftop lover)" value={newVibeLabel} onChange={(e) => setNewVibeLabel(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
                    <input placeholder="Short description" value={newVibeDescription} onChange={(e) => setNewVibeDescription(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary" />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setIsAddingVibe(false); setNewVibeLabel(""); setNewVibeDescription(""); }} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
                      <button onClick={() => { if (newVibeLabel.trim()) { setCustomVibes(prev => [...prev, { label: newVibeLabel.trim(), description: newVibeDescription.trim() || `You identify as a ${newVibeLabel.trim().toLowerCase()}` }]); setNewVibeLabel(""); setNewVibeDescription(""); setIsAddingVibe(false); toast({ title: `"${newVibeLabel.trim()}" added!` }); } }} disabled={!newVibeLabel.trim()} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-colors">Add</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setIsAddingVibe(true)} className="flex gap-3 p-3 bg-card/50 rounded-xl border border-dashed border-border hover:border-primary/30 hover:bg-primary/5 transition-all group w-full text-left">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0"><span className="text-lg text-muted-foreground">+</span></div>
                    <div className="flex-1 min-w-0 self-center"><h4 className="text-sm font-medium text-muted-foreground">Add your own vibe</h4></div>
                  </button>
                )}
              </div>
            )}
          </section>

          <CharacterMatchSection
            characterMatch={characterMatch}
            isLoading={isLoadingCharacter}
            onFindMatch={() => fetchCharacterMatch()}
            onTryAnother={handleTryAnother}
          />

          {/* Current mood preferences */}
          <section className="bg-warm-cream rounded-xl p-4 space-y-2 opacity-0 animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
            <h3 className="font-semibold text-foreground text-sm">Current mood preferences</h3>
            <div className="flex flex-wrap gap-1.5">
              {userVibes.map((vibe, index) => (
                <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-full bg-background text-foreground text-xs font-medium border border-border">{vibe}</span>
              ))}
            </div>
          </section>
        </div>
      </div>

      <HistorySheets
        showSearchHistory={showSearchHistory}
        onSearchHistoryChange={setShowSearchHistory}
        searchHistory={searchHistory}
        showPlacesHistory={showPlacesHistory}
        onPlacesHistoryChange={setShowPlacesHistory}
        placesHistory={placesHistory}
        showInteractionDetails={showInteractionDetails}
        onInteractionDetailsChange={setShowInteractionDetails}
        interactionDetails={interactionDetails}
        isLoadingHistory={isLoadingHistory}
        isLoadingInteractions={isLoadingInteractions}
        onClearSearchHistory={async () => {
          if (!user) return;
          await supabase.from('searches').delete().eq('user_id', user.id);
          await supabase.from('place_interactions').delete().eq('user_id', user.id);
          setSearchHistory([]);
          refreshVibeDNA();
          toast({ title: "Search history cleared", description: "Your mood searches and interaction data have been reset." });
        }}
      />

      <VibeShareCard
        open={showVibeCard}
        onClose={() => setShowVibeCard(false)}
        vibeBreakdown={vibeBreakdown}
        personalityTraits={personalityTraits}
        userName={username}
        characterMatch={characterMatch}
      />

      <PersonalityTraitModal
        trait={selectedTrait}
        onClose={() => setSelectedTrait(null)}
        onExplore={(trait) => { setSelectedTrait(null); navigate(`/?search=${encodeURIComponent(`best spots for a ${trait.label.toLowerCase()}`)}`); }}
        onReset={handleResetTrait}
        isResetting={isResettingTrait}
      />

      <CoverPickerSheet
        open={showCoverPicker}
        onOpenChange={setShowCoverPicker}
        presetCovers={PRESET_COVERS}
        userId={user?.id}
        onCoverChange={setCoverUrl}
        isUploading={isUploadingCover}
        onUploadStart={() => setIsUploadingCover(true)}
        onUploadEnd={() => setIsUploadingCover(false)}
      />
    </>
  );
};

export default ProfilePage;
