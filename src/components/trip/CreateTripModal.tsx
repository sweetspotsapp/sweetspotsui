import { useState, useEffect, useRef } from "react";
import { ArrowLeft, X, MapPin, CalendarDays, Users, Minus, Plus, Sparkles, Loader2, DollarSign, Home, Plane, ChevronDown, ChevronUp, Upload, Lock, Check, Navigation } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWeatherForecast, type DayForecast } from "@/hooks/useWeatherForecast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import BoardPicker from "./BoardPicker";
import CurrencyPicker, { CURRENCIES } from "./CurrencyPicker";
import BrowseForTrip from "./BrowseForTrip";
import type { TripParams } from "@/hooks/useTrip";
import type { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";
import { usePlaceAutocomplete } from "@/hooks/usePlaceAutocomplete";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const BUDGET_OPTIONS = ["$", "$$", "$$$", "$$$$"];
const VIBE_OPTIONS = ["Foodie", "Adventure", "Chill", "Nightlife", "Culture", "Shopping", "Nature"];

// Tiny SVG weather icons for calendar cells
const WeatherIcon = ({ type, className = "" }: { type: string; className?: string }) => {
  const size = 12;
  const shared = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: `opacity-60 ${className}` };
  
  switch (type) {
    case "clear":
      return <svg {...shared} className={`text-amber-400 opacity-70 ${className}`}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
    case "clouds":
      return <svg {...shared} className={`text-slate-400 opacity-70 ${className}`}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>;
    case "rain":
      return <svg {...shared} className={`text-blue-400 opacity-70 ${className}`}><line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>;
    case "snow":
      return <svg {...shared} className={`text-sky-300 opacity-70 ${className}`}><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" y1="16" x2="8.01" y2="16"/><line x1="8" y1="20" x2="8.01" y2="20"/><line x1="12" y1="18" x2="12.01" y2="18"/><line x1="12" y1="22" x2="12.01" y2="22"/><line x1="16" y1="16" x2="16.01" y2="16"/><line x1="16" y1="20" x2="16.01" y2="20"/></svg>;
    case "thunderstorm":
      return <svg {...shared} className={`text-yellow-500 opacity-70 ${className}`}><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/></svg>;
    default:
      return <svg {...shared} className={`text-slate-400 opacity-70 ${className}`}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>;
  }
};

// Weather-aware calendar day cell
const WeatherDayCell = ({ date, forecast }: { date: Date; forecast: Map<string, DayForecast> }) => {
  const dateKey = format(date, "yyyy-MM-dd");
  const weather = forecast.get(dateKey);
  
  if (!weather) {
    return <span>{date.getDate()}</span>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex flex-col items-center gap-0.5 leading-none">
            <span>{date.getDate()}</span>
            <WeatherIcon type={weather.icon} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs px-2 py-1">
          {weather.tempHigh}°C · {weather.summary || weather.icon}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const BASE_BUDGET_USD: Record<string, number> = {
  "$": 50,
  "$$": 100,
  "$$$": 200,
  "$$$$": 300,
};

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: TripParams) => void;
  onCreateOwn: () => void;
  isGenerating: boolean;
  initialParams?: TripParams | null;
}

