import { useMemo, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MapPin, Users, DollarSign, Calendar, X, Sparkles } from "lucide-react";
import type { TripData } from "@/hooks/useTrip";
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

const TemplatePreviewSheet = ({ open, onOpenChange, template, onUseItinerary }: Props) => {
  const [showUseDialog, setShowUseDialog] = useState(false);

  const totalSpots = useMemo(() => {
    if (!template?.tripData?.days) return 0;
    return template.tripData.days.reduce((sum, day) => {
      return sum + day.slots.reduce((s, slot) => s + slot.activities.length, 0);
    }, 0);
  }, [template]);

  if (!template) return null;

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

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* Quick info row */}
            <div className="px-5 pt-4 pb-3 border-b border-border/40">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="w-4 h-4" /> {template.destination}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-4 h-4" /> {template.duration} {template.duration === 1 ? "day" : "days"}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-4 h-4" /> {template.groupSize}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <DollarSign className="w-4 h-4" /> {template.budget}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="w-4 h-4" /> {totalSpots} spots
                </span>
              </div>
              {template.vibes?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {template.vibes.map((v) => (
                    <span key={v} className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                      {v}
                    </span>
                  ))}
                </div>
              )}
              {template.isCommunity && template.authorUsername && (
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
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
            </div>

            {/* Itinerary days (read-only) */}
            <div className="px-5 py-4 space-y-5 pb-32">
              {template.tripData.summary && (
                <p className="text-sm text-muted-foreground leading-relaxed">{template.tripData.summary}</p>
              )}
              {template.tripData.days.map((day, di) => (
                <div key={di}>
                  <div className="flex items-baseline gap-2 mb-3">
                    <h3 className="text-base font-semibold text-foreground">Day {di + 1}</h3>
                    <span className="text-xs text-muted-foreground">{day.label}</span>
                  </div>
                  <div className="space-y-2">
                    {day.slots.map((slot, si) => (
                      <div key={si}>
                        {slot.activities.map((act, ai) => (
                          <div
                            key={ai}
                            className="rounded-2xl bg-muted/50 p-3.5 mb-2"
                          >
                            <div className="flex items-start gap-3">
                              <div className="shrink-0 w-12 text-xs font-semibold text-primary pt-0.5">
                                {act.time || slot.time}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground leading-snug">{act.name}</p>
                                {act.category && (
                                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">{act.category}</p>
                                )}
                                {act.description && (
                                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{act.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
