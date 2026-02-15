import { useState, useEffect } from "react";
import { MapPin, CalendarDays, Users, Minus, Plus, Sparkles, Loader2, ArrowLeft, DollarSign, Home, Plane, ChevronDown, ChevronUp } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LocationPickerModal from "@/components/LocationPickerModal";
import BoardPicker from "./BoardPicker";
import type { TripParams } from "@/hooks/useItinerary";
import type { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";

const BUDGET_OPTIONS = ["$", "$$", "$$$", "$$$$"];
const VIBE_OPTIONS = ["Foodie", "Adventure", "Chill", "Nightlife", "Culture", "Shopping", "Nature"];

const BUDGET_LABELS: Record<string, string> = {
  "$": "~$50/day",
  "$$": "~$100/day",
  "$$$": "~$200/day",
  "$$$$": "$300+/day",
};

interface TripSetupFormProps {
  onGenerate: (params: TripParams) => void;
  isGenerating: boolean;
  initialParams?: TripParams | null;
  onBack?: () => void;
}

const TripSetupForm = ({ onGenerate, isGenerating, initialParams, onBack }: TripSetupFormProps) => {
  const [name, setName] = useState(initialParams?.name || "");
  const [destination, setDestination] = useState(initialParams?.destination || "");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialParams?.startDate && initialParams?.endDate
      ? { from: parseISO(initialParams.startDate), to: parseISO(initialParams.endDate) }
      : undefined
  );
  const [budget, setBudget] = useState(initialParams?.budget || "$$");
  const [totalBudget, setTotalBudget] = useState<string>("");
  const [useTotalBudget, setUseTotalBudget] = useState(false);
  const [groupSize, setGroupSize] = useState(initialParams?.groupSize || 2);
  const [vibes, setVibes] = useState<string[]>(initialParams?.vibes || []);
  const [mustIncludePlaceIds, setMustIncludePlaceIds] = useState<string[]>(initialParams?.mustIncludePlaceIds || []);
  const [boardIds, setBoardIds] = useState<string[]>(initialParams?.boardIds || []);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showAccommodation, setShowAccommodation] = useState(!!initialParams?.accommodation);
  const [accommodationName, setAccommodationName] = useState(initialParams?.accommodation?.name || "");
  const [accommodationAddress, setAccommodationAddress] = useState(initialParams?.accommodation?.address || "");
  const [showFlightDetails, setShowFlightDetails] = useState(!!initialParams?.flightDetails);
  const [outboundFlight, setOutboundFlight] = useState(initialParams?.flightDetails?.outbound || "");
  const [returnFlight, setReturnFlight] = useState(initialParams?.flightDetails?.returnFlight || "");
  const [flightPrice, setFlightPrice] = useState(initialParams?.flightDetails?.price?.toString() || "");

  const duration = dateRange?.from && dateRange?.to
    ? differenceInDays(dateRange.to, dateRange.from) + 1
    : 0;

  const perDayBudget = useTotalBudget && totalBudget && duration > 0
    ? Math.round(parseFloat(totalBudget) / duration)
    : null;

  const toggleVibe = (v: string) => {
    setVibes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  };

  const canGenerate = destination && dateRange?.from && dateRange?.to && vibes.length > 0;

  const handleSubmit = () => {
    if (!canGenerate) return;
    onGenerate({
      name: name.trim() || undefined,
      destination,
      startDate: format(dateRange!.from!, "yyyy-MM-dd"),
      endDate: format(dateRange!.to!, "yyyy-MM-dd"),
      budget,
      groupSize,
      vibes,
      mustIncludePlaceIds,
      boardIds,
      accommodation: showAccommodation && (accommodationName || accommodationAddress) ? {
        name: accommodationName || undefined,
        address: accommodationAddress || undefined,
      } : undefined,
      flightDetails: showFlightDetails && (outboundFlight || returnFlight || flightPrice) ? {
        outbound: outboundFlight || undefined,
        returnFlight: returnFlight || undefined,
        price: flightPrice ? parseFloat(flightPrice) : undefined,
      } : undefined,
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
      {/* Trip Name */}
      <section className="space-y-2">
        <label className="text-sm font-medium text-foreground">Trip Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Summer in Tokyo"
          className="rounded-2xl px-4 py-3.5 h-auto bg-card border-border"
        />
      </section>

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
      <section className="space-y-3">
        <label className="text-sm font-medium text-foreground">Budget</label>
        
        {/* Toggle between tier and total */}
        <div className="flex gap-2 p-1 rounded-xl bg-muted/50">
          <button
            onClick={() => setUseTotalBudget(false)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
              !useTotalBudget ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            )}
          >
            Spending Tier
          </button>
          <button
            onClick={() => setUseTotalBudget(true)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
              useTotalBudget ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            )}
          >
            Total Budget
          </button>
        </div>

        {!useTotalBudget ? (
          <div className="flex gap-2">
            {BUDGET_OPTIONS.map((b) => (
              <button
                key={b}
                onClick={() => setBudget(b)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-0.5",
                  budget === b
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{b}</span>
                <span className={cn("text-[10px]", budget === b ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
                  {BUDGET_LABELS[b]}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-card border border-border">
              <DollarSign className="w-5 h-5 text-primary flex-shrink-0" />
              <input
                type="number"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                placeholder="Enter total trip budget"
                className="flex-1 text-base bg-transparent outline-none text-foreground placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-sm text-muted-foreground">USD</span>
            </div>
            {perDayBudget !== null && perDayBudget > 0 && (
              <p className="text-xs text-muted-foreground px-1">
                ≈ <span className="font-medium text-foreground">${perDayBudget}</span>/day for {duration} {duration === 1 ? "day" : "days"}
              </p>
            )}
            {totalBudget && !duration && (
              <p className="text-xs text-muted-foreground px-1">
                Select dates to see per-day breakdown
              </p>
            )}
          </div>
        )}
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

      {/* Accommodation (Optional) */}
      <section className="space-y-2">
        <button
          onClick={() => setShowAccommodation(!showAccommodation)}
          className="flex items-center gap-2 text-sm font-medium text-foreground"
        >
          <Home className="w-4 h-4 text-primary" />
          Where are you staying?
          <span className="text-xs text-muted-foreground">(optional)</span>
          {showAccommodation ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
        </button>
        {showAccommodation && (
          <div className="space-y-2 pl-6">
            <Input
              value={accommodationName}
              onChange={(e) => setAccommodationName(e.target.value)}
              placeholder="Hotel / Airbnb name"
              className="rounded-2xl px-4 py-3 h-auto bg-card border-border"
            />
            <Input
              value={accommodationAddress}
              onChange={(e) => setAccommodationAddress(e.target.value)}
              placeholder="Address"
              className="rounded-2xl px-4 py-3 h-auto bg-card border-border"
            />
          </div>
        )}
      </section>

      {/* Flight Details (Optional) */}
      <section className="space-y-2">
        <button
          onClick={() => setShowFlightDetails(!showFlightDetails)}
          className="flex items-center gap-2 text-sm font-medium text-foreground"
        >
          <Plane className="w-4 h-4 text-primary" />
          Flight Details
          <span className="text-xs text-muted-foreground">(optional)</span>
          {showFlightDetails ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
        </button>
        {showFlightDetails && (
          <div className="space-y-2 pl-6">
            <Input
              value={outboundFlight}
              onChange={(e) => setOutboundFlight(e.target.value)}
              placeholder="Outbound flight (e.g. SQ22, 10:30 AM)"
              className="rounded-2xl px-4 py-3 h-auto bg-card border-border"
            />
            <Input
              value={returnFlight}
              onChange={(e) => setReturnFlight(e.target.value)}
              placeholder="Return flight (e.g. SQ21, 6:00 PM)"
              className="rounded-2xl px-4 py-3 h-auto bg-card border-border"
            />
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border">
              <DollarSign className="w-4 h-4 text-primary flex-shrink-0" />
              <input
                type="number"
                value={flightPrice}
                onChange={(e) => setFlightPrice(e.target.value)}
                placeholder="Total flight cost"
                className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-xs text-muted-foreground">USD</span>
            </div>
          </div>
        )}
      </section>

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
