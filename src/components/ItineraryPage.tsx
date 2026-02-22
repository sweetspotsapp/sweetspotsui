import { useState, useEffect } from "react";
import { Plus, CalendarDays, MapPin, Trash2, Copy, Pencil, ChevronRight, Settings } from "lucide-react";
import LoginReminderBanner from "./LoginReminderBanner";
import ProfileSlideMenu from "./ProfileSlideMenu";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import CreateItineraryModal from "./itinerary/CreateItineraryModal";
import ItineraryView from "./itinerary/ItineraryView";
import { useItinerary, type ItineraryData, type TripParams, type SavedItinerary } from "@/hooks/useItinerary";
import { useAuth } from "@/hooks/useAuth";

type Phase = "list" | "view";

interface ItineraryPageProps {
  resumeItineraryId?: string | null;
  onResumed?: () => void;
}

const ItineraryPage = ({ resumeItineraryId, onResumed }: ItineraryPageProps) => {
  const { user } = useAuth();
  const {
    generate, swap, isGenerating, isSwapping,
    savedItineraries, isLoading,
    saveItinerary, deleteItinerary,
  } = useItinerary();

  const [phase, setPhase] = useState<Phase>("list");
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null);
  const [tripParams, setTripParams] = useState<TripParams | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prefillParams, setPrefillParams] = useState<TripParams | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Resume a specific itinerary when returning from place details
  useEffect(() => {
    if (resumeItineraryId && savedItineraries.length > 0 && !isLoading) {
      const found = savedItineraries.find(it => it.id === resumeItineraryId);
      if (found && found.itinerary_data) {
        handleViewItinerary(found);
      }
      onResumed?.();
    }
  }, [resumeItineraryId, savedItineraries, isLoading]);

  // Store current editing ID so ActivityCard can reference it for back-navigation
  useEffect(() => {
    if (phase === "view" && editingId) {
      sessionStorage.setItem('sweetspots_resume_itinerary', editingId);
    }
  }, [phase, editingId]);

  const handleNewItinerary = () => {
    setEditingId(null);
    setPrefillParams(null);
    setItinerary(null);
    setTripParams(null);
    setShowCreateModal(true);
  };

  const handleViewItinerary = (saved: SavedItinerary) => {
    if (saved.itinerary_data) {
      setItinerary(saved.itinerary_data);
      setTripParams({
        name: saved.name || undefined,
        destination: saved.destination,
        startDate: saved.start_date,
        endDate: saved.end_date,
        budget: saved.budget,
        groupSize: saved.group_size,
        vibes: saved.vibes || [],
        mustIncludePlaceIds: saved.must_include_place_ids || [],
        boardIds: saved.board_ids || [],
        accommodations: saved.accommodation || undefined,
        flightDetails: saved.flight_details || undefined,
      });
      setEditingId(saved.id);
      setPhase("view");
    }
  };

  const handleEditItinerary = (saved: SavedItinerary) => {
    setPrefillParams({
      name: saved.name || undefined,
      destination: saved.destination,
      startDate: saved.start_date,
      endDate: saved.end_date,
      budget: saved.budget,
      groupSize: saved.group_size,
      vibes: saved.vibes || [],
      mustIncludePlaceIds: saved.must_include_place_ids || [],
      boardIds: saved.board_ids || [],
      accommodations: saved.accommodation || undefined,
      flightDetails: saved.flight_details || undefined,
    });
    setEditingId(saved.id);
    setItinerary(saved.itinerary_data);
    setShowCreateModal(true);
  };

  const handleDuplicate = (saved: SavedItinerary) => {
    setPrefillParams({
      name: saved.name ? `${saved.name} (copy)` : undefined,
      destination: saved.destination,
      startDate: saved.start_date,
      endDate: saved.end_date,
      budget: saved.budget,
      groupSize: saved.group_size,
      vibes: saved.vibes || [],
      mustIncludePlaceIds: saved.must_include_place_ids || [],
      boardIds: saved.board_ids || [],
      accommodations: saved.accommodation || undefined,
      flightDetails: saved.flight_details || undefined,
    });
    setEditingId(null);
    setItinerary(null);
    setShowCreateModal(true);
  };

  const handleGenerate = async (params: TripParams) => {
    setTripParams(params);
    setShowCreateModal(false);
    const result = await generate(params);
    if (result) {
      setItinerary(result);
      const id = await saveItinerary(params, result, editingId || undefined);
      if (id) setEditingId(id);
      setPhase("view");
    }
  };

  const handleCreateOwn = () => {
    setShowCreateModal(false);
    // Navigate to saved page — placeholder for now
  };

  const handleSave = async () => {
    if (itinerary && tripParams) {
      const id = await saveItinerary(tripParams, itinerary, editingId || undefined);
      if (id) setEditingId(id);
    }
  };

  const handleSwap = async (dayIndex: number, slotIndex: number, activityIndex: number) => {
    if (!itinerary || !tripParams) return;
    const day = itinerary.days[dayIndex];
    const slot = day.slots[slotIndex];
    const activity = slot.activities[activityIndex];
    return await swap({
      destination: tripParams.destination,
      vibes: tripParams.vibes,
      budget: tripParams.budget,
      dayLabel: day.label,
      timeSlot: slot.time,
      currentActivity: activity.name,
      category: activity.category,
    });
  };

  const handleReorder = (dayIndex: number, slotIndex: number, fromIdx: number, toIdx: number) => {
    if (!itinerary) return;
    const updated = { ...itinerary };
    const activities = [...updated.days[dayIndex].slots[slotIndex].activities];
    const [moved] = activities.splice(fromIdx, 1);
    activities.splice(toIdx, 0, moved);
    updated.days[dayIndex].slots[slotIndex].activities = activities;
    setItinerary(updated);
  };

  const handleReplaceActivity = (dayIndex: number, slotIndex: number, activityIndex: number, newActivity: { name: string; description: string; category: string }) => {
    if (!itinerary) return;
    const updated = { ...itinerary };
    const act = updated.days[dayIndex].slots[slotIndex].activities[activityIndex];
    updated.days[dayIndex].slots[slotIndex].activities[activityIndex] = { ...act, ...newActivity };
    setItinerary(updated);
  };

  const handleBackToList = () => {
    setPhase("list");
    setEditingId(null);
    setPrefillParams(null);
  };

  return (
    <>
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/40 lg:hidden">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="w-10" />
          <h1 className="text-xl font-bold text-foreground tracking-tight">SweetSpots</h1>
          <button 
            onClick={() => setIsProfileMenuOpen(true)}
            className="p-2 -mr-2 text-foreground hover:text-primary transition-colors"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto lg:max-w-4xl">
        <LoginReminderBanner />
      </div>

      {phase === "list" && (
        <ItineraryList
          itineraries={savedItineraries}
          isLoading={isLoading}
          onView={handleViewItinerary}
          onEdit={handleEditItinerary}
          onDuplicate={handleDuplicate}
          onDelete={deleteItinerary}
          onCreateNew={handleNewItinerary}
        />
      )}

      {phase === "view" && itinerary && (
        <ItineraryView
          itinerary={itinerary}
          tripParams={tripParams}
          onBack={handleBackToList}
          onSwap={handleSwap}
          onReorder={handleReorder}
          onReplace={handleReplaceActivity}
          isSwapping={isSwapping}
          isGenerating={isGenerating}
          onRegenerate={() => tripParams && handleGenerate(tripParams)}
          onSave={handleSave}
          onEdit={() => { setPrefillParams(tripParams); setShowCreateModal(true); }}
        />
      )}
    </div>

    {/* Create Itinerary Modal */}
    <CreateItineraryModal
      isOpen={showCreateModal}
      onClose={() => setShowCreateModal(false)}
      onGenerate={handleGenerate}
      onCreateOwn={handleCreateOwn}
      isGenerating={isGenerating}
      initialParams={prefillParams}
    />

    <ProfileSlideMenu 
      isOpen={isProfileMenuOpen} 
      onClose={() => setIsProfileMenuOpen(false)}
    />
    </>
  );
};

