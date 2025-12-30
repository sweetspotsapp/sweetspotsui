import { useState } from 'react';
import { Navigation, DollarSign, Clock, ChevronDown, ChevronUp, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OpeningHour {
  day: string;
  hours: string;
  isToday: boolean;
}

interface PriceInfo {
  symbol: string;
  estimate: string;
}

interface QuickInfoSectionProps {
  distance: number;
  priceRange: string | PriceInfo;
  openingHours: OpeningHour[];
  isOpen?: boolean | null;
}

const QuickInfoSection = ({ distance, priceRange, openingHours, isOpen }: QuickInfoSectionProps) => {
  const [showAllHours, setShowAllHours] = useState(false);
  
  const todayHours = openingHours.find(h => h.isToday);
  // Use real isOpen data if available, otherwise default to true
  const isOpenNow = isOpen ?? true;

  return (
    <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
      {/* Quick Info Pills */}
      <div className="flex flex-wrap gap-2">
        {/* Distance */}
        <div className="flex items-center gap-2 bg-secondary/80 px-4 py-2.5 rounded-2xl">
          <Navigation className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{distance} km away</span>
        </div>

        {/* Price Range */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 bg-secondary/80 px-4 py-2.5 rounded-2xl cursor-help">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {typeof priceRange === 'string' ? priceRange : priceRange.symbol}
                </span>
                {typeof priceRange !== 'string' && (
                  <>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({priceRange.estimate})
                    </span>
                    <Info className="w-3 h-3 text-muted-foreground ml-0.5" />
                  </>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="text-xs">Estimated based on category. Actual prices may vary.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Open Status */}
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl ${isOpenNow ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <div className={`w-2 h-2 rounded-full ${isOpenNow ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className={`text-sm font-medium ${isOpenNow ? 'text-green-600' : 'text-red-600'}`}>
            {isOpenNow ? 'Open Now' : 'Closed'}
          </span>
        </div>
      </div>

      {/* Opening Hours */}
      <div className="bg-secondary/50 rounded-2xl p-4 space-y-3">
        <button 
          onClick={() => setShowAllHours(!showAllHours)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Opening Hours</span>
          </div>
          {showAllHours ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Today's hours always visible */}
        {todayHours && (
          <div className="flex justify-between items-center py-2 px-3 bg-primary/5 rounded-xl">
            <span className="text-sm font-medium text-primary">Today</span>
            <span className="text-sm font-semibold text-foreground">{todayHours.hours}</span>
          </div>
        )}

        {/* All hours (expandable) */}
        {showAllHours && (
          <div className="space-y-1.5 pt-1">
            {openingHours.filter(h => !h.isToday).map((hour) => (
              <div key={hour.day} className="flex justify-between items-center py-1.5 px-3">
                <span className="text-sm text-muted-foreground">{hour.day}</span>
                <span className="text-sm text-foreground">{hour.hours}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickInfoSection;
