import { useState, useCallback, useEffect } from 'react';

export interface Location {
  lat: number;
  lng: number;
}

interface UseLocationReturn {
  location: Location | null;
  isLoading: boolean;
  error: string | null;
  permissionDenied: boolean;
  requestLocation: () => Promise<Location | null>;
  setManualLocation: (location: Location) => void;
}

export const useLocation = (): UseLocationReturn => {
  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const requestLocation = useCallback(async (): Promise<Location | null> => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return null;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(loc);
          setIsLoading(false);
          setPermissionDenied(false);
          resolve(loc);
        },
        (err) => {
          setIsLoading(false);
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              setPermissionDenied(true);
              setError('Location access denied. Please enable location in your browser settings.');
              break;
            case err.POSITION_UNAVAILABLE:
              setError('Location unavailable. Please check your device settings.');
              break;
            case err.TIMEOUT:
              setError('Location request timed out. Please try again.');
              break;
            default:
              setError('Unable to get your location.');
          }
          resolve(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 300000, // 5 min cache
        }
      );
    });
  }, []);

  const setManualLocation = useCallback((loc: Location) => {
    setLocation(loc);
    setError(null);
    setPermissionDenied(false);
  }, []);

  // Auto-request on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return {
    location,
    isLoading,
    error,
    permissionDenied,
    requestLocation,
    setManualLocation,
  };
};
