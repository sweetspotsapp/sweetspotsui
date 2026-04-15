import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Check, Globe, Route, Sparkles } from "lucide-react";
import SweetSpotsLoader from "@/components/SweetSpotsLoader";

interface GeneratingOverlayProps {
  isVisible: boolean;
  destination?: string;
  duration?: number;
}

interface Step {
  label: string;
  type: "init" | "article" | "build";
  substeps: string[];
}

function buildSteps(dest: string, days: number): Step[] {
  const d = dest || "your destination";
  const dur = days > 1 ? `${days} days` : "a day";

  return [
    {
      label: "Starting to plan your trip",
      type: "init",
      substeps: ["Getting started", "Evaluating your preferences"],
    },
    {
      label: `${dur} in ${d}: Top local picks`,
      type: "article",
      substeps: ["Reading page"],
    },
    {
      label: `A weekend in ${d}: The perfect itinerary`,
      type: "article",
      substeps: ["Reading page"],
    },
    {
      label: `${d} hidden gems & local favourites`,
      type: "article",
      substeps: ["Reading page"],
    },
    {
      label: "Building your itinerary",
      type: "build",
      substeps: [
        "Getting started",
        "Cross-referencing sources",
        "Building recommendations",
        "Combining your spots",
        "Validating itinerary",
        "Improving itinerary",
      ],
    },
  ];
}

const GeneratingOverlay = ({ isVisible, destination, duration }: GeneratingOverlayProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentSubstep, setCurrentSubstep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [completedSubsteps, setCompletedSubsteps] = useState<Map<number, Set<number>>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps = useMemo(
    () => buildSteps(destination || "", duration || 3),
    [destination, duration]
  );

  useEffect(() => {
    if (isVisible) {
      setCurrentStep(0);
      setCurrentSubstep(0);
      setCompletedSteps(new Set());
      setCompletedSubsteps(new Map());
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const advance = () => {
      setCurrentSubstep((prevSub) => {
        const step = steps[currentStep];
        if (!step) return prevSub;

        setCompletedSubsteps((prev) => {
          const next = new Map(prev);
          const set = new Set(next.get(currentStep) || []);
          set.add(prevSub);
          next.set(currentStep, set);
          return next;
        });

        const nextSub = prevSub + 1;
        if (nextSub < step.substeps.length) return nextSub;

        setCompletedSteps((prev) => new Set(prev).add(currentStep));
        const nextStep = currentStep + 1;
        if (nextStep < steps.length) {
          setCurrentStep(nextStep);
          return 0;
        }
        return prevSub;
      });
    };

    const isArticle = steps[currentStep]?.type === "article";
    const base = isArticle ? 1100 : 1500;
    const jitter = Math.random() * (isArticle ? 600 : 1200);
    timerRef.current = setTimeout(advance, base + jitter);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isVisible, currentStep, currentSubstep, steps]);

  if (!isVisible) return null;

  const StepIcon = ({ step, isComplete, isCurrent }: { step: Step; isComplete: boolean; isCurrent: boolean }) => {
    if (isComplete) {
      return (
        <div className="w-5 h-5 rounded-full bg-green-500/15 flex items-center justify-center">
          <Check className="w-3 h-3 text-green-600" />
        </div>
      );
    }
    if (isCurrent) {
      return (
        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full border-[1.5px] border-primary border-t-transparent animate-spin" />
        </div>
      );
    }
    return <div className="w-5 h-5" />;
  };

  return (
    <div className="fixed inset-0 z-[70] bg-background flex flex-col">
      {/* Soft top gradient */}
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-muted/60 to-transparent pointer-events-none" />

      {/* Logo + destination */}
      <div className="relative pt-14 pb-6 flex flex-col items-center gap-3">
        <SweetSpotsLoader size="sm" />
        <p className="text-[13px] text-muted-foreground tracking-wide">
          {destination || "Planning your trip"}
        </p>
      </div>

      {/* Cards */}
      <div className="relative flex-1 overflow-y-auto px-5 pb-20">
        <div className="max-w-[340px] mx-auto space-y-2.5">
          {steps.map((step, stepIdx) => {
            const isComplete = completedSteps.has(stepIdx);
            const isCurrent = stepIdx === currentStep;
            const isPending = stepIdx > currentStep;
            const stepCompletedSubs = completedSubsteps.get(stepIdx) || new Set();

            if (isPending) return null;

            return (
              <div
                key={stepIdx}
                className={cn(
                  "rounded-2xl px-4 py-3.5 transition-all duration-500",
                  "bg-card border border-border",
                  isCurrent && "shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                )}
                style={{ animation: "fade-up 0.3s ease-out" }}
              >
                {/* Header row */}
                <div className="flex items-center gap-2.5">
                  <StepIcon step={step} isComplete={isComplete} isCurrent={isCurrent} />
                  <span className="text-[13px] font-semibold text-foreground flex-1 leading-tight">
                    {step.label}
                  </span>
                  {step.type === "article" && (
                    <Globe className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                  )}
                  {step.type === "build" && (
                    <Route className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                  )}
                  {step.type === "init" && (
                    <Sparkles className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                  )}
                </div>

                {/* Substeps — articles just show "Reading page" inline */}
                {step.type === "article" && (isCurrent || isComplete) && (
                  <p className="mt-1.5 ml-[30px] text-[11px] text-muted-foreground/70 flex items-center gap-1.5">
                    <Check className="w-2.5 h-2.5 text-green-500" />
                    Reading page
                  </p>
                )}

                {/* Multi-substep cards (init + build) */}
                {step.type !== "article" && (isCurrent || isComplete) && (
                  <div className="mt-2 ml-[30px] space-y-1">
                    {step.substeps.map((sub, subIdx) => {
                      const subDone = stepCompletedSubs.has(subIdx);
                      const subActive = isCurrent && subIdx === currentSubstep && !subDone;
                      const _subPending = !subDone && !subActive;

                      return (
                        <div key={subIdx} className="flex items-center gap-1.5">
                          {subDone ? (
                            <Check className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
                          ) : subActive ? (
                            <div className="w-2.5 h-2.5 flex items-center justify-center flex-shrink-0">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            </div>
                          ) : (
                            <div className="w-2.5 h-2.5 flex-shrink-0" />
                          )}
                          <span className={cn(
                            "text-[11px] leading-tight",
                            subDone ? "text-muted-foreground/70"
                              : subActive ? "text-primary font-medium"
                              : "text-muted-foreground/30"
                          )}>
                            {sub}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GeneratingOverlay;