const CreateTripModal = ({
  isOpen,
  onClose,
  onGenerate,
  onCreateOwn,
  isGenerating,
  initialParams,
}: CreateTripModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [prefillApplied, setPrefillApplied] = useState<string | null>(null);

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
  const [vibeDetails, setVibeDetails] = useState("");
  
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);

  // Step 2: Planning Style
  const [budget, setBudget] = useState(initialParams?.budget || "$$");
  const [totalBudget, setTotalBudget] = useState<string>("");
  const [useTotalBudget, setUseTotalBudget] = useState(false);
  const [budgetCurrency, setBudgetCurrency] = useState("USD");
  const [budgetIsPerPerson, setBudgetIsPerPerson] = useState(true);
  const [groupSize, setGroupSize] = useState(initialParams?.groupSize || 2);
  const [mustIncludePlaceIds, setMustIncludePlaceIds] = useState<string[]>(initialParams?.mustIncludePlaceIds || []);
  const [boardIds, setBoardIds] = useState<string[]>(initialParams?.boardIds || []);
  const [exchangeRate, setExchangeRate] = useState(1);

  // Fetch exchange rate when currency changes
  useEffect(() => {
    if (budgetCurrency === "USD") {
      setExchangeRate(1);
      return;
    }
    let cancelled = false;
    fetch(`https://open.er-api.com/v6/latest/USD`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data?.rates?.[budgetCurrency]) {
          setExchangeRate(data.rates[budgetCurrency]);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [budgetCurrency]);

  // Smart prefill: auto-include saved spots in the destination city
  useEffect(() => {
    if (!user || !destination || destination === "Nearby" || destination.trim().length < 3) return;
    if (prefillApplied === destination) return;

    const cityName = destination.split(",")[0].trim().toLowerCase();
    if (cityName.length < 2) return;

    let cancelled = false;
    (async () => {
      const { data: savedRows } = await supabase
        .from("saved_places")
        .select("place_id")
        .eq("user_id", user.id)
        .limit(100);

      if (cancelled || !savedRows?.length) return;

      const savedIds = savedRows.map((r) => r.place_id);
      const { data: places } = await supabase
        .from("places")
        .select("place_id, address")
        .in("place_id", savedIds);

      if (cancelled || !places?.length) return;

      const matchingIds = places
        .filter((p) => p.address && p.address.toLowerCase().includes(cityName))
        .map((p) => p.place_id);

      if (matchingIds.length > 0) {
        setMustIncludePlaceIds((prev) => {
          const existing = new Set(prev);
          const merged = [...prev];
          for (const id of matchingIds) {
            if (!existing.has(id)) merged.push(id);
          }
          return merged;
        });
        setPrefillApplied(destination);
      }
    })();

    return () => { cancelled = true; };
  }, [user, destination, prefillApplied]);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPrefillApplied(null);
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
        setVibeDetails(initialParams.vibeDetails || "");
      } else {
        setName("");
        setDestination("");
        setStartDate(undefined);
        setEndDate(undefined);
        setHasEndDate(false);
        setVibes([]);
        setCustomVibe("");
        setVibeDetails("");
        setBudget("$$");
        setTotalBudget("");
        setUseTotalBudget(false);
        setBudgetCurrency("USD");
        setBudgetIsPerPerson(true);
        setGroupSize(2);
        setMustIncludePlaceIds([]);
        setBoardIds([]);
        setExchangeRate(1);
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

  const getBudgetLabel = (tier: string) => {
    const baseUsd = BASE_BUDGET_USD[tier] || 100;
    const converted = Math.round(baseUsd * exchangeRate);
    const prefix = tier === "$$$$" ? "" : "~";
    const suffix = tier === "$$$$" ? "+" : "";
    return `${prefix}${budgetSymbol}${converted.toLocaleString()}${suffix}/day`;
  };

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
      vibeDetails: vibeDetails.trim() || undefined,
      mustIncludePlaceIds,
      boardIds,
    });
  };

  const handleCreateOwn = () => {
    onCreateOwn();
  };

  if (!isOpen) return null;

  return (
    <>
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
              setDestination={setDestination}
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
              vibeDetails={vibeDetails}
              setVibeDetails={setVibeDetails}
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
              destination={destination}
              onBrowse={() => setShowBrowse(true)}
              getBudgetLabel={getBudgetLabel}
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
    </div>

    {/* Browse overlay */}
    {showBrowse && destination && (
      <BrowseForTrip
        destination={destination}
        selectedPlaceIds={mustIncludePlaceIds}
        onConfirm={(ids) => {
          setMustIncludePlaceIds(ids);
          setShowBrowse(false);
        }}
        onBack={() => setShowBrowse(false)}
      />
    )}
    </>
  );
};

// ─── Step 1: Trip Setup ─────────────────────────────────
interface Step1Props {
  name: string;
  setName: (v: string) => void;
  destination: string;
  setDestination: (v: string) => void;
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
  vibeDetails: string;
  setVibeDetails: (v: string) => void;
  showUploadSection: boolean;
  setShowUploadSection: (v: boolean) => void;
  duration: number;
}

