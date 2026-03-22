import { useState, useRef, useEffect, useCallback } from "react";
import { Menu, Bell, Send, X, Clock, Users, Sparkles, ChevronRight, Loader2, Settings, ArrowLeft, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTrip, type TripParams, type TripData } from "@/hooks/useTrip";
import { toast } from "sonner";
import TripView from "./trip/TripView";
import GeneratingOverlay from "./trip/GeneratingOverlay";
import ImportLinkDialog from "./saved/ImportLinkDialog";

// ── Template data (sidebar) ──
const templates = [
  { id: "1", title: "Weekend Foodie Escape", desc: "Explore the best local eats and hidden cafes", duration: "2 days", tag: "Foodie" },
  { id: "2", title: "Chill Beach Getaway", desc: "Slow mornings, sunset walks, no rushing", duration: "3 days", tag: "Chill" },
  { id: "3", title: "Nightlife Adventure", desc: "Rooftop bars, live music, late-night bites", duration: "2 days", tag: "Nightlife" },
  { id: "4", title: "Culture & History Deep Dive", desc: "Museums, galleries, and walking tours", duration: "4 days", tag: "Culture" },
];

// ── Quick-start cards (main screen) ──
const quickStartCards = [
  { id: "q1", country: "Japan", prompt: "5 days in Tokyo and Kyoto, street food, temples, cherry blossoms", duration: "5 days", tag: "Culture" },
  { id: "q2", country: "Italy", prompt: "4 days in Rome, pasta tastings, historic ruins, golden hour walks", duration: "4 days", tag: "Foodie" },
  { id: "q3", country: "Thailand", prompt: "3 days in Bangkok, night markets, rooftop bars, local street eats", duration: "3 days", tag: "Nightlife" },
  { id: "q4", country: "Australia", prompt: "3 days in Melbourne, chill cafes, laneways, brunch culture", duration: "3 days", tag: "Chill" },
  { id: "q5", country: "Portugal", prompt: "4 days in Lisbon, pasteis de nata, tram rides, Alfama sunsets", duration: "4 days", tag: "Culture" },
  { id: "q6", country: "South Korea", prompt: "3 days in Seoul, Korean BBQ, Bukchon village, Hongdae nightlife", duration: "3 days", tag: "Foodie" },
];

// ── Notification data (mock) ──
const notifications = [
  { id: "1", text: "Razak invited you to plan a trip", time: "2h ago" },
  { id: "2", text: "You've been invited to a Melbourne trip", time: "5h ago" },
  { id: "3", text: "Zach suggested new spots", time: "1d ago" },
];

interface ChatHomeProps {
  onNavigateToProfile: () => void;
  onTripGenerated?: (tripId: string) => void;
}

