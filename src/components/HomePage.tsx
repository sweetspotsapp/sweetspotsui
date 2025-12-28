import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, DollarSign, Car, TreePine, Star, Sparkles, Users, Coffee, Utensils, Heart, MapPin, RefreshCw } from "lucide-react";
import { useLocation } from "@/hooks/useLocation";
import { useDiscoverySection, DiscoveredPlace } from "@/hooks/useDiscoverySection";
import { useSavedPlaces } from "@/hooks/useSavedPlaces";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Input } from "./ui/input";

// Section configuration
const SECTIONS = [
  { key: 'budget', title: 'Hidden gems under $50', prompt: 'cheap affordable places under $50' },
  { key: 'cbd', title: 'Chill spots near the CBD', prompt: 'chill relaxed spots near CBD city center' },
  { key: 'friends', title: 'Great for friend groups', prompt: 'fun places for friend groups hangout' },
];

// Keyword to chip mapping
const CHIPS = [
  { id: 'budget', label: 'Under $50', icon: DollarSign, keywords: ['cheap', 'budget', 'free', 'affordable'] },
  { id: 'cbd', label: 'Near The CBD', icon: Car, keywords: ['cbd', 'city', 'downtown', 'central'] },
  { id: 'nature', label: 'Nature & Outdoor', icon: TreePine, keywords: ['nature', 'outdoor', 'park', 'beach'] },
];

interface ChipProps {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

const Chip: React.FC<ChipProps> = ({ icon: Icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-4 py-2 rounded-full border whitespace-nowrap transition-all
      ${isActive 
        ? 'bg-primary/10 border-primary text-primary' 
        : 'bg-card border-border text-muted-foreground hover:border-primary/50'
      }
      shadow-sm`}
  >
    <Icon className="w-4 h-4 text-primary" />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

// Format ETA
const formatEta = (seconds: number | null): string => {
  if (seconds === null) return '';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// Format distance
const formatDistance = (meters: number | null): string => {
  if (meters === null) return '';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

interface PlaceCardProps {
  place: DiscoveredPlace;
  onSave: (placeId: string) => void;
  isSaved: boolean;
  onClick: () => void;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ place, onSave, isSaved, onClick }) => {
  const [imageError, setImageError] = useState(false);
  
  const getPlaceholderImage = () => {
    const category = place.categories?.[0]?.toLowerCase() || 'place';
    return `https://source.unsplash.com/400x500/?${category},travel&${place.name.slice(0, 3)}`;
  };
  
  const imageUrl = place.photo_url || getPlaceholderImage();
  
  return (
    <div className="flex-shrink-0 w-[140px] relative" onClick={onClick}>
      <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-muted cursor-pointer">
        <img
          src={imageError ? getPlaceholderImage() : imageUrl}
          alt={place.name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
        
        {/* Save button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave(place.place_id);
          }}
          className="absolute top-2 right-2 p-1.5 bg-card/80 backdrop-blur-sm rounded-full shadow-sm"
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
        </button>
        
        {/* Rating badge */}
        <div className="absolute bottom-12 left-2">
          <div className="flex items-center gap-1 bg-card/95 backdrop-blur-sm px-2 py-1 rounded-full shadow-soft">
            <Star className="w-3 h-3 text-primary fill-primary" />
            <span className="text-xs font-medium text-foreground">{place.rating || 5}</span>
          </div>
        </div>
      </div>
      
      {/* Price/ETA badge */}
      <div className="mt-2 flex justify-start">
        <div className="flex items-center gap-1 bg-card border border-border px-2 py-1 rounded-full shadow-sm">
          <DollarSign className="w-3 h-3 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            {place.eta_seconds ? formatEta(place.eta_seconds) : 'free - 50'}
          </span>
        </div>
      </div>
    </div>
  );
};

const PlaceCardSkeleton = () => (
  <div className="flex-shrink-0 w-[140px]">
    <Skeleton className="aspect-[3/4] rounded-2xl" />
    <Skeleton className="h-6 w-20 mt-2 rounded-full" />
  </div>
);

interface SectionRowProps {
  title: string;
  places: DiscoveredPlace[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onPlaceClick: (place: DiscoveredPlace) => void;
  toggleSave: (placeId: string) => void;
  isSaved: (placeId: string) => boolean;
}

const SectionRow: React.FC<SectionRowProps> = ({
  title,
  places,
  isLoading,
  error,
  onRetry,
  onPlaceClick,
  toggleSave,
  isSaved,
}) => (
  <div className="mb-6">
    <h2 className="text-lg font-semibold text-foreground mb-3 px-4">{title}</h2>
    
    {error ? (
      <div className="px-4 py-4 text-center">
        <p className="text-sm text-destructive mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    ) : isLoading ? (
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {[1, 2, 3, 4].map(i => <PlaceCardSkeleton key={i} />)}
      </div>
    ) : places.length === 0 ? (
      <div className="px-4 py-4 text-center">
        <p className="text-sm text-muted-foreground">No places found nearby</p>
      </div>
    ) : (
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {places.map(place => (
          <PlaceCard
            key={place.place_id}
            place={place}
            onSave={toggleSave}
            isSaved={isSaved(place.place_id)}
            onClick={() => onPlaceClick(place)}
          />
        ))}
      </div>
    )}
  </div>
);

// Location permission CTA
const LocationCTA: React.FC<{
  onRetry: () => void;
  onManualInput: (lat: number, lng: number) => void;
}> = ({ onRetry, onManualInput }) => {
  const [showManual, setShowManual] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const handleSubmit = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      onManualInput(lat, lng);
    }
  };

  return (
    <div className="px-4 py-8 text-center">
      <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">Location Access Needed</h3>
      <p className="text-sm text-muted-foreground mb-4">
        We need your location to find places near you. Please enable location access in your browser settings.
      </p>
      <Button onClick={onRetry} className="mb-3">
        Try Again
      </Button>
      <button
        onClick={() => setShowManual(!showManual)}
        className="block mx-auto text-sm text-primary underline"
      >
        Or enter location manually
      </button>
      
      {showManual && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2 justify-center">
            <Input
              type="number"
              placeholder="Latitude"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              className="w-32"
              step="any"
            />
            <Input
              type="number"
              placeholder="Longitude"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              className="w-32"
              step="any"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleSubmit}>
            Use This Location
          </Button>
        </div>
      )}
    </div>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const { location, isLoading: locationLoading, error: locationError, permissionDenied, requestLocation, setManualLocation } = useLocation();
  const { toggleSave, isSaved } = useSavedPlaces();
  
