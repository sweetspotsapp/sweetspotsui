import { useState } from "react";
import TripSetupForm from "./itinerary/TripSetupForm";
import ItineraryView from "./itinerary/ItineraryView";
import { useItinerary, type ItineraryData, type TripParams } from "@/hooks/useItinerary";

const ItineraryPage = () => {
  const [phase, setPhase] = useState<"setup" | "view">("setup");
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null);
  const [tripParams, setTripParams] = useState<TripParams | null>(null);
  const { generate, swap, isGenerating, isSwapping } = useItinerary();

  const handleGenerate = async (params: TripParams) => {
    setTripParams(params);
    const result = await generate(params);
    if (result) {
      setItinerary(result);
      setPhase("view");
    }
  };

  const handleSwap = async (dayIndex: number, slotIndex: number, activityIndex: number) => {
    if (!itinerary || !tripParams) return;
    const day = itinerary.days[dayIndex];
    const slot = day.slots[slotIndex];
    const activity = slot.activities[activityIndex];
    
    const alternatives = await swap({
      destination: tripParams.destination,
      vibes: tripParams.vibes,
      budget: tripParams.budget,
      dayLabel: day.label,
      timeSlot: slot.time,
      currentActivity: activity.name,
      category: activity.category,
    });
    return alternatives;
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
    updated.days[dayIndex].slots[slotIndex].activities[activityIndex] = {
      ...act,
      name: newActivity.name,
      description: newActivity.description,
      category: newActivity.category,
    };
    setItinerary(updated);
  };

  const handleBack = () => {
    setPhase("setup");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground">
            {phase === "setup" ? "Plan Your Trip" : "Your Itinerary"}
          </h1>
        </div>
      </div>

      {phase === "setup" ? (
        <TripSetupForm onGenerate={handleGenerate} isGenerating={isGenerating} />
      ) : (
        <ItineraryView
          itinerary={itinerary!}
          onBack={handleBack}
          onSwap={handleSwap}
          onReorder={handleReorder}
          onReplace={handleReplaceActivity}
          isSwapping={isSwapping}
          isGenerating={isGenerating}
          onRegenerate={() => tripParams && handleGenerate(tripParams)}
        />
      )}
    </div>
  );
};

export default ItineraryPage;
