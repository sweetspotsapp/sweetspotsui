import { ArrowRight, MapPin } from "lucide-react";

interface PlanItNudgeProps {
  city: string;
  spotCount: number;
  onPlanTrip: (city: string) => void;
}

const PlanItNudge = ({ city, spotCount, onPlanTrip }: PlanItNudgeProps) => {
  return (
    <button
      onClick={() => onPlanTrip(city)}
      className="w-full rounded-2xl border border-primary/20 bg-primary/5 p-5 text-left hover:bg-primary/10 hover:border-primary/30 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
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
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <ArrowRight className="w-4 h-4 text-primary-foreground" />
        </div>
      </div>
    </button>
  );
};

export default PlanItNudge;
