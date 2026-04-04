import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlanItNudgeProps {
  city: string;
  spotCount: number;
  onPlanTrip: (city: string) => void;
}

const PlanItNudge = ({ city, spotCount, onPlanTrip }: PlanItNudgeProps) => {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-primary/15 to-primary/5 p-5 border border-primary/10">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {spotCount} spots saved in {city}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ready to plan your trip?
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => onPlanTrip(city)}
          className="shrink-0 gap-1.5"
        >
          Plan it
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default PlanItNudge;
