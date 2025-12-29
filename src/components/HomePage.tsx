import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, ChevronRight, RefreshCw, MapPin } from "lucide-react";
import { useLocation } from "@/hooks/useLocation";
import { useDiscoverySection, DiscoveredPlace } from "@/hooks/useDiscoverySection";
import { useSavedPlaces } from "@/hooks/useSavedPlaces";
import { useApp } from "@/context/AppContext";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Input } from "./ui/input";
import SlideOutMenu from "./SlideOutMenu";
import PlaceCardCompact from "./PlaceCardCompact";

// Skeleton for place cards
const PlaceCardSkeleton = ({ featured = false }: { featured?: boolean }) => (
  <div className={`flex-shrink-0 ${featured ? 'w-[200px]' : 'w-[160px]'}`}>
    <Skeleton className={`rounded-2xl ${featured ? 'aspect-[4/3]' : 'aspect-[3/4]'}`} />
    <Skeleton className="h-4 w-3/4 mt-2.5 rounded" />
    <Skeleton className="h-3 w-full mt-1.5 rounded" />
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
  featured?: boolean;
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
  featured = false,
}) => (
  <div className="mb-8">
    {/* Section Header */}
    <div className="flex items-center justify-between px-4 mb-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <button className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
        See all
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>

    {error ? (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-destructive mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    ) : isLoading ? (
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {[1, 2, 3, 4].map(i => <PlaceCardSkeleton key={i} featured={featured} />)}
      </div>
    ) : places.length === 0 ? (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">No places found nearby</p>
      </div>
    ) : (
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {places.map(place => (
          <PlaceCardCompact
            key={place.place_id}
            place={place}
            onSave={toggleSave}
            isSaved={isSaved(place.place_id)}
            onClick={() => onPlaceClick(place)}
            featured={featured}
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
    <div className="px-4 py-12 text-center">
      <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">Location Access Needed</h3>
      <p className="text-sm text-muted-foreground mb-4">
        We need your location to find places near you.
      </p>
      <Button onClick={onRetry} className="mb-3">
        Enable Location
      </Button>
      <button
        onClick={() => setShowManual(!showManual)}
        className="block mx-auto text-sm text-primary underline"
      >
        Or enter manually
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
  const { location, isLoading: locationLoading, permissionDenied, requestLocation, setManualLocation } = useLocation();
  const { toggleSave, isSaved } = useSavedPlaces();
  const { sections, userMood } = useApp();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Discovery hooks for each section
  const topPicks = useDiscoverySection('topPicks', 4000);
  const section1 = useDiscoverySection('section1', 4000);
  const section2 = useDiscoverySection('section2', 5000);
  const section3 = useDiscoverySection('section3', 4000);

  // Trigger discovery when location becomes available
  useEffect(() => {
    if (!location) return;

    // Top picks based on user mood or generic
    const topPicksPrompt = userMood 
      ? `best places for ${userMood}` 
      : 'top rated popular places';
    topPicks.discover(topPicksPrompt, location);

    // Dynamic sections
    if (sections[0]) {
      section1.discover(sections[0].prompt, location);
    }
    if (sections[1]) {
      section2.discover(sections[1].prompt, location);
    }
    if (sections[2]) {
      section3.discover(sections[2].prompt, location);
    }
  }, [location, sections, userMood]);

  const handlePlaceClick = (place: DiscoveredPlace) => {
    navigate(`/place/${place.place_id}`);
  };

  const handleManualLocation = (lat: number, lng: number) => {
    setManualLocation({ lat, lng });
  };

  const handleFilterSelect = (filter: string) => {
    setActiveFilter(filter === activeFilter ? null : filter || null);
    // TODO: Apply filter to discovery
  };

  // Header component (reused in all states)
  const Header = () => (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
      <div className="flex items-center justify-between px-4 py-3">
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="p-2 -ml-2 text-foreground hover:text-primary transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-primary">SweetSpots</h1>
        <button className="p-2 -mr-2 text-foreground hover:text-primary transition-colors">
          <Search className="w-6 h-6" />
        </button>
      </div>
    </div>
  );

  // Show location permission CTA if denied
  if (permissionDenied && !location) {
    return (
      <div className="min-h-screen bg-background max-w-[420px] mx-auto pb-24">
        <Header />
        <SlideOutMenu 
          isOpen={isMenuOpen} 
          onClose={() => setIsMenuOpen(false)}
          onFilterSelect={handleFilterSelect}
          activeFilter={activeFilter}
        />
        <LocationCTA onRetry={requestLocation} onManualInput={handleManualLocation} />
      </div>
    );
  }

  // Show loading while getting location
  if (locationLoading || !location) {
    return (
      <div className="min-h-screen bg-background max-w-[420px] mx-auto pb-24">
        <Header />
        <SlideOutMenu 
          isOpen={isMenuOpen} 
          onClose={() => setIsMenuOpen(false)}
          onFilterSelect={handleFilterSelect}
          activeFilter={activeFilter}
        />
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Finding spots near you...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[420px] mx-auto relative pb-24">
      <Header />

      {/* Slide-out Menu */}
      <SlideOutMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)}
        onFilterSelect={handleFilterSelect}
        activeFilter={activeFilter}
      />

      {/* User Prompt Display (subtle) */}
      {userMood && (
        <div className="px-4 pt-4 pb-2">
          <p className="text-sm text-muted-foreground italic">
            "{userMood}"
          </p>
        </div>
      )}

      {/* Main Content */}
      <main className="pt-4">
        {/* Top Picks Section (featured cards) */}
        <SectionRow
          title={userMood ? `Top picks for ${userMood.split(',')[0].trim()}` : "Top picks for you"}
          places={topPicks.places.slice(0, 4)}
          isLoading={topPicks.isLoading}
          error={topPicks.error}
          onRetry={topPicks.retry}
          onPlaceClick={handlePlaceClick}
          toggleSave={toggleSave}
          isSaved={isSaved}
          featured
        />

        {/* Dynamic category sections */}
        {sections[0] && (
          <SectionRow
            title={sections[0].title}
            places={section1.places}
            isLoading={section1.isLoading}
            error={section1.error}
            onRetry={section1.retry}
            onPlaceClick={handlePlaceClick}
            toggleSave={toggleSave}
            isSaved={isSaved}
          />
        )}

        {sections[1] && (
          <SectionRow
            title={sections[1].title}
            places={section2.places}
            isLoading={section2.isLoading}
            error={section2.error}
            onRetry={section2.retry}
            onPlaceClick={handlePlaceClick}
            toggleSave={toggleSave}
            isSaved={isSaved}
          />
        )}

        {sections[2] && (
          <SectionRow
            title={sections[2].title}
            places={section3.places}
            isLoading={section3.isLoading}
            error={section3.error}
            onRetry={section3.retry}
            onPlaceClick={handlePlaceClick}
            toggleSave={toggleSave}
            isSaved={isSaved}
          />
        )}
      </main>
    </div>
  );
};

export default HomePage;
