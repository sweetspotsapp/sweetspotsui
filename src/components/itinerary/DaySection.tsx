import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import ActivityCard from "./ActivityCard";
import DistanceConnector from "./DistanceConnector";
import type { ItineraryDay, SwapAlternative } from "@/hooks/useItinerary";

interface DaySectionProps {
  day: ItineraryDay;
  dayIndex: number;
  onSwap: (dayIndex: number, slotIndex: number, activityIndex: number) => Promise<SwapAlternative[] | undefined>;
  onReorder: (dayIndex: number, slotIndex: number, fromIdx: number, toIdx: number) => void;
  onReplace: (dayIndex: number, slotIndex: number, activityIndex: number, newActivity: { name: string; description: string; category: string }) => void;
  isSwapping: boolean;
}

const TIME_ICONS: Record<string, string> = {
  Morning: "🌅",
  Afternoon: "☀️",
  Evening: "🌙",
};

const DaySection = ({ day, dayIndex, onSwap, onReorder, onReplace, isSwapping }: DaySectionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  // Calculate day total cost
  const dayTotal = day.slots.reduce((total, slot) => 
    total + slot.activities.reduce((sum, a) => sum + (a.estimatedCost || 0), 0), 0
  );

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {/* Day Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-bold text-primary">{dayIndex + 1}</span>
        </div>
        <div className="flex-1">
          <span className="text-sm font-semibold text-foreground">{day.label}</span>
          <span className="text-xs text-muted-foreground block">
            {day.slots.reduce((acc, s) => acc + s.activities.length, 0)} activities
            {dayTotal > 0 && ` · ~$${dayTotal}/pp`}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Time Slots */}
      {isOpen && (
        <div className="border-t border-border">
          {day.slots.map((slot, slotIndex) => (
            <div key={slotIndex} className={cn(slotIndex > 0 && "border-t border-border/50")}>
              {/* Slot Header */}
              <div className="px-4 py-2 bg-muted/20">
                <span className="text-xs font-medium text-muted-foreground">
                  {TIME_ICONS[slot.time] || "📍"} {slot.time}
                </span>
              </div>

              {/* Activities with distance connectors */}
              <div className="px-3 py-2 space-y-0">
                {slot.activities.map((activity, activityIndex) => (
                  <div key={activityIndex}>
                    <ActivityCard
                      activity={activity}
                      onSwap={() => onSwap(dayIndex, slotIndex, activityIndex)}
                      onMoveUp={activityIndex > 0 ? () => onReorder(dayIndex, slotIndex, activityIndex, activityIndex - 1) : undefined}
                      onMoveDown={activityIndex < slot.activities.length - 1 ? () => onReorder(dayIndex, slotIndex, activityIndex, activityIndex + 1) : undefined}
                      onReplace={(newAct) => onReplace(dayIndex, slotIndex, activityIndex, newAct)}
                      isSwapping={isSwapping}
                    />
                    {/* Distance connector to next activity */}
                    {activityIndex < slot.activities.length - 1 && (
                      <DistanceConnector
                        fromLat={activity.lat}
                        fromLng={activity.lng}
                        toLat={slot.activities[activityIndex + 1].lat}
                        toLng={slot.activities[activityIndex + 1].lng}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DaySection;
