import { useState, useEffect, useCallback } from "react";
import { Plus, CalendarDays, MapPin, Trash2, Copy, Pencil, ChevronRight, Settings } from "lucide-react";
import LoginReminderBanner from "./LoginReminderBanner";
import ProfileSlideMenu from "./ProfileSlideMenu";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import CreateTripModal from "./trip/CreateTripModal";
import TripView from "./trip/TripView";
import GeneratingOverlay from "./trip/GeneratingOverlay";
import { useTrip, type TripData, type TripParams, type SavedTrip } from "@/hooks/useTrip";
import { useAuth } from "@/hooks/useAuth";

type Phase = "list" | "view";

interface TripPageProps {
  resumeTripId?: string | null;
  onResumed?: () => void;
}

const TripPage = ({ resumeTripId, onResumed }: TripPageProps) => {
  const { user } = useAuth();
  const {
    generate, swap, isGenerating, isSwapping,
    savedTrips, isLoading,
    saveTrip, deleteTrip,
  } = useTrip();

  const [phase, setPhase] = useState<Phase>("list");
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [tripParams, setTripParams] = useState<TripParams | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [prefillParams, setPrefillParams] = useState<TripParams | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Resume a specific trip when returning from place details
  useEffect(() => {
    if (resumeTripId && savedTrips.length > 0 && !isLoading) {
      const found = savedTrips.find(it => it.id === resumeTripId);
      if (found && found.trip_data) {
        handleViewTrip(found);
      }
      onResumed?.();
    }
  }, [resumeTripId, savedTrips, isLoading]);

  // Store current editing ID so ActivityCard can reference it for back-navigation
  useEffect(() => {
    if (phase === "view" && editingId) {
      sessionStorage.setItem('sweetspots_resume_trip', editingId);
    }
  }, [phase, editingId]);

  const handleNewTrip = () => {
    setEditingId(null);
    setPrefillParams(null);
    setTripData(null);
    setTripParams(null);
    setShowCreateModal(true);
  };

  const handleViewTrip = (saved: SavedTrip) => {
    if (saved.trip_data) {
      setTripData(saved.trip_data);
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

  const handleEditTrip = (saved: SavedTrip) => {
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
    setTripData(saved.trip_data);
    setShowCreateModal(true);
  };

  const handleDuplicate = (saved: SavedTrip) => {
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
    setTripData(null);
    setShowCreateModal(true);
  };

  const handleGenerate = async (params: TripParams) => {
    setTripParams(params);
    setShowCreateModal(false);
    const result = await generate(params);
    if (result) {
      setTripData(result);
      const id = await saveTrip(params, result, editingId || undefined);
      if (id) setEditingId(id);
      setPhase("view");
    }
  };

  const handleCreateOwn = () => {
    setShowCreateModal(false);
  };

  const handleSave = async () => {
    if (tripData && tripParams) {
      const id = await saveTrip(tripParams, tripData, editingId || undefined);
      if (id) setEditingId(id);
    }
  };

  const handleSwap = async (dayIndex: number, slotIndex: number, activityIndex: number) => {
    if (!tripData || !tripParams) return;
    const day = tripData.days[dayIndex];
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

  const handleDragReorder = useCallback((fromDayIdx: number, fromSlotIdx: number, fromActIdx: number, toDayIdx: number, toSlotIdx: number, toActIdx: number) => {
    if (!tripData) return;
    const updated = JSON.parse(JSON.stringify(tripData)) as TripData;
    const [activity] = updated.days[fromDayIdx].slots[fromSlotIdx].activities.splice(fromActIdx, 1);
    let adjustedIdx = toActIdx;
    if (fromDayIdx === toDayIdx && fromSlotIdx === toSlotIdx && fromActIdx < toActIdx) {
      adjustedIdx = Math.max(0, toActIdx - 1);
    }
    updated.days[toDayIdx].slots[toSlotIdx].activities.splice(adjustedIdx, 0, activity);
    setTripData(updated);
  }, [tripData]);

  const handleRemoveActivity = (dayIdx: number, slotIdx: number, actIdx: number) => {
    if (!tripData) return;
    const updated = JSON.parse(JSON.stringify(tripData)) as TripData;
    updated.days[dayIdx].slots[slotIdx].activities.splice(actIdx, 1);
    setTripData(updated);
  };

  const handleAddActivity = (dayIdx: number, slotIdx: number, newActivity: { name: string; placeId?: string; category: string; description: string }) => {
    if (!tripData) return;
    const updated = JSON.parse(JSON.stringify(tripData)) as TripData;
    updated.days[dayIdx].slots[slotIdx].activities.push({
      name: newActivity.name,
      description: newActivity.description,
      category: newActivity.category,
      placeId: newActivity.placeId,
    } as any);
    setTripData(updated);
  };

  const handleReplaceActivity = (dayIndex: number, slotIndex: number, activityIndex: number, newActivity: { name: string; description: string; category: string }) => {
    if (!tripData) return;
    const updated = { ...tripData };
    const act = updated.days[dayIndex].slots[slotIndex].activities[activityIndex];
    updated.days[dayIndex].slots[slotIndex].activities[activityIndex] = { ...act, ...newActivity };
    setTripData(updated);
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
        <TripList
          trips={savedTrips}
          isLoading={isLoading}
          onView={handleViewTrip}
          onEdit={handleEditTrip}
          onDuplicate={handleDuplicate}
          onDelete={deleteTrip}
          onCreateNew={handleNewTrip}
        />
      )}

      {phase === "view" && tripData && (
        <TripView
          tripData={tripData}
          tripParams={tripParams}
          onBack={handleBackToList}
          onSwap={handleSwap}
          onReplace={handleReplaceActivity}
          onRemoveActivity={handleRemoveActivity}
          onAddActivity={handleAddActivity}
          onDragReorder={handleDragReorder}
          isSwapping={isSwapping}
          isGenerating={isGenerating}
          onRegenerate={() => tripParams && handleGenerate(tripParams)}
          onSave={handleSave}
          onSaveEdits={async (edited) => {
            setTripData(edited);
            if (tripParams) {
              await saveTrip(tripParams, edited, editingId || undefined);
            }
          }}
        />
      )}

      <GeneratingOverlay isVisible={isGenerating} />
    </div>

    {/* Create Trip Modal */}
    <CreateTripModal
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

// ─── Trip List Component ─────────────────────────────────
interface TripListProps {
  trips: SavedTrip[];
  isLoading: boolean;
  onView: (it: SavedTrip) => void;
  onEdit: (it: SavedTrip) => void;
  onDuplicate: (it: SavedTrip) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
}

const TripList = ({ trips, isLoading, onView, onEdit, onDuplicate, onDelete, onCreateNew }: TripListProps) => {
  if (isLoading) {
    return (
      <div className="max-w-md mx-auto lg:max-w-4xl px-4 py-12 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="max-w-md mx-auto lg:max-w-4xl px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CalendarDays className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">No trips yet</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Plan your perfect trip with AI-powered trip plans
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Your First Trip
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
        New Trip
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {trips.map((it, i) => {
          const startDate = it.start_date ? format(parseISO(it.start_date), "MMM d") : "";
          const endDate = it.end_date ? format(parseISO(it.end_date), "MMM d, yyyy") : "";
          const totalActivities = it.trip_data?.days?.reduce(
            (acc, d) => acc + d.slots.reduce((a, s) => a + s.activities.length, 0), 0
          ) || 0;

          return (
            <div
              key={it.id}
              className="rounded-2xl bg-card border border-border overflow-hidden opacity-0 animate-fade-up"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "forwards" }}
            >
              <button
                onClick={() => it.trip_data ? onView(it) : onEdit(it)}
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

export default TripPage;