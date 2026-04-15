import { useMemo } from "react";
import { Clock } from "lucide-react";

interface PopularTimesData {
  [day: string]: number[]; // 24 hours, values 0-100
}

interface PopularTimesChartProps {
  popularTimes: PopularTimesData | null;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const _SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PopularTimesChart = ({ popularTimes }: PopularTimesChartProps) => {
  const today = new Date().getDay();
  const currentHour = new Date().getHours();
  const todayName = DAY_NAMES[today];

  const todayData = useMemo(() => {
    if (!popularTimes) return null;
    return popularTimes[todayName] || popularTimes[String(today)] || null;
  }, [popularTimes, todayName, today]);

  if (!popularTimes || !todayData || todayData.length === 0) return null;

  // Show hours 6am to 11pm (indices 6-23)
  const startHour = 6;
  const endHour = 23;
  const visibleHours = todayData.slice(startHour, endHour + 1);
  const maxValue = Math.max(...visibleHours, 1);

  // Determine busyness label for current hour
  const currentBusyness = todayData[currentHour] || 0;
  const getBusynessLabel = (value: number) => {
    if (value >= 75) return { text: 'Very busy', color: 'text-destructive' };
    if (value >= 50) return { text: 'Busy', color: 'text-orange-500' };
    if (value >= 25) return { text: 'Not too busy', color: 'text-primary' };
    return { text: 'Usually quiet', color: 'text-muted-foreground' };
  };

  const busyness = getBusynessLabel(currentBusyness);

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Popular Times</h3>
        </div>
        <span className={`text-xs font-medium ${busyness.color}`}>
          {busyness.text} right now
        </span>
      </div>

      {/* Day selector */}
      <div className="text-xs text-muted-foreground">{todayName}</div>

      {/* Bar chart */}
      <div className="flex items-end gap-[2px] h-16">
        {visibleHours.map((value, idx) => {
          const hour = startHour + idx;
          const isCurrentHour = hour === currentHour;
          const heightPercent = Math.max((value / maxValue) * 100, 4);

          return (
            <div
              key={hour}
              className="flex-1 flex flex-col items-center gap-0.5"
            >
              <div
                className={`w-full rounded-t-sm transition-all ${
                  isCurrentHour
                    ? 'bg-primary'
                    : 'bg-primary/20'
                }`}
                style={{ height: `${heightPercent}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Hour labels */}
      <div className="flex justify-between text-[9px] text-muted-foreground px-0.5">
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
        <span>11pm</span>
      </div>
    </div>
  );
};

export default PopularTimesChart;
