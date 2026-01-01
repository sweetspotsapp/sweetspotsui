import { useCallback, useEffect, useState } from "react";
import { GoogleMap, useJsApiLoader, MarkerF } from "@react-google-maps/api";
import { MockPlace } from "@/components/PlaceCardCompact";
import { supabase } from "@/integrations/supabase/client";

interface SeeAllMapProps {
  places: MockPlace[];
  selectedId: string | null;
  onPinClick: (placeId: string) => void;
  userLocation: { lat: number; lng: number } | null;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = { lat: 14.5995, lng: 120.9842 }; // Manila default

// Inner component that renders the actual map (only mounted when API key is ready)
const GoogleMapInner: React.FC<SeeAllMapProps & { apiKey: string }> = ({
  places,
  selectedId,
  onPinClick,
  userLocation,
  apiKey,
}) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  });

  const center = userLocation || defaultCenter;

  const onLoad = useCallback((map: google.maps.Map) => {
    // Fit bounds to include all places
    if (places.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      places.forEach((place) => {
        if ((place as any).lat && (place as any).lng) {
          bounds.extend({ lat: (place as any).lat, lng: (place as any).lng });
        }
      });
      if (userLocation) {
        bounds.extend(userLocation);
      }
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
    setMap(map);
  }, [places, userLocation]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Center on selected place
  useEffect(() => {
    if (map && selectedId) {
      const selectedPlace = places.find((p) => p.id === selectedId);
      if (selectedPlace && (selectedPlace as any).lat && (selectedPlace as any).lng) {
        map.panTo({ lat: (selectedPlace as any).lat, lng: (selectedPlace as any).lng });
      }
    }
  }, [map, selectedId, places]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading map...</div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={14}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
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
      }}
    >
      {/* User location marker */}
      {userLocation && (
        <MarkerF
          position={userLocation}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#3B82F6",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          }}
          zIndex={1000}
        />
      )}

      {/* Place markers */}
      {places.map((place) => {
        const lat = (place as any).lat;
        const lng = (place as any).lng;
        if (!lat || !lng) return null;

        const isSelected = place.id === selectedId;

        return (
          <MarkerF
            key={place.id}
            position={{ lat, lng }}
            onClick={() => onPinClick(place.id)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: isSelected ? 14 : 10,
              fillColor: isSelected ? "#F97316" : "#6366F1",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: isSelected ? 3 : 2,
            }}
            zIndex={isSelected ? 999 : 1}
            animation={isSelected ? google.maps.Animation.BOUNCE : undefined}
          />
        );
      })}
    </GoogleMap>
  );
};

// Outer component that handles API key fetching
const SeeAllMap: React.FC<SeeAllMapProps> = (props) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch API key from edge function
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-maps-key');
        if (error) throw error;
        if (data?.apiKey) {
          setApiKey(data.apiKey);
        } else {
          setError('No API key received');
        }
      } catch (err) {
        console.error('Failed to fetch Maps API key:', err);
        setError('Failed to load map');
      }
    };
    fetchApiKey();
  }, []);

  if (error) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <div className="text-muted-foreground">{error}</div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading map...</div>
      </div>
    );
  }

  return <GoogleMapInner {...props} apiKey={apiKey} />;
};

export default SeeAllMap;
