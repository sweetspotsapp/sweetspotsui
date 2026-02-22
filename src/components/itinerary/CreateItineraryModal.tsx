import { useState, useEffect } from "react";
import { ArrowLeft, X, MapPin, CalendarDays, Users, Minus, Plus, Sparkles, Loader2, DollarSign, Home, Plane, ChevronDown, ChevronUp, Upload, Lock } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LocationPickerModal from "@/components/LocationPickerModal";
import BoardPicker from "./BoardPicker";
import CurrencyPicker, { CURRENCIES } from "./CurrencyPicker";
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

interface CreateItineraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: TripParams) => void;
  onCreateOwn: () => void;
  isGenerating: boolean;
  initialParams?: TripParams | null;
}

const CreateItineraryModal = ({
  isOpen,
  onClose,
  onGenerate,
  onCreateOwn,
  isGenerating,
  initialParams,
}: CreateItineraryModalProps) => {
  const [step, setStep] = useState(1);

  // Step 1: Trip Setup
  const [name, setName] = useState(initialParams?.name || "");
  const [destination, setDestination] = useState(initialParams?.destination || "");
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialParams?.startDate ? parseISO(initialParams.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialParams?.endDate ? parseISO(initialParams.endDate) : undefined
  );
  const [hasEndDate, setHasEndDate] = useState(!!initialParams?.endDate);
  const [vibes, setVibes] = useState<string[]>(initialParams?.vibes || []);
  const [customVibe, setCustomVibe] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);

  // Step 2: Planning Style
  const [budget, setBudget] = useState(initialParams?.budget || "$$");
  const [totalBudget, setTotalBudget] = useState<string>("");
  const [useTotalBudget, setUseTotalBudget] = useState(false);
  const [budgetCurrency, setBudgetCurrency] = useState("USD");
  const [budgetIsPerPerson, setBudgetIsPerPerson] = useState(true);
  const [groupSize, setGroupSize] = useState(initialParams?.groupSize || 2);
  const [mustIncludePlaceIds, setMustIncludePlaceIds] = useState<string[]>(initialParams?.mustIncludePlaceIds || []);
  const [boardIds, setBoardIds] = useState<string[]>(initialParams?.boardIds || []);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      if (initialParams) {
        setName(initialParams.name || "");
        setDestination(initialParams.destination || "");
        setStartDate(initialParams.startDate ? parseISO(initialParams.startDate) : undefined);
        setEndDate(initialParams.endDate ? parseISO(initialParams.endDate) : undefined);
        setHasEndDate(!!initialParams.endDate);
        setVibes(initialParams.vibes || []);
        setBudget(initialParams.budget || "$$");
        setGroupSize(initialParams.groupSize || 2);
        setMustIncludePlaceIds(initialParams.mustIncludePlaceIds || []);
        setBoardIds(initialParams.boardIds || []);
      }
    }
  }, [isOpen, initialParams]);

  const duration = startDate && endDate
    ? differenceInDays(endDate, startDate) + 1
    : startDate ? 1 : 0;

  const budgetSymbol = CURRENCIES.find(c => c.code === budgetCurrency)?.symbol || "$";
  const perDayBudget = useTotalBudget && totalBudget && duration > 0
    ? Math.round(parseFloat(totalBudget) / duration)
    : null;

  const toggleVibe = (v: string) => {
    setVibes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  };

  const addCustomVibe = () => {
    const trimmed = customVibe.trim();
    if (trimmed && !vibes.includes(trimmed)) {
      setVibes(prev => [...prev, trimmed]);
      setCustomVibe("");
    }
  };

  const canProceedStep1 = destination && startDate && vibes.length > 0;

  const effectiveEndDate = hasEndDate && endDate ? endDate : startDate;

  const handleGenerate = () => {
    if (!canProceedStep1 || !startDate) return;
    onGenerate({
      name: name.trim() || undefined,
      destination,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(effectiveEndDate!, "yyyy-MM-dd"),
      budget,
      groupSize,
      vibes,
      mustIncludePlaceIds,
      boardIds,
    });
  };

  const handleCreateOwn = () => {
    onCreateOwn();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] bg-background rounded-t-3xl lg:rounded-3xl overflow-hidden flex flex-col animate-fade-up"
        style={{ animationDuration: "200ms" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <button
            onClick={step === 1 ? onClose : () => setStep(1)}
            className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {step === 1 ? <X className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <h2 className="text-base font-semibold text-foreground">
            {step === 1 ? "Trip Setup" : "Planning Style"}
          </h2>
          <div className="w-7" />
        </div>

        {/* Step Indicator */}
        <div className="flex gap-2 px-6 pt-4">
          <div className={cn("h-1 flex-1 rounded-full transition-colors", step >= 1 ? "bg-primary" : "bg-muted")} />
          <div className={cn("h-1 flex-1 rounded-full transition-colors", step >= 2 ? "bg-primary" : "bg-muted")} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {step === 1 ? (
            <Step1Content
              name={name}
              setName={setName}
              destination={destination}
              setDestination={(d) => setDestination(d)}
              onOpenLocationPicker={() => setShowLocationPicker(true)}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              hasEndDate={hasEndDate}
              setHasEndDate={setHasEndDate}
              vibes={vibes}
              toggleVibe={toggleVibe}
              customVibe={customVibe}
              setCustomVibe={setCustomVibe}
              addCustomVibe={addCustomVibe}
              showUploadSection={showUploadSection}
              setShowUploadSection={setShowUploadSection}
              duration={duration}
            />
          ) : (
            <Step2Content
              budget={budget}
              setBudget={setBudget}
              totalBudget={totalBudget}
              setTotalBudget={setTotalBudget}
              useTotalBudget={useTotalBudget}
              setUseTotalBudget={setUseTotalBudget}
              budgetCurrency={budgetCurrency}
              setBudgetCurrency={setBudgetCurrency}
              budgetIsPerPerson={budgetIsPerPerson}
              setBudgetIsPerPerson={setBudgetIsPerPerson}
              budgetSymbol={budgetSymbol}
              perDayBudget={perDayBudget}
              duration={duration}
              groupSize={groupSize}
              setGroupSize={setGroupSize}
              mustIncludePlaceIds={mustIncludePlaceIds}
              setMustIncludePlaceIds={setMustIncludePlaceIds}
              boardIds={boardIds}
              setBoardIds={setBoardIds}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 pb-8 lg:pb-4 border-t border-border space-y-3">
          {step === 1 ? (
            <>
              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className={cn(
                  "w-full py-3.5 rounded-2xl text-sm font-semibold transition-all",
                  canProceedStep1
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                Next
              </button>
              {!canProceedStep1 && (
                <p className="text-xs text-muted-foreground text-center">
                  {[
                    !destination && "destination",
                    !startDate && "start date",
                    vibes.length === 0 && "at least one vibe",
                  ].filter(Boolean).join(", ")} needed
                </p>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={cn(
                  "w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all",
                  !isGenerating
                    ? "bg-primary text-primary-foreground shadow-lg hover:shadow-xl active:scale-[0.98]"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate with AI
                  </>
                )}
              </button>
              <button
                onClick={handleCreateOwn}
                disabled
                className="w-full py-3.5 rounded-2xl text-sm font-medium border border-border text-muted-foreground cursor-not-allowed opacity-60 flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                Create My Own
                <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">Coming Soon</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Location Picker */}
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

// ─── Step 1: Trip Setup ─────────────────────────────────
interface Step1Props {
  name: string;
  setName: (v: string) => void;
  destination: string;
  setDestination: (v: string) => void;
  onOpenLocationPicker: () => void;
  startDate: Date | undefined;
  setStartDate: (d: Date | undefined) => void;
  endDate: Date | undefined;
  setEndDate: (d: Date | undefined) => void;
  hasEndDate: boolean;
  setHasEndDate: (v: boolean) => void;
  vibes: string[];
  toggleVibe: (v: string) => void;
  customVibe: string;
  setCustomVibe: (v: string) => void;
  addCustomVibe: () => void;
  showUploadSection: boolean;
  setShowUploadSection: (v: boolean) => void;
  duration: number;
}

const Step1Content = ({
  name, setName, destination, onOpenLocationPicker,
  startDate, setStartDate, endDate, setEndDate,
  hasEndDate, setHasEndDate, vibes, toggleVibe,
  customVibe, setCustomVibe, addCustomVibe,
  showUploadSection, setShowUploadSection, duration,
}: Step1Props) => (
  <div className="space-y-5">
    {/* Trip Name */}
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trip Name</label>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Summer in Tokyo"
        className="rounded-xl px-4 py-3 h-auto bg-card border-border text-sm"
      />
    </div>

    {/* Destination */}
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Destination</label>
      <button
        onClick={onOpenLocationPicker}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border text-left transition-colors hover:bg-muted/50"
      >
        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
        <span className={cn("text-sm", destination ? "text-foreground font-medium" : "text-muted-foreground")}>
          {destination || "Where are you going?"}
        </span>
      </button>
    </div>

    {/* Dates */}
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dates</label>
      <div className="grid grid-cols-2 gap-3">
        {/* Start Date */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border text-left transition-colors hover:bg-muted/50">
              <CalendarDays className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] text-muted-foreground block">Start</span>
                <span className={cn("text-sm", startDate ? "text-foreground font-medium" : "text-muted-foreground")}>
                  {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                </span>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[70]" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(d) => {
                setStartDate(d);
                if (endDate && d && endDate < d) setEndDate(undefined);
              }}
              disabled={(date) => date < new Date()}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* End Date */}
        {hasEndDate ? (
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border text-left transition-colors hover:bg-muted/50">
                <CalendarDays className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-muted-foreground block">End</span>
                  <span className={cn("text-sm", endDate ? "text-foreground font-medium" : "text-muted-foreground")}>
                    {endDate ? format(endDate, "MMM d, yyyy") : "Pick date"}
                  </span>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[70]" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                disabled={(date) => date < (startDate || new Date())}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        ) : (
          <button
            onClick={() => setHasEndDate(true)}
            className="flex items-center justify-center px-4 py-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
          >
            + Add end date
          </button>
        )}
      </div>
      {duration > 0 && hasEndDate && endDate && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            {duration} {duration === 1 ? "day" : "days"}
          </span>
          <button
            onClick={() => { setHasEndDate(false); setEndDate(undefined); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Remove end date
          </button>
        </div>
      )}
    </div>

    {/* Trip Vibe */}
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trip Vibe</label>
      <div className="flex flex-wrap gap-2">
        {VIBE_OPTIONS.map((v) => (
          <button
            key={v}
            onClick={() => toggleVibe(v)}
            className={cn(
              "px-3.5 py-2 rounded-full text-sm font-medium transition-all",
              vibes.includes(v)
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {v}
          </button>
        ))}
        {vibes.filter(v => !VIBE_OPTIONS.includes(v)).map((v) => (
          <button
            key={v}
            onClick={() => toggleVibe(v)}
            className="px-3.5 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground shadow-sm"
          >
            {v}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={customVibe}
          onChange={(e) => setCustomVibe(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustomVibe()}
          placeholder="Add your own vibe..."
          className="flex-1 px-3.5 py-2 rounded-full text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30"
        />
        {customVibe.trim() && (
          <button onClick={addCustomVibe} className="px-3 py-2 rounded-full text-xs font-medium bg-primary text-primary-foreground">
            Add
          </button>
        )}
      </div>
    </div>

    {/* Upload Section (Coming Soon) */}
    <div className="space-y-1.5">
      <button
        onClick={() => setShowUploadSection(!showUploadSection)}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Upload className="w-3.5 h-3.5" />
        Upload documents
        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">Optional</span>
        {showUploadSection ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>
      {showUploadSection && (
        <div className="space-y-2 pl-5">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border bg-muted/20 opacity-50 cursor-not-allowed">
            <Home className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Accommodation receipt</p>
              <p className="text-[10px] text-muted-foreground">Coming Soon</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border bg-muted/20 opacity-50 cursor-not-allowed">
            <Plane className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Flight ticket</p>
              <p className="text-[10px] text-muted-foreground">Coming Soon</p>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);

// ─── Step 2: Planning Style ─────────────────────────────────
interface Step2Props {
  budget: string;
  setBudget: (v: string) => void;
  totalBudget: string;
  setTotalBudget: (v: string) => void;
  useTotalBudget: boolean;
  setUseTotalBudget: (v: boolean) => void;
  budgetCurrency: string;
  setBudgetCurrency: (v: string) => void;
  budgetIsPerPerson: boolean;
  setBudgetIsPerPerson: (v: boolean) => void;
  budgetSymbol: string;
  perDayBudget: number | null;
  duration: number;
  groupSize: number;
  setGroupSize: (v: number) => void;
  mustIncludePlaceIds: string[];
  setMustIncludePlaceIds: (ids: string[]) => void;
  boardIds: string[];
  setBoardIds: (ids: string[]) => void;
}

const Step2Content = ({
  budget, setBudget, totalBudget, setTotalBudget,
  useTotalBudget, setUseTotalBudget,
  budgetCurrency, setBudgetCurrency,
  budgetIsPerPerson, setBudgetIsPerPerson,
  budgetSymbol, perDayBudget, duration,
  groupSize, setGroupSize,
  mustIncludePlaceIds, setMustIncludePlaceIds,
  boardIds, setBoardIds,
}: Step2Props) => (
  <div className="space-y-5">
    {/* Budget */}
    <div className="space-y-3">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Budget</label>

      {/* Toggle */}
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
        <div className="grid grid-cols-4 gap-2">
          {BUDGET_OPTIONS.map((b) => (
            <button
              key={b}
              onClick={() => setBudget(b)}
              className={cn(
                "py-2.5 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-0.5",
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
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border">
              <span className="text-primary font-medium">{budgetSymbol}</span>
              <input
                type="number"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                placeholder="Total trip budget"
                className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <CurrencyPicker value={budgetCurrency} onChange={setBudgetCurrency} compact />
          </div>
          {perDayBudget !== null && perDayBudget > 0 && (
            <p className="text-xs text-muted-foreground px-1">
              Approx. <span className="font-medium text-foreground">{budgetSymbol}{perDayBudget}</span>/day for {duration} {duration === 1 ? "day" : "days"}
              {!budgetIsPerPerson && groupSize > 1 && (
                <span> ({budgetSymbol}{Math.round(perDayBudget / groupSize)}/day per person)</span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Per person / Whole group */}
      <div className="flex gap-2 p-1 rounded-xl bg-muted/50">
        <button
          onClick={() => setBudgetIsPerPerson(true)}
          className={cn(
            "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all",
            budgetIsPerPerson ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
          )}
        >
          Per Person
        </button>
        <button
          onClick={() => setBudgetIsPerPerson(false)}
          className={cn(
            "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all",
            !budgetIsPerPerson ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
          )}
        >
          Whole Group
        </button>
      </div>
    </div>

    {/* Group Size */}
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Group Size</label>
      <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-card border border-border">
        <Users className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="flex-1 text-sm text-foreground font-medium">
          {groupSize} {groupSize === 1 ? "person" : "people"}
        </span>
        <button
          onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted-foreground/20 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setGroupSize(Math.min(20, groupSize + 1))}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted-foreground/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    {/* Board Picker */}
    <BoardPicker
      selectedPlaceIds={mustIncludePlaceIds}
      onPlaceIdsChange={setMustIncludePlaceIds}
      selectedBoardIds={boardIds}
      onBoardIdsChange={setBoardIds}
    />
  </div>
);

export default CreateItineraryModal;