const Step1Content = ({
  name, setName, destination, setDestination,
  startDate, setStartDate, endDate, setEndDate,
  hasEndDate, setHasEndDate, vibes, toggleVibe,
  customVibe, setCustomVibe, addCustomVibe,
  vibeDetails, setVibeDetails,
  showUploadSection, setShowUploadSection, duration,
}: Step1Props) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { predictions, isLoading } = usePlaceAutocomplete(showSuggestions ? destination : "");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { forecast } = useWeatherForecast(destination && destination !== "Nearby" && destination.length >= 3 ? destination : null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
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
    <div className="space-y-1.5" ref={wrapperRef}>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Destination</label>
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary z-10" />
        <Input
          value={destination}
          onChange={(e) => {
            setDestination(e.target.value);
            setShowSuggestions(e.target.value.trim().length >= 2);
          }}
          onFocus={() => { if (destination.trim().length >= 2) setShowSuggestions(true); }}
          placeholder="Where are you going?"
          className="pl-11 pr-4 rounded-xl py-3 h-auto bg-card border-border text-sm"
        />
        {showSuggestions && predictions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto">
            {predictions.map((p) => (
              <button
                key={p.place_id}
                onClick={() => { setDestination(p.description); setShowSuggestions(false); }}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left first:rounded-t-xl last:rounded-b-xl"
              >
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-foreground text-sm font-medium block truncate">{p.main_text}</span>
                  {p.secondary_text && <span className="text-muted-foreground text-xs block truncate">{p.secondary_text}</span>}
                </div>
              </button>
            ))}
            <button
              onClick={() => { setDestination("Nearby"); setShowSuggestions(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-t border-border rounded-b-xl"
            >
              <Navigation className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-foreground text-sm font-medium">Nearby places</span>
            </button>
          </div>
        )}
        {showSuggestions && !isLoading && predictions.length === 0 && destination.trim().length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20">
            <button
              onClick={() => { setDestination("Nearby"); setShowSuggestions(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left rounded-xl"
            >
              <Navigation className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-foreground text-sm font-medium">Nearby places</span>
            </button>
          </div>
        )}
      </div>
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

      {/* Custom prompt field */}
      <div className="pt-2 space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Describe what kind of trip you want</label>
        <input
          value={vibeDetails}
          onChange={(e) => setVibeDetails(e.target.value)}
          placeholder="Example: I want cozy cafes, sunset views, and good local food."
          className="w-full px-4 py-2.5 rounded-xl text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30"
        />
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
};

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
  destination?: string;
  onBrowse?: () => void;
  getBudgetLabel: (tier: string) => string;
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
  destination, onBrowse, getBudgetLabel,
}: Step2Props) => (
  <div className="space-y-5">
    {/* Budget */}
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Budget</label>
        <CurrencyPicker value={budgetCurrency} onChange={setBudgetCurrency} compact />
      </div>

      {/* Budget Mode Toggle */}
      <div className="flex gap-2 p-1 rounded-xl bg-muted/50">
        <button
          onClick={() => setUseTotalBudget(false)}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
            !useTotalBudget ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
          )}
        >
          Daily Budget
        </button>
        <button
          onClick={() => setUseTotalBudget(true)}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
            useTotalBudget ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
          )}
        >
          Total Trip Budget
        </button>
      </div>

      {!useTotalBudget ? (
        <div className="grid grid-cols-2 gap-2">
          {(["$", "$$", "$$$", "$$$$"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBudget(b)}
              className={cn(
                "px-4 py-3 rounded-xl text-sm font-medium transition-all text-center",
                budget === b
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              {getBudgetLabel(b)}
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
                placeholder="Enter your total trip budget"
                className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <CurrencyPicker value={budgetCurrency} onChange={setBudgetCurrency} compact />
          </div>
          {perDayBudget !== null && perDayBudget > 0 && (
            <p className="text-xs text-muted-foreground px-1">
              ≈ <span className="font-medium text-foreground">{budgetSymbol}{perDayBudget}</span>/day for {duration} {duration === 1 ? "day" : "days"}
              {!budgetIsPerPerson && groupSize > 1 && (
                <span> ({budgetSymbol}{Math.round(perDayBudget / groupSize)}/day per person)</span>
              )}
            </p>
          )}
          {totalBudget && !duration && (
            <p className="text-xs text-muted-foreground px-1">
              Select dates to see per-day breakdown
            </p>
          )}
        </div>
      )}
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
      destination={destination}
      onBrowse={onBrowse}
    />
  </div>
);

export default CreateTripModal;