// ─── Itinerary List Component ─────────────────────────────────
interface ItineraryListProps {
  itineraries: SavedItinerary[];
  isLoading: boolean;
  onView: (it: SavedItinerary) => void;
  onEdit: (it: SavedItinerary) => void;
  onDuplicate: (it: SavedItinerary) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
}

const ItineraryList = ({ itineraries, isLoading, onView, onEdit, onDuplicate, onDelete, onCreateNew }: ItineraryListProps) => {
  if (isLoading) {
    return (
      <div className="max-w-md mx-auto lg:max-w-4xl px-4 py-12 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (itineraries.length === 0) {
    return (
      <div className="max-w-md mx-auto lg:max-w-4xl px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CalendarDays className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">No itineraries yet</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Plan your perfect trip with AI-powered itineraries
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Your First Itinerary
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto lg:max-w-4xl px-4 py-4 space-y-3">
      <button
        onClick={onCreateNew}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border-2 border-dashed border-primary/30 text-primary font-medium hover:bg-primary/5 transition-colors"
      >
        <Plus className="w-5 h-5" />
        New Itinerary
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {itineraries.map((it, i) => {
          const startDate = it.start_date ? format(parseISO(it.start_date), "MMM d") : "";
          const endDate = it.end_date ? format(parseISO(it.end_date), "MMM d, yyyy") : "";
          const totalActivities = it.itinerary_data?.days?.reduce(
            (acc, d) => acc + d.slots.reduce((a, s) => a + s.activities.length, 0), 0
          ) || 0;

          return (
            <div
              key={it.id}
              className="rounded-2xl bg-card border border-border overflow-hidden opacity-0 animate-fade-up"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "forwards" }}
            >
              <button
                onClick={() => it.itinerary_data ? onView(it) : onEdit(it)}
                className="w-full text-left px-4 py-3.5 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{it.name || it.destination}</h3>
                    {it.name && <p className="text-xs text-muted-foreground truncate">{it.destination}</p>}
                    <p className="text-xs text-muted-foreground">{startDate} – {endDate}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {it.vibes?.slice(0, 3).map(v => (
                        <span key={v} className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{v}</span>
                      ))}
                      {totalActivities > 0 && (
                        <span className="text-[10px] text-muted-foreground">· {totalActivities} activities</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </button>
              <div className="flex items-center border-t border-border/50 divide-x divide-border/50">
                <button onClick={() => onEdit(it)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => onDuplicate(it)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
                <button onClick={() => onDelete(it.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-destructive hover:bg-destructive/5 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ItineraryPage;
