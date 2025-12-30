import { MapPin, ExternalLink } from 'lucide-react';

interface MapPreviewProps {
  lat: number;
  lng: number;
  placeName: string;
  address?: string | null;
}

const MapPreview = ({ lat, lng, placeName, address }: MapPreviewProps) => {
  // Generate static map URL using Google Static Maps API via our edge function
  const mapImageUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=400x200&scale=2&markers=color:red%7C${lat},${lng}&style=feature:poi%7Cvisibility:off&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}`;
  
  // Fallback to OpenStreetMap static tiles if no Google key
  const osmUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=400x200&markers=${lat},${lng},red-pushpin`;
  
  const handleOpenMaps = () => {
    const query = encodeURIComponent(address || placeName);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${lat},${lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">Location</h3>
      </div>
      
      <button 
        onClick={handleOpenMaps}
        className="relative w-full rounded-2xl overflow-hidden group cursor-pointer"
      >
        {/* Map Image */}
        <div className="aspect-[2/1] bg-muted relative overflow-hidden">
          <img 
            src={osmUrl}
            alt={`Map showing ${placeName}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              // Show a placeholder on error
              e.currentTarget.style.display = 'none';
            }}
          />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent" />
          
          {/* Center pin indicator */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
              <MapPin className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="w-2 h-2 bg-primary rounded-full mx-auto -mt-1" />
          </div>
        </div>
        
        {/* Address bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {address || placeName}
            </p>
            <p className="text-xs text-muted-foreground">Tap to open in Maps</p>
          </div>
          <ExternalLink className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
        </div>
      </button>
    </div>
  );
};

export default MapPreview;
