import { useState, useEffect, useCallback, useMemo, forwardRef } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import { Star, MapPin, Loader2, Navigation } from "lucide-react";
import type { RankedPlace } from "@/hooks/useSearch";
import { supabase } from "@/integrations/supabase/client";

interface BoardMapViewProps {
  places: RankedPlace[];
  userLocation: { lat: number; lng: number } | null;
  onPlaceClick: (place: RankedPlace) => void;
  getPlaceImage: (place: RankedPlace) => string;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = { lat: 40.7128, lng: -74.006 }; // NYC fallback

// Inner component that renders after Google Maps is loaded
interface MapContentProps {
  places: RankedPlace[];
  userLocation: { lat: number; lng: number } | null;
  onPlaceClick: (place: RankedPlace) => void;
  getPlaceImage: (place: RankedPlace) => string;
  center: { lat: number; lng: number };
  validPlaces: RankedPlace[];
}

const MapContent = ({ places, userLocation, onPlaceClick, getPlaceImage, center, validPlaces }: MapContentProps) => {
  const [selectedPlace, setSelectedPlace] = useState<RankedPlace | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // Calculate map bounds to fit all markers
  const fitBounds = useCallback((mapInstance: google.maps.Map) => {
    if (validPlaces.length === 0) return;
    
    const bounds = new google.maps.LatLngBounds();
    validPlaces.forEach(place => {
      if (place.lat && place.lng) {
        bounds.extend({ lat: place.lat, lng: place.lng });
      }
    });
    
    if (userLocation) {
      bounds.extend(userLocation);
    }
    
    mapInstance.fitBounds(bounds, { top: 50, bottom: 100, left: 50, right: 50 });
  }, [validPlaces, userLocation]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    fitBounds(mapInstance);
  }, [fitBounds]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Update bounds when places change
  useEffect(() => {
    if (map) {
      fitBounds(map);
    }
  }, [map, fitBounds]);

  const mapOptions: google.maps.MapOptions = useMemo(() => ({
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    styles: [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
    ],
  }), []);

  return (
    <>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {/* User Location Marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#3B82F6",
              fillOpacity: 1,
              strokeColor: "#FFFFFF",
              strokeWeight: 3,
            }}
            title="Your location"
          />
        )}

        {/* Place Markers */}
        {validPlaces.map((place) => (
          <Marker
            key={place.place_id}
            position={{ lat: place.lat!, lng: place.lng! }}
            onClick={() => setSelectedPlace(place)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#E11D48",
              fillOpacity: 1,
              strokeColor: "#FFFFFF",
              strokeWeight: 2,
            }}
            title={place.name}
          />
        ))}

        {/* Info Window */}
        {selectedPlace && selectedPlace.lat && selectedPlace.lng && (
          <InfoWindow
            position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
            onCloseClick={() => setSelectedPlace(null)}
            options={{ pixelOffset: new google.maps.Size(0, -12) }}
          >
            <div 
              className="p-1 cursor-pointer min-w-[180px]"
              onClick={() => onPlaceClick(selectedPlace)}
            >
              <div className="flex gap-3">
                <img 
                  src={getPlaceImage(selectedPlace)} 
                  alt={selectedPlace.name}
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex flex-col justify-center min-w-0">
                  <h4 className="font-semibold text-sm text-gray-900 line-clamp-2">
                    {selectedPlace.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedPlace.rating && (
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs text-gray-600">
                          {selectedPlace.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    <span className="text-xs text-gray-500 capitalize line-clamp-1">
                      {selectedPlace.categories?.[0]?.replace(/_/g, " ") || "Place"}
                    </span>
                  </div>
                  <button 
                    className="mt-2 text-xs font-medium text-rose-600 hover:underline text-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlaceClick(selectedPlace);
                    }}
                  >
                    View Details →
                  </button>
                </div>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Places count badge */}
      <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-border z-10">
        <span className="text-sm font-medium text-foreground">
          {validPlaces.length} {validPlaces.length === 1 ? 'spot' : 'spots'}
        </span>
      </div>

      {/* Center on user location button */}
      {userLocation && map && (
        <button
          onClick={() => map.panTo(userLocation)}
          className="absolute bottom-4 right-4 p-3 bg-background/95 backdrop-blur-sm rounded-full shadow-lg border border-border hover:bg-muted transition-colors z-10"
        >
          <Navigation className="w-5 h-5 text-primary" />
        </button>
      )}
    </>
  );
};

// Main component that handles API key fetching and LoadScript
const BoardMapView = forwardRef<HTMLDivElement, BoardMapViewProps>(
  ({ places, userLocation, onPlaceClick, getPlaceImage }, ref) => {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [isLoadingKey, setIsLoadingKey] = useState(true);
    const [keyError, setKeyError] = useState(false);

    // Fetch API key from edge function
    useEffect(() => {
      const fetchApiKey = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('get-maps-key');
          if (error || !data?.apiKey) {
            console.error('Error fetching maps key:', error);
            setKeyError(true);
            return;
          }
          setApiKey(data.apiKey);
        } catch (err) {
          console.error('Failed to fetch maps key:', err);
          setKeyError(true);
        } finally {
          setIsLoadingKey(false);
        }
      };
      fetchApiKey();
    }, []);

    // Calculate center from places or user location
    const center = useMemo(() => {
      if (userLocation) return userLocation;
      
      const validPlaces = places.filter(p => p.lat && p.lng);
      if (validPlaces.length === 0) return defaultCenter;
      
      const avgLat = validPlaces.reduce((sum, p) => sum + (p.lat || 0), 0) / validPlaces.length;
      const avgLng = validPlaces.reduce((sum, p) => sum + (p.lng || 0), 0) / validPlaces.length;
      
      return { lat: avgLat, lng: avgLng };
    }, [places, userLocation]);

    const validPlaces = useMemo(() => places.filter(p => p.lat && p.lng), [places]);

    if (isLoadingKey) {
      return (
        <div ref={ref} className="flex-1 flex items-center justify-center bg-muted/30">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      );
    }

    if (keyError || !apiKey) {
      return (
        <div ref={ref} className="flex-1 flex items-center justify-center bg-muted/30">
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <MapPin className="w-12 h-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Unable to load map. Please try again later.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className="flex-1 relative">
        <LoadScript 
          googleMapsApiKey={apiKey}
          loadingElement={
            <div className="flex-1 flex items-center justify-center bg-muted/30 absolute inset-0">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Initializing map...</p>
              </div>
            </div>
          }
        >
          <MapContent
            places={places}
            userLocation={userLocation}
            onPlaceClick={onPlaceClick}
            getPlaceImage={getPlaceImage}
            center={center}
            validPlaces={validPlaces}
          />
        </LoadScript>
      </div>
    );
  }
);

BoardMapView.displayName = 'BoardMapView';

export default BoardMapView;
