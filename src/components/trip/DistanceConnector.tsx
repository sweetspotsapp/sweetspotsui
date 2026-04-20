import { Car, Footprints } from "lucide-react";
import { haversineKm } from "@/lib/placeUtils";

interface DistanceConnectorProps {
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
  durationText?: string;
  distanceText?: string;
}

const DistanceConnector = ({ fromLat, fromLng, toLat, toLng, durationText, distanceText }: DistanceConnectorProps) => {
  if (!fromLat || !fromLng || !toLat || !toLng) return null;

  // Use pre-computed Routes API data if available, otherwise fall back to Haversine
  const hasRouteData = !!durationText && !!distanceText;
  
  const distanceKm = haversineKm(fromLat, fromLng, toLat, toLng);
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
        <div className="w-px h-3 bg-background/30" />
        <div className="w-1.5 h-1.5 rounded-full bg-background/30" />
        <div className="w-px h-3 bg-background/30" />
      </div>
      
      {/* Distance info */}
      <div className="flex items-center gap-1.5 text-xs text-background font-medium">
        {isWalkable ? (
          <Footprints className="w-3 h-3" />
        ) : (
          <Car className="w-3 h-3" />
        )}
        <span>{displayDistance}</span>
        <span className="text-background/40">·</span>
        <span>{displayDuration}</span>
      </div>
    </div>
  );
};

export default DistanceConnector;
