import { useState, useRef, useEffect } from "react";
import { Menu, Bell, Send, X, Clock, Users, Sparkles, ChevronRight, Loader2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import AppHeader from "./AppHeader";

// ── Template data ──
const templates = [
  { id: "1", title: "Weekend Foodie Escape", desc: "Explore the best local eats and hidden cafes", duration: "2 days", tag: "Foodie" },
  { id: "2", title: "Chill Beach Getaway", desc: "Slow mornings, sunset walks, no rushing", duration: "3 days", tag: "Chill" },
  { id: "3", title: "Nightlife Adventure", desc: "Rooftop bars, live music, late-night bites", duration: "2 days", tag: "Nightlife" },
  { id: "4", title: "Culture & History Deep Dive", desc: "Museums, galleries, and walking tours", duration: "4 days", tag: "Culture" },
];

// ── Notification data (mock) ──
const notifications = [
  { id: "1", text: "Razak invited you to plan a trip", time: "2h ago" },
  { id: "2", text: "You've been invited to a Melbourne trip", time: "5h ago" },
  { id: "3", text: "Zach suggested new spots", time: "1d ago" },
];

interface ChatHomeProps {
  onNavigateToProfile: () => void;
}

const ChatHome = ({ onNavigateToProfile }: ChatHomeProps) => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [leftPanel, setLeftPanel] = useState(false);
  const [rightPanel, setRightPanel] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const openLeft = () => { setRightPanel(false); setLeftPanel(true); };
  const openRight = () => { setLeftPanel(false); setRightPanel(true); };
  const closeAll = () => { setLeftPanel(false); setRightPanel(false); };

  const handleSubmit = () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    // Store the prompt and navigate to trip tab with generation state
    sessionStorage.setItem("sweetspots_chat_prompt", prompt.trim());
    setTimeout(() => {
      setIsGenerating(false);
      setPrompt("");
      // Navigate to trip/itinerary tab
      navigate("/", { state: { openTrip: true } });
    }, 600);
  };

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

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32 lg:pb-24">
        {isGenerating ? (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-lg font-medium text-foreground">Generating your itinerary...</p>
          </div>
        ) : (
          <div className="w-full max-w-lg flex flex-col items-center gap-8 animate-fade-in">
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
          </div>
        )}
      </div>

      {/* ── Input Bar (fixed bottom) ── */}
      {!isGenerating && (
        <div className="fixed bottom-20 lg:bottom-6 left-0 right-0 z-30 px-4">
          <div className="max-w-lg mx-auto">
            <div className="flex items-end gap-2 bg-card border border-border rounded-2xl px-4 py-3 shadow-lg">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. 3 days in Melbourne, chill cafes, good food, no rushing"
                className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[20px] max-h-[120px]"
                rows={1}
              />
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim()}
                className={cn(
                  "shrink-0 p-2 rounded-xl transition-all",
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
