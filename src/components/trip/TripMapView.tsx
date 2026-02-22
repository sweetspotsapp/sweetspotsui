import { useState, useEffect, useCallback, useMemo } from "react";
import { GoogleMap, useJsApiLoader, OverlayViewF, OverlayView, InfoWindowF } from "@react-google-maps/api";
import { Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MapActivity {
  name: string;
  lat: number;
  lng: number;
  category: string;
  dayLabel: string;
  time: string;
}

interface TripMapViewProps {
  activities: MapActivity[];
}

const CATEGORY_COLORS: Record<string, string> = {
  food: "#E11D48",
  cafe: "#D97706",
  bar: "#7C3AED",
  museum: "#2563EB",
  park: "#16A34A",
  shopping: "#EC4899",
  landmark: "#F59E0B",
  entertainment: "#8B5CF6",
  adventure: "#059669",
  nightlife: "#6D28D9",
  beach: "#0EA5E9",
  temple: "#DC2626",
  market: "#EA580C",
};

let cachedApiKey: string | null = null;

const TripMapView = ({ activities }: TripMapViewProps) => {
  const [apiKey, setApiKey] = useState<string | null>(cachedApiKey);
  const [isLoadingKey, setIsLoadingKey] = useState(!cachedApiKey);
  const [keyError, setKeyError] = useState(false);

  useEffect(() => {
    if (cachedApiKey) {
      setApiKey(cachedApiKey);
      setIsLoadingKey(false);
      return;
    }
    const fetchKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-maps-key');
        if (error || !data?.apiKey) { setKeyError(true); return; }
        cachedApiKey = data.apiKey;
        setApiKey(data.apiKey);
      } catch { setKeyError(true); }
      finally { setIsLoadingKey(false); }
    };
    fetchKey();
  }, []);

  if (isLoadingKey) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-muted/30">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (keyError || !apiKey) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-muted/30">
        <div className="text-center px-6">
          <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Unable to load map.</p>
        </div>
      </div>
    );
  }

  return <MapInner apiKey={apiKey} activities={activities} />;
};

const MapInner = ({ apiKey, activities }: { apiKey: string; activities: MapActivity[] }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: 'google-map-script',
  });

  const [selectedActivity, setSelectedActivity] = useState<MapActivity | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const center = useMemo(() => {
    if (activities.length === 0) return { lat: 0, lng: 0 };
    const avgLat = activities.reduce((s, a) => s + a.lat, 0) / activities.length;
    const avgLng = activities.reduce((s, a) => s + a.lng, 0) / activities.length;
    return { lat: avgLat, lng: avgLng };
  }, [activities]);

  const fitBounds = useCallback((m: google.maps.Map) => {
    if (activities.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    activities.forEach(a => bounds.extend({ lat: a.lat, lng: a.lng }));
    m.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
  }, [activities]);

  const onLoad = useCallback((m: google.maps.Map) => {
    setMap(m);
    fitBounds(m);
  }, [fitBounds]);

  useEffect(() => { if (map) fitBounds(map); }, [map, fitBounds]);

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-muted/30">
        <p className="text-sm text-muted-foreground">Failed to load map.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-muted/30">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={center}
      zoom={13}
      onLoad={onLoad}
      onUnmount={() => setMap(null)}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
      }}
    >
      {activities.map((act, i) => (
        <OverlayViewF
          key={`${act.name}-${i}`}
          position={{ lat: act.lat, lng: act.lng }}
          mapPaneName={OverlayView.FLOAT_PANE}
          getPixelPositionOffset={() => ({ x: -14, y: -14 })}
        >
          <div
            onClick={() => setSelectedActivity(act)}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: CATEGORY_COLORS[act.category] || '#E11D48',
              border: '2px solid #FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 'bold',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }}
          >
            {i + 1}
          </div>
        </OverlayViewF>
      ))}

      {selectedActivity && (
        <InfoWindowF
          position={{ lat: selectedActivity.lat, lng: selectedActivity.lng }}
          onCloseClick={() => setSelectedActivity(null)}
          options={{ pixelOffset: new google.maps.Size(0, -16) }}
        >
          <div className="p-1 min-w-[150px]">
            <h4 className="font-semibold text-sm">{selectedActivity.name}</h4>
            <p className="text-xs opacity-60 mt-0.5">
              {selectedActivity.dayLabel} · {selectedActivity.time}
            </p>
            <span className="text-xs opacity-50 capitalize">
              {selectedActivity.category.replace(/_/g, ' ')}
            </span>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
};

export default TripMapView;