const ChatHome = ({ onNavigateToProfile, onTripGenerated }: ChatHomeProps) => {
  const navigate = useNavigate();
  const { generate, swap, saveTrip, isGenerating: tripGenerating, isSwapping } = useTrip();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMessage, setGeneratingMessage] = useState("Parsing your request...");
  const [leftPanel, setLeftPanel] = useState(false);
  const [rightPanel, setRightPanel] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Preview state
  const [previewTripData, setPreviewTripData] = useState<TripData | null>(null);
  const [previewTripParams, setPreviewTripParams] = useState<TripParams | null>(null);

  const openLeft = () => { setRightPanel(false); setLeftPanel(true); };
  const openRight = () => { setLeftPanel(false); setRightPanel(true); };
  const closeAll = () => { setLeftPanel(false); setRightPanel(false); };

  const generateFromPrompt = async (userPrompt: string) => {
    if (!userPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setGeneratingMessage("Parsing your request...");
    setPrompt("");

    try {
      const { data: parsed, error: parseError } = await supabase.functions.invoke("parse-trip-prompt", {
        body: { prompt: userPrompt },
      });

      if (parseError) throw parseError;
      if (parsed?.error) {
        toast.error(parsed.error);
        setIsGenerating(false);
        return;
      }

      const tripParams: TripParams = {
        name: parsed.name || undefined,
        destination: parsed.destination,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        budget: parsed.budget || "$$",
        groupSize: parsed.groupSize || 1,
        vibes: parsed.vibes || [],
        vibeDetails: parsed.vibeDetails || userPrompt,
        mustIncludePlaceIds: [],
        boardIds: [],
      };

      setGeneratingMessage("Generating your itinerary...");
      const tripData = await generate(tripParams);

      if (!tripData) {
        setIsGenerating(false);
        return;
      }

      const tripDataWithContext: TripData = {
        ...tripData,
        _meta: {
          ...(tripData._meta || {}),
          vibeDetails: tripParams.vibeDetails?.trim() || "",
        },
      };

      // Show preview instead of saving immediately
      setPreviewTripData(tripDataWithContext);
      setPreviewTripParams(tripParams);
      setIsGenerating(false);
    } catch (err) {
      console.error("Chat trip generation error:", err);
      toast.error("Something went wrong. Please try again.");
      setIsGenerating(false);
    }
  };

  const handleSubmit = () => generateFromPrompt(prompt.trim());

  const handleCardClick = (cardPrompt: string) => {
    generateFromPrompt(cardPrompt);
  };

  const handleSaveTrip = async () => {
    if (!previewTripData || !previewTripParams) return;
    const tripId = await saveTrip(previewTripParams, previewTripData);
    if (tripId && onTripGenerated) {
      onTripGenerated(tripId);
    }
    setPreviewTripData(null);
    setPreviewTripParams(null);
  };

  const handleBackFromPreview = () => {
    setPreviewTripData(null);
    setPreviewTripParams(null);
  };

  const handleSwap = async (dayIndex: number, slotIndex: number, activityIndex: number) => {
    if (!previewTripData || !previewTripParams) return;
    const day = previewTripData.days[dayIndex];
    const slot = day.slots[slotIndex];
    const activity = slot.activities[activityIndex];
    return await swap({
      destination: previewTripParams.destination,
      vibes: previewTripParams.vibes,
      vibeDetails: previewTripParams.vibeDetails,
      budget: previewTripParams.budget,
      dayLabel: day.label,
      timeSlot: slot.time,
      currentActivity: activity.name,
      category: activity.category,
    });
  };

  const handleReplaceActivity = (dayIndex: number, slotIndex: number, activityIndex: number, newActivity: { name: string; description: string; category: string }) => {
    if (!previewTripData) return;
    const updated = JSON.parse(JSON.stringify(previewTripData)) as TripData;
    const act = updated.days[dayIndex].slots[slotIndex].activities[activityIndex];
    updated.days[dayIndex].slots[slotIndex].activities[activityIndex] = { ...act, ...newActivity };
    setPreviewTripData(updated);
  };

  const handleRemoveActivity = (dayIdx: number, slotIdx: number, actIdx: number) => {
    if (!previewTripData) return;
    const updated = JSON.parse(JSON.stringify(previewTripData)) as TripData;
    updated.days[dayIdx].slots[slotIdx].activities.splice(actIdx, 1);
    setPreviewTripData(updated);
  };

  const handleAddActivity = (dayIdx: number, slotIdx: number, newActivity: { name: string; placeId?: string; category: string; description: string }) => {
    if (!previewTripData) return;
    const updated = JSON.parse(JSON.stringify(previewTripData)) as TripData;
    updated.days[dayIdx].slots[slotIdx].activities.push({
      name: newActivity.name,
      description: newActivity.description,
      category: newActivity.category,
      placeId: newActivity.placeId,
    } as any);
    setPreviewTripData(updated);
  };

  const handleDragReorder = useCallback((fromDayIdx: number, fromSlotIdx: number, fromActIdx: number, toDayIdx: number, toSlotIdx: number, toActIdx: number) => {
    if (!previewTripData) return;
    const updated = JSON.parse(JSON.stringify(previewTripData)) as TripData;
    const [activity] = updated.days[fromDayIdx].slots[fromSlotIdx].activities.splice(fromActIdx, 1);
    let adjustedIdx = toActIdx;
    if (fromDayIdx === toDayIdx && fromSlotIdx === toSlotIdx && fromActIdx < toActIdx) {
      adjustedIdx = Math.max(0, toActIdx - 1);
    }
    updated.days[toDayIdx].slots[toSlotIdx].activities.splice(adjustedIdx, 0, activity);
    setPreviewTripData(updated);
  }, [previewTripData]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [prompt]);

  // ── Preview mode: show TripView ──
  if (previewTripData) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <TripView
          tripData={previewTripData}
          tripParams={previewTripParams}
          onBack={handleBackFromPreview}
          onSwap={handleSwap}
          onReplace={handleReplaceActivity}
          onRemoveActivity={handleRemoveActivity}
          onAddActivity={handleAddActivity}
          onDragReorder={handleDragReorder}
          isSwapping={isSwapping}
          isGenerating={false}
          onRegenerate={() => previewTripParams && generateFromPrompt(previewTripParams.vibeDetails || previewTripParams.destination)}
          onSave={handleSaveTrip}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/40 lg:hidden">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3">
          <button onClick={openLeft} className="p-2 -ml-2 text-foreground hover:text-primary transition-colors" aria-label="Templates">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-primary tracking-tight" style={{ fontFamily: "'Inter', sans-serif" }}>
            SweetSpots
          </h1>
          <div className="flex items-center gap-1">
            <button onClick={openRight} className="p-2 text-foreground hover:text-primary transition-colors relative" aria-label="Notifications">
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
              )}
            </button>
            <button onClick={() => navigate("/settings")} className="p-2 -mr-2 text-foreground hover:text-primary transition-colors" aria-label="Settings">
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Desktop header actions ── */}
      <div className="hidden lg:flex fixed top-0 right-0 z-50 items-center gap-2 pr-8 h-16">
        <button onClick={openLeft} className="p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Templates">
          <Menu className="w-5 h-5" />
        </button>
        <button onClick={openRight} className="p-2 text-muted-foreground hover:text-foreground transition-colors relative" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          {notifications.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32 lg:pb-24">
        {isGenerating ? (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-lg font-medium text-foreground">{generatingMessage}</p>
          </div>
        ) : (
          <div className="w-full max-w-2xl flex flex-col items-center gap-8 animate-fade-in">
            {/* Headline */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                Plan your entire trip in seconds.
              </h2>
            </div>

            {/* Feature hints */}
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { icon: Clock, label: "Time & distance-aware" },
                { icon: Sparkles, label: "Built around your vibe" },
                { icon: Users, label: "Fully editable with friends" },
              ].map((hint) => (
                <div key={hint.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <hint.icon className="w-3.5 h-3.5" />
                  <span>{hint.label}</span>
                </div>
              ))}
            </div>

            {/* Quick-start trip cards */}
            <div className="w-full grid grid-cols-2 lg:grid-cols-3 gap-3">
              {quickStartCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(card.prompt)}
                  className="text-left bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all group"
                >
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">{card.country}</p>
                  <p className="text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {card.prompt}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{card.duration}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{card.tag}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Input Bar (fixed bottom) ── */}
      {!isGenerating && (
        <div className="fixed bottom-20 lg:bottom-6 left-0 right-0 z-30 px-4">
          <div className="max-w-lg mx-auto">
            <div className="flex items-end gap-2 bg-card border border-border rounded-2xl px-4 py-2.5 shadow-lg">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. 3 days in Melbourne, chill cafes, good food, no rushing"
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[20px] max-h-[120px] py-[5px] leading-5"
                rows={1}
              />
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim()}
                className={cn(
                  "shrink-0 p-2 rounded-xl transition-all mb-[1px]",
                  prompt.trim()
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Overlay backdrop ── */}
      {(leftPanel || rightPanel) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={closeAll} />
      )}

      {/* ── Left Panel: Templates ── */}
      <div
        className={cn(
          "fixed top-0 left-0 bottom-0 z-50 w-[300px] max-w-[85vw] bg-background border-r border-border shadow-xl transition-transform duration-300 ease-out flex flex-col",
          leftPanel ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Start with a plan</h3>
          <button onClick={closeAll} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {templates.map((t) => (
            <button
              key={t.id}
              className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all group"
              onClick={() => {
                setPrompt(`Plan a ${t.duration.toLowerCase()} ${t.tag.toLowerCase()} trip`);
                closeAll();
              }}
            >
              <div className="flex items-start justify-between mb-1.5">
                <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{t.title}</h4>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              </div>
              <p className="text-xs text-muted-foreground mb-2">{t.desc}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{t.duration}</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{t.tag}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-border">
          <Button variant="outline" className="w-full" disabled>
            Explore more
          </Button>
        </div>
      </div>

      {/* ── Right Panel: Notifications ── */}
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-[300px] max-w-[85vw] bg-background border-l border-border shadow-xl transition-transform duration-300 ease-out flex flex-col",
          rightPanel ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Activity</h3>
          <button onClick={closeAll} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No new activity</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <p className="text-sm text-foreground">{n.text}</p>
                <p className="text-[10px] text-muted-foreground">{n.time}</p>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="flex-1 h-8 text-xs">Accept</Button>
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">Decline</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHome;
