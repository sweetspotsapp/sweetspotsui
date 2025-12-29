import { useState } from 'react';
import { Navigation, DollarSign, Clock, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface OpeningHour {
  day: string;
  hours: string;
  isToday: boolean;
}

interface TrafficHour {
  time: string;
  level: number; // 1-5
}

interface QuickInfoSectionProps {
  distance: number;
  priceRange: string;
  openingHours: OpeningHour[];
  trafficHours: TrafficHour[];
}

const QuickInfoSection = ({ distance, priceRange, openingHours, trafficHours }: QuickInfoSectionProps) => {
  const [showAllHours, setShowAllHours] = useState(false);
  
  const todayHours = openingHours.find(h => h.isToday);
  const isOpen = true; // Mock - would calculate based on current time

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
        <div className="flex items-center gap-1.5 bg-secondary/80 px-4 py-2.5 rounded-2xl">
          <DollarSign className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{priceRange}</span>
        </div>

        {/* Open Status */}
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl ${isOpen ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className={`text-sm font-medium ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
            {isOpen ? 'Open Now' : 'Closed'}
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

      {/* Traffic / Busy Hours */}
      <div className="bg-secondary/50 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Busy Hours Today</span>
        </div>
        
        <div className="flex items-end gap-1.5 h-16">
          {trafficHours.map((hour, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div 
                className="w-full rounded-t-lg transition-all duration-300"
                style={{ 
                  height: `${(hour.level / 5) * 100}%`,
                  backgroundColor: hour.level >= 4 
                    ? 'hsl(var(--primary))' 
                    : hour.level >= 3 
                      ? 'hsl(var(--primary) / 0.6)' 
                      : 'hsl(var(--primary) / 0.3)',
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between px-1">
          {trafficHours.map((hour, i) => (
            <span key={i} className="text-[10px] text-muted-foreground">{hour.time}</span>
          ))}
        </div>
        
        <p className="text-xs text-muted-foreground text-center pt-1">
          🔥 Peak hours: 12pm & 6pm — plan accordingly!
        </p>
      </div>
    </div>
  );
};

export default QuickInfoSection;