  const [activeChip, setActiveChip] = useState<string | null>(null);

  // Discovery hooks for each section
  const section1 = useDiscoverySection('section1', 4000);
  const section2 = useDiscoverySection('section2', 5000);
  const section3 = useDiscoverySection('section3', 4000);

  // Trigger discovery when location becomes available
  useEffect(() => {
    if (!location) return;

    section1.discover(SECTIONS[0].prompt, location);
    section2.discover(SECTIONS[1].prompt, location);
    section3.discover(SECTIONS[2].prompt, location);
  }, [location]);

  const handlePlaceClick = (place: DiscoveredPlace) => {
    navigate(`/place/${place.place_id}`);
  };

  const handleManualLocation = (lat: number, lng: number) => {
    setManualLocation({ lat, lng });
  };

  // Show location permission CTA if denied
  if (permissionDenied && !location) {
    return (
      <div className="min-h-screen bg-background max-w-[420px] mx-auto pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <button className="p-2 -ml-2 text-muted-foreground">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-primary">SweetSpots</h1>
            <button className="p-2 -mr-2 text-muted-foreground">
              <Search className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <LocationCTA
          onRetry={requestLocation}
          onManualInput={handleManualLocation}
        />
      </div>
    );
  }

  // Show loading while getting location
  if (locationLoading || !location) {
    return (
      <div className="min-h-screen bg-background max-w-[420px] mx-auto pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <button className="p-2 -ml-2 text-muted-foreground">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-primary">SweetSpots</h1>
            <button className="p-2 -mr-2 text-muted-foreground">
              <Search className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Getting your location...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[420px] mx-auto relative pb-24">
      {/* Top App Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-primary">SweetSpots</h1>
          <button className="p-2 -mr-2 text-primary hover:text-primary/80 transition-colors">
            <Search className="w-6 h-6" />
          </button>
        </div>

        {/* Chip Row */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-4 scrollbar-hide">
          {CHIPS.map((chip) => (
            <Chip
              key={chip.id}
              icon={chip.icon}
              label={chip.label}
              isActive={activeChip === chip.id}
              onClick={() => setActiveChip(activeChip === chip.id ? null : chip.id)}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-2">
        <SectionRow
          title={SECTIONS[0].title}
          places={section1.places}
          isLoading={section1.isLoading}
          error={section1.error}
          onRetry={section1.retry}
          onPlaceClick={handlePlaceClick}
          toggleSave={toggleSave}
          isSaved={isSaved}
        />
        
        <SectionRow
          title={SECTIONS[1].title}
          places={section2.places}
          isLoading={section2.isLoading}
          error={section2.error}
          onRetry={section2.retry}
          onPlaceClick={handlePlaceClick}
          toggleSave={toggleSave}
          isSaved={isSaved}
        />
        
        <SectionRow
          title={SECTIONS[2].title}
          places={section3.places}
          isLoading={section3.isLoading}
          error={section3.error}
          onRetry={section3.retry}
          onPlaceClick={handlePlaceClick}
          toggleSave={toggleSave}
          isSaved={isSaved}
        />
      </main>
    </div>
  );
};

export default HomePage;
