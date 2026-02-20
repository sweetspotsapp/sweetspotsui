import { Car, Footprints } from "lucide-react";

interface DistanceConnectorProps {
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
  durationText?: string;
  distanceText?: string;
}

// Haversine formula to calculate distance between two coordinates
const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const DistanceConnector = ({ fromLat, fromLng, toLat, toLng, durationText, distanceText }: DistanceConnectorProps) => {
  if (!fromLat || !fromLng || !toLat || !toLng) return null;

  // Use pre-computed Routes API data if available, otherwise fall back to Haversine
  const hasRouteData = !!durationText && !!distanceText;
  
  const distanceKm = haversineDistance(fromLat, fromLng, toLat, toLng);
  const isWalkable = hasRouteData 
    ? distanceText.includes('m') && !distanceText.includes('km') && parseInt(distanceText) < 1500
    : distanceKm < 1.5;
  const fallbackMinutes = isWalkable 
    ? Math.round(distanceKm / 0.08)
    : Math.round(distanceKm / 0.5);

  const displayDistance = hasRouteData ? distanceText : (distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`);
  const displayDuration = hasRouteData ? durationText : `${fallbackMinutes} min`;

  return (
    <div className="flex items-center gap-2 px-6 py-1">
      {/* Vertical line */}
      <div className="flex flex-col items-center">
        <div className="w-px h-3 bg-border" />
        <div className="w-1.5 h-1.5 rounded-full bg-border" />
        <div className="w-px h-3 bg-border" />
      </div>
      
      {/* Distance info */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {isWalkable ? (
          <Footprints className="w-3 h-3" />
        ) : (
          <Car className="w-3 h-3" />
        )}
        <span>{displayDistance}</span>
        <span className="text-border">·</span>
        <span>{displayDuration}</span>
      </div>
    </div>
  );
};

export default DistanceConnector;
