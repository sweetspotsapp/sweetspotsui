import { useMemo, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import type { TripData, TripParams } from "@/hooks/useTrip";
import TripView from "./TripView";
import UseItineraryDialog from "./UseItineraryDialog";

export interface TemplatePreviewData {
  id: string;
  title: string;
  destination: string;
  duration: number;
  vibes: string[];
  budget: string;
  groupSize: number;
  tagline: string | null;
  image?: string;
  tripData: TripData;
  authorUsername?: string | null;
  authorAvatarUrl?: string | null;
  isCommunity?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplatePreviewData | null;
  onUseItinerary: (overrides: { name: string; startDate: string }) => void;
}

const noop = () => {};
const noopAsync = async () => undefined;

const TemplatePreviewSheet = ({ open, onOpenChange, template, onUseItinerary }: Props) => {
  const [showUseDialog, setShowUseDialog] = useState(false);

  // Build the TripParams shape that TripView expects, derived from the template
  const tripParams = useMemo<TripParams | null>(() => {
    if (!template) return null;
    const today = new Date();
    const start = today.toISOString().slice(0, 10);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + Math.max(0, template.duration - 1));
    const end = endDate.toISOString().slice(0, 10);
    return {
      name: template.title,
      destination: template.destination,
      startDate: start,
      endDate: end,
      budget: template.budget,
      groupSize: template.groupSize,
      vibes: template.vibes ?? [],
      mustIncludePlaceIds: [],
      boardIds: [],
    };
  }, [template]);

  if (!template || !tripParams) return null;

  const handleConfirm = (overrides: { name: string; startDate: string }) => {
    setShowUseDialog(false);
    onOpenChange(false);
    onUseItinerary(overrides);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="p-0 h-[92vh] rounded-t-3xl border-t border-border/40 bg-background flex flex-col overflow-hidden"
        >
          {/* Hero image header */}
          <div className="relative h-36 shrink-0 bg-muted">
            {template.image && (
              <img
                src={template.image}
                alt={template.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[11px] font-semibold text-foreground uppercase tracking-wide">Template</span>
            </div>
            <div className="absolute bottom-3 left-5 right-5">
              <h2 className="text-xl font-bold text-white tracking-tight">{template.title}</h2>
              {template.tagline && (
                <p className="text-xs text-white/85 mt-0.5 line-clamp-1">{template.tagline}</p>
              )}
            </div>
          </div>

          {/* Read-only TripView mirrors My Trips detail */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {template.isCommunity && template.authorUsername && (
              <div className="px-5 pt-3 -mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                {template.authorAvatarUrl ? (
                  <img src={template.authorAvatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-semibold flex items-center justify-center">
                    {template.authorUsername[0]?.toUpperCase()}
                  </div>
                )}
                <span>Curated by {template.authorUsername}</span>
              </div>
            )}
            <div className="pb-32">
              <TripView
                tripData={template.tripData}
                tripParams={tripParams}
                tripId={null}
                readOnly
                hideBack
                onBack={noop}
                onSwap={noopAsync}
                onReplace={noop}
                onRemoveActivity={noop}
                onAddActivity={noop}
                onDragReorder={noop}
                isSwapping={false}
                isGenerating={false}
                onRegenerate={noop}
              />
            </div>
          </div>

          {/* Sticky CTA */}
          <div className="shrink-0 border-t border-border/40 bg-background/95 backdrop-blur-sm px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => setShowUseDialog(true)}
            >
              Use Itinerary
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <UseItineraryDialog
        open={showUseDialog}
        onOpenChange={setShowUseDialog}
        defaultName={`${template.destination} Trip`}
        duration={template.duration}
        onConfirm={handleConfirm}
      />
    </>
  );
};

export default TemplatePreviewSheet;
