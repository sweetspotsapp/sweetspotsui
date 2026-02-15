import { useState, useEffect } from "react";
import { MapPin, CalendarDays, Users, Minus, Plus, Sparkles, Loader2, ArrowLeft } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LocationPickerModal from "@/components/LocationPickerModal";
import BoardPicker from "./BoardPicker";
import type { TripParams } from "@/hooks/useItinerary";
import type { DateRange } from "react-day-picker";

const BUDGET_OPTIONS = ["$", "$$", "$$$", "$$$$"];
const VIBE_OPTIONS = ["Foodie", "Adventure", "Chill", "Nightlife", "Culture", "Shopping", "Nature"];

interface TripSetupFormProps {
  onGenerate: (params: TripParams) => void;
  isGenerating: boolean;
  initialParams?: TripParams | null;
  onBack?: () => void;
}

const TripSetupForm = ({ onGenerate, isGenerating, initialParams, onBack }: TripSetupFormProps) => {
  const [destination, setDestination] = useState(initialParams?.destination || "");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialParams?.startDate && initialParams?.endDate
      ? { from: parseISO(initialParams.startDate), to: parseISO(initialParams.endDate) }
      : undefined
  );
  const [budget, setBudget] = useState(initialParams?.budget || "$$");
  const [groupSize, setGroupSize] = useState(initialParams?.groupSize || 2);
  const [vibes, setVibes] = useState<string[]>(initialParams?.vibes || []);
  const [mustIncludePlaceIds, setMustIncludePlaceIds] = useState<string[]>(initialParams?.mustIncludePlaceIds || []);
  const [boardIds, setBoardIds] = useState<string[]>(initialParams?.boardIds || []);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const duration = dateRange?.from && dateRange?.to
    ? differenceInDays(dateRange.to, dateRange.from) + 1
    : 0;

  const toggleVibe = (v: string) => {
    setVibes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  };

  const canGenerate = destination && dateRange?.from && dateRange?.to && vibes.length > 0;

  const handleSubmit = () => {
    if (!canGenerate) return;
    onGenerate({
      destination,
      startDate: format(dateRange!.from!, "yyyy-MM-dd"),
      endDate: format(dateRange!.to!, "yyyy-MM-dd"),
      budget,
      groupSize,
      vibes,
      mustIncludePlaceIds,
      boardIds,
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Itineraries
        </button>
      )}
      {/* Destination */}
      <section className="space-y-2">
        <label className="text-sm font-medium text-foreground">Destination</label>
        <button
          onClick={() => setShowLocationPicker(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-card border border-border text-left transition-colors hover:bg-muted/50"
        >
          <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
          <span className={cn("text-base", destination ? "text-foreground" : "text-muted-foreground")}>
            {destination || "Where are you going?"}
          </span>
        </button>
      </section>

      {/* Dates */}
      <section className="space-y-2">
        <label className="text-sm font-medium text-foreground">Dates</label>
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-card border border-border text-left transition-colors hover:bg-muted/50">
              <CalendarDays className="w-5 h-5 text-primary flex-shrink-0" />
              <span className={cn("text-base", dateRange?.from ? "text-foreground" : "text-muted-foreground")}>
                {dateRange?.from ? (
                  dateRange.to ? (
                    `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`
                  ) : format(dateRange.from, "MMM d, yyyy")
                ) : "Pick your dates"}
              </span>
              {duration > 0 && (
                <span className="ml-auto text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                  {duration} {duration === 1 ? "day" : "days"}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={1}
              disabled={(date) => date < new Date()}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </section>

      {/* Budget */}
      <section className="space-y-2">
        <label className="text-sm font-medium text-foreground">Budget</label>
        <div className="flex gap-2">
          {BUDGET_OPTIONS.map((b) => (
            <button
              key={b}
              onClick={() => setBudget(b)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
                budget === b
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {b}
            </button>
          ))}
        </div>
      </section>

      {/* Group Size */}
      <section className="space-y-2">
        <label className="text-sm font-medium text-foreground">Group Size</label>
        <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-card border border-border">
          <Users className="w-5 h-5 text-primary flex-shrink-0" />
          <span className="flex-1 text-base text-foreground">
            {groupSize} {groupSize === 1 ? "person" : "people"}
          </span>
          <button
            onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted-foreground/20 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setGroupSize(Math.min(20, groupSize + 1))}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted-foreground/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Trip Vibe */}
      <section className="space-y-2">
        <label className="text-sm font-medium text-foreground">Trip Vibe</label>
        <div className="flex flex-wrap gap-2">
          {VIBE_OPTIONS.map((v) => (
            <button
              key={v}
              onClick={() => toggleVibe(v)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                vibes.includes(v)
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </section>

      {/* Board Picker */}
      <BoardPicker
        selectedPlaceIds={mustIncludePlaceIds}
        onPlaceIdsChange={setMustIncludePlaceIds}
        selectedBoardIds={boardIds}
        onBoardIdsChange={setBoardIds}
      />

      {/* Generate Button */}
      <button
        onClick={handleSubmit}
        disabled={!canGenerate || isGenerating}
        className={cn(
          "w-full py-4 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 transition-all",
          canGenerate && !isGenerating
            ? "bg-primary text-primary-foreground shadow-lg hover:shadow-xl active:scale-[0.98]"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Itinerary
          </>
        )}
      </button>

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelectLocation={(loc) => {
          setDestination(loc === "nearby" ? "Nearby" : loc);
        }}
        currentLocation={destination || undefined}
      />
    </div>
  );
};

export default TripSetupForm;
