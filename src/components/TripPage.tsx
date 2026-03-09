import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, CalendarDays, MapPin, Trash2, Copy, Pencil, ChevronRight, Compass, Clock, DollarSign } from "lucide-react";
import LoginReminderBanner from "./LoginReminderBanner";
import ProfileSlideMenu from "./ProfileSlideMenu";
import AppHeader from "./AppHeader";
import { format, parseISO, isAfter, isBefore, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import CreateTripModal from "./trip/CreateTripModal";
import TripView from "./trip/TripView";
import GeneratingOverlay from "./trip/GeneratingOverlay";
import { useTrip, type TripData, type TripParams, type SavedTrip } from "@/hooks/useTrip";
import { useAuth } from "@/hooks/useAuth";

type Phase = "list" | "view";
type TripFilter = "all" | "upcoming" | "current" | "past";

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
      <AppHeader onSettingsClick={() => setIsProfileMenuOpen(true)} />

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

// ─── Helper: classify trip by dates ──────────────────────
function classifyTrip(trip: SavedTrip): "upcoming" | "current" | "past" {
  const now = new Date();
  const start = parseISO(trip.start_date);
  const end = parseISO(trip.end_date);
  if (isAfter(start, now)) return "upcoming";
  if (isBefore(end, now) && !isToday(end)) return "past";
  return "current";
}

// ─── Helper: get first activity photo ───────────────────
function getTripHeroImage(trip: SavedTrip): string | null {
  if (!trip.trip_data?.days) return null;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  for (const day of trip.trip_data.days) {
    for (const slot of day.slots) {
      for (const act of slot.activities) {
        if ((act as any).photoName) {
          return `${supabaseUrl}/functions/v1/place-photo?photo_name=${encodeURIComponent((act as any).photoName)}&maxWidthPx=400`;
        }
      }
    }
  }
  return null;
}

// ─── Helper: count spots ────────────────────────────────
function countSpots(trip: SavedTrip): number {
  return trip.trip_data?.days?.reduce(
    (acc, d) => acc + d.slots.reduce((a, s) => a + s.activities.length, 0), 0
  ) || 0;
}

// ─── Helper: estimate budget ────────────────────────────
function estimateBudget(trip: SavedTrip): string {
  if (!trip.trip_data?.days) return trip.budget || "—";
  let total = 0;
  for (const day of trip.trip_data.days) {
    for (const slot of day.slots) {
      for (const act of slot.activities) {
        total += (act as any).estimatedCost || 0;
      }
    }
  }
  if (total > 0) return `~$${total.toLocaleString()}`;
  // Fallback to budget label
  const labels: Record<string, string> = { budget: "$", moderate: "$$", luxury: "$$$" };
  return labels[trip.budget] || trip.budget || "—";
}

// ─── Filter Tabs ────────────────────────────────────────
const FILTERS: { id: TripFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "current", label: "Current" },
  { id: "past", label: "Past" },
];

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
  const [activeFilter, setActiveFilter] = useState<TripFilter>("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sort trips: upcoming/current first (by start_date asc), then past (by start_date desc)
  const sorted = useMemo(() => {
    return [...trips].sort((a, b) => {
      const catA = classifyTrip(a);
      const catB = classifyTrip(b);
      const order: Record<string, number> = { current: 0, upcoming: 1, past: 2 };
      if (order[catA] !== order[catB]) return order[catA] - order[catB];
      // Within same category: upcoming/current sort by earliest start, past sort by latest start
      if (catA === "past") return parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime();
      return parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime();
    });
  }, [trips]);

  const filtered = useMemo(() => {
    if (activeFilter === "all") return sorted;
    return sorted.filter(t => classifyTrip(t) === activeFilter);
  }, [sorted, activeFilter]);

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
          <Compass className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">No trips yet</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Plan your perfect trip with AI-powered itineraries
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
    <div className="max-w-md mx-auto lg:max-w-3xl px-4 py-6 space-y-5">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">My Trips</h2>
        <p className="text-sm text-muted-foreground mt-1">Your curated travel plans</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              activeFilter === f.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* New Trip button */}
      <button
        onClick={onCreateNew}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border-2 border-dashed border-primary/30 text-primary font-medium hover:bg-primary/5 transition-colors"
      >
        <Plus className="w-5 h-5" />
        New Trip
      </button>

      {/* Empty filter state */}
      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No {activeFilter} trips found.
        </p>
      )}

      {/* Trip Cards */}
      <div className="space-y-4">
        {filtered.map((it, i) => (
          <TripCard
            key={it.id}
            trip={it}
            index={i}
            onView={onView}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Trip Card Component ─────────────────────────────────
interface TripCardProps {
  trip: SavedTrip;
  index: number;
  onView: (it: SavedTrip) => void;
  onEdit: (it: SavedTrip) => void;
  onDuplicate: (it: SavedTrip) => void;
  onDelete: (id: string) => void;
}

const TripCard = ({ trip, index, onView, onEdit, onDuplicate, onDelete }: TripCardProps) => {
  const startDate = trip.start_date ? format(parseISO(trip.start_date), "MMM d") : "";
  const endDate = trip.end_date ? format(parseISO(trip.end_date), "MMM d, yyyy") : "";
  const heroImage = getTripHeroImage(trip);
  const spotCount = countSpots(trip);
  const budgetLabel = estimateBudget(trip);
  const category = classifyTrip(trip);
  const tagline = trip.trip_data?.summary
    ? trip.trip_data.summary.length > 80
      ? trip.trip_data.summary.slice(0, 80) + "…"
      : trip.trip_data.summary
    : trip.vibes?.slice(0, 3).join(" · ") || trip.destination;

  return (
    <div
      className="rounded-2xl bg-card border border-border overflow-hidden shadow-soft opacity-0 animate-fade-up hover:shadow-card hover:-translate-y-0.5 transition-all duration-300 group"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "forwards" }}
    >
      {/* Clickable card body: text left, image right */}
      <button
        onClick={() => trip.trip_data ? onView(trip) : onEdit(trip)}
        className="w-full text-left flex"
      >
        {/* Text block */}
        <div className="flex-1 p-4 pr-2 flex flex-col justify-between min-w-0">
          {/* Status badge */}
          <div className="mb-1.5">
            <span className={cn(
              "inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
              category === "upcoming" && "bg-primary/10 text-primary",
              category === "current" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
              category === "past" && "bg-muted text-muted-foreground",
            )}>
              {category}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold text-foreground truncate">
            {trip.name || trip.destination}
          </h3>

          {/* Tagline */}
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
            {tagline}
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5">
            {trip.vibes && trip.vibes.length > 0 && (
              <div className="flex items-center gap-1">
                {trip.vibes.slice(0, 2).map(v => (
                  <span key={v} className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{v}</span>
                ))}
              </div>
            )}
            {budgetLabel && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <DollarSign className="w-3 h-3" /> {budgetLabel}
              </span>
            )}
            {spotCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <MapPin className="w-3 h-3" /> {spotCount} spots
              </span>
            )}
          </div>

          {/* Date line */}
          <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {startDate} – {endDate}
          </p>
        </div>

        {/* Image area */}
        <div className="w-28 sm:w-36 flex-shrink-0 relative">
          {heroImage ? (
            <img
              src={heroImage}
              alt={trip.name || trip.destination}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Compass className="w-8 h-8 text-muted-foreground/40" />
            </div>
          )}
          {/* Overlay gradient for contrast */}
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-card/10" />
        </div>
      </button>

      {/* Action bar */}
      <div className="flex items-center border-t border-border/50 divide-x divide-border/50">
        <button onClick={() => onEdit(trip)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
        <button onClick={() => onDuplicate(trip)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
          <Copy className="w-3.5 h-3.5" /> Duplicate
        </button>
        <button onClick={() => onDelete(trip.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-destructive hover:bg-destructive/5 transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>
    </div>
  );
};

export default TripPage;
