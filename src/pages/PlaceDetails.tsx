import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, DollarSign, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ImageCarousel from '@/components/place-detail/ImageCarousel';
import ReviewsList from '@/components/place-detail/ReviewsList';
import RelatedSpots from '@/components/place-detail/RelatedSpots';
import ActionButtons from '@/components/place-detail/ActionButtons';
import QuickInfoSection from '@/components/place-detail/QuickInfoSection';
import WhyVisitSection from '@/components/place-detail/WhyVisitSection';
import BottomNav from '@/components/BottomNav';
import SaveToBoardDialog from '@/components/saved/SaveToBoardDialog';
import AuthDialog from '@/components/AuthDialog';
import { useAuth } from '@/hooks/useAuth';
interface OpeningHoursData {
  open_now: boolean;
  weekday_text: string[];
}
interface ReviewData {
  author_name: string;
  rating: number;
  text: string;
  relative_time: string;
}
interface PlaceDetails {
  place_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  categories: string[] | null;
  rating: number | null;
  ratings_total: number | null;
  photo_name: string | null;
  photos: string[] | null;
  price_level: number | null;
  opening_hours: OpeningHoursData | null;
  reviews: ReviewData[] | null;
  is_open_now: boolean | null;
  ai_reason: string | null;
}
interface RelatedPlace {
  id: string;
  name: string;
  image: string;
  rating: number;
  distance: number;
}

// Convert price_level (0-4) to display string with estimated USD range
interface PriceInfo {
  symbol: string;
  estimate: string;
}
const getPriceRangeFromLevel = (level: number | null, categories: string[] | null): PriceInfo => {
  const cats = categories?.map(c => c.toLowerCase()) || [];

  // Determine category type for price estimation
  const isBarOrNightlife = cats.some(c => c.includes('bar') || c.includes('night_club') || c.includes('nightlife'));
  const isCafeOrBakery = cats.some(c => c.includes('cafe') || c.includes('bakery') || c.includes('coffee'));
  const isSpaOrWellness = cats.some(c => c.includes('spa') || c.includes('beauty') || c.includes('health'));
  const isAttraction = cats.some(c => c.includes('tourist') || c.includes('museum') || c.includes('park') || c.includes('zoo'));

  // Handle null price level
  if (level === null) {
    if (isAttraction) return {
      symbol: '$$',
      estimate: '$5-15/entry'
    };
    if (isSpaOrWellness) return {
      symbol: '$$$',
      estimate: '$15-35'
    };
    return {
      symbol: '$$',
      estimate: 'Check for prices'
    };
  }

  // Price estimates based on category and level (USD)
  if (isBarOrNightlife) {
    switch (level) {
      case 0:
        return {
          symbol: 'Free',
          estimate: 'No cover charge'
        };
      case 1:
        return {
          symbol: '$',
          estimate: '$3-7/drink'
        };
      case 2:
        return {
          symbol: '$$',
          estimate: '$7-15/drink'
        };
      case 3:
        return {
          symbol: '$$$',
          estimate: '$15-30/drink'
        };
      case 4:
        return {
          symbol: '$$$$',
          estimate: '$30+/drink'
        };
      default:
        return {
          symbol: '$$',
          estimate: '$7-15/drink'
        };
    }
  }
  if (isCafeOrBakery) {
    switch (level) {
      case 0:
        return {
          symbol: 'Free',
          estimate: 'Free samples/promos'
        };
      case 1:
        return {
          symbol: '$',
          estimate: '$2-5/person'
        };
      case 2:
        return {
          symbol: '$$',
          estimate: '$5-10/person'
        };
      case 3:
        return {
          symbol: '$$$',
          estimate: '$10-20/person'
        };
      case 4:
        return {
          symbol: '$$$$',
          estimate: '$20+/person'
        };
      default:
        return {
          symbol: '$$',
          estimate: '$5-10/person'
        };
    }
  }
  if (isSpaOrWellness) {
    switch (level) {
      case 0:
        return {
          symbol: 'Free',
          estimate: 'Complimentary services'
        };
      case 1:
        return {
          symbol: '$',
          estimate: '$10-25/session'
        };
      case 2:
        return {
          symbol: '$$',
          estimate: '$25-50/session'
        };
      case 3:
        return {
          symbol: '$$$',
          estimate: '$50-100/session'
        };
      case 4:
        return {
          symbol: '$$$$',
          estimate: '$100+/session'
        };
      default:
        return {
          symbol: '$$',
          estimate: '$25-50/session'
        };
    }
  }
  if (isAttraction) {
    switch (level) {
      case 0:
        return {
          symbol: 'Free',
          estimate: 'Free entry'
        };
      case 1:
        return {
          symbol: '$',
          estimate: '$2-5/entry'
        };
      case 2:
        return {
          symbol: '$$',
          estimate: '$5-10/entry'
        };
      case 3:
        return {
          symbol: '$$$',
          estimate: '$10-20/entry'
        };
      case 4:
        return {
          symbol: '$$$$',
          estimate: '$20+/entry'
        };
      default:
        return {
          symbol: '$$',
          estimate: '$5-10/entry'
        };
    }
  }

  // Default: Restaurants and general dining
  switch (level) {
    case 0:
      return {
        symbol: 'Free',
        estimate: 'Free tastings/promos'
      };
    case 1:
      return {
        symbol: '$',
        estimate: '$5-15/person'
      };
    case 2:
      return {
        symbol: '$$',
        estimate: '$15-30/person'
      };
    case 3:
      return {
        symbol: '$$$',
        estimate: '$30-75/person'
      };
    case 4:
      return {
        symbol: '$$$$',
        estimate: '$75+/person'
      };
    default:
      return {
        symbol: '$$',
        estimate: '$15-30/person'
      };
  }
};

// Parse weekday_text to structured opening hours
const parseOpeningHours = (openingHours: OpeningHoursData | null) => {
  if (!openingHours?.weekday_text?.length) {
    return null;
  }
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const today = new Date().getDay(); // 0 = Sunday
  const todayIndex = today === 0 ? 6 : today - 1; // Convert to Monday = 0

  return openingHours.weekday_text.map((text, index) => {
    // Text format: "Monday: 9:00 AM – 10:00 PM" or "Monday: Closed"
    const parts = text.split(': ');
    const dayName = parts[0] || days[index];
    const hours = parts[1] || 'Hours not available';
    return {
      day: dayName,
      hours: hours,
      isToday: index === todayIndex
    };
  });
};

// Calculate distance using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
const PlaceDetailsPage = () => {
  const {
    placeId
  } = useParams<{
    placeId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const aiReason = (location.state as {
    ai_reason?: string;
  })?.ai_reason;
  const {
    isSaved,
    toggleSave
  } = useSavedPlaces();
  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [relatedPlaces, setRelatedPlaces] = useState<RelatedPlace[]>([]);
  const [aiSimilarPlaces, setAiSimilarPlaces] = useState<RelatedPlace[]>([]);
  const [isLoadingAiSimilar, setIsLoadingAiSimilar] = useState(false);
  const [hasLoadedAiSimilar, setHasLoadedAiSimilar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [showSaveToBoardDialog, setShowSaveToBoardDialog] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { user } = useAuth();

  // Get user location on mount
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(position => {
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    }, () => {
      // Silently fail - distance will show as N/A
      console.log('Could not get user location for distance calculation');
    }, {
      enableHighAccuracy: false,
      timeout: 10000
    });
  }, []);

  // Calculate distance when we have both user location and place
  useEffect(() => {
    if (userLocation && place?.lat && place?.lng) {
      const dist = calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng);
      setDistanceKm(Math.round(dist * 10) / 10);
    }
  }, [userLocation, place]);

  // Pre-fetch and enrich related places in background
  const prefetchRelatedPlacesData = async (placeIds: string[]) => {
    if (placeIds.length === 0) return;
    try {
      // Check which places need enrichment - include name for enrichment call
      const {
        data: placesData
      } = await supabase.from('places').select('place_id, name, photos, reviews').in('place_id', placeIds);
      const placesNeedingEnrichment = placesData?.filter(p => !p.photos || (p.photos as string[])?.length === 0 || !p.reviews) || [];
      if (placesNeedingEnrichment.length > 0) {
        // Enrich places in background (fire and forget) - use correct format with name
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-places`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            places: placesNeedingEnrichment.map(p => ({
              name: p.name,
              reason: '',
              category: ''
            }))
          })
        }).catch(err => console.log('Background enrichment failed:', err));
      }

      // Pre-load thumbnail images for faster display
      placeIds.forEach(id => {
        const placeData = placesData?.find(p => p.place_id === id);
        const photos = placeData?.photos as string[] | null;
        if (photos?.[0]) {
          const img = new Image();
          img.src = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/place-photo?photo_name=${encodeURIComponent(photos[0])}`;
        }
      });
    } catch (err) {
      console.log('Prefetch error:', err);
    }
  };

  // Helper function to fetch related places
  const fetchRelatedPlaces = async (data: any) => {
    if (!data.categories || data.categories.length === 0 || !data.lat || !data.lng) {
      return;
    }
    const genericCategories = ['point_of_interest', 'establishment', 'store', 'food'];
    const meaningfulCategories = data.categories.filter((cat: string) => !genericCategories.includes(cat));
    const categoriesToMatch = meaningfulCategories.length > 0 ? meaningfulCategories : data.categories;
    const {
      data: related,
      error: relatedError
    } = await supabase.from('places').select('place_id, name, photo_name, rating, lat, lng, categories').neq('place_id', data.place_id).overlaps('categories', categoriesToMatch).limit(50);
    if (!relatedError && related) {
      const placeLat = data.lat;
      const placeLng = data.lng;
      const nearbyPlaces = related.filter(p => {
        if (!p.lat || !p.lng) return false;
        const dist = calculateDistance(placeLat, placeLng, p.lat, p.lng);
        return dist <= 20;
      }).map(p => {
        const placeCategories = p.categories || [];
        const meaningfulMatches = placeCategories.filter((cat: string) => meaningfulCategories.includes(cat)).length;
        const dist = calculateDistance(placeLat, placeLng, p.lat!, p.lng!);
        return {
          ...p,
          score: meaningfulMatches,
          distanceFromPlace: dist
        };
      });
      const topRelated = nearbyPlaces.sort((a, b) => b.score - a.score || a.distanceFromPlace - b.distanceFromPlace).slice(0, 6);
      const formattedRelated: RelatedPlace[] = topRelated.map(p => ({
        id: p.place_id,
        name: p.name,
        image: p.photo_name ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/place-photo?photo_name=${encodeURIComponent(p.photo_name)}` : 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
        rating: p.rating || 4.0,
        distance: userLocation && p.lat && p.lng ? Math.round(calculateDistance(userLocation.lat, userLocation.lng, p.lat, p.lng) * 10) / 10 : Math.round(p.distanceFromPlace * 10) / 10
      }));
      setRelatedPlaces(formattedRelated);

      // Pre-fetch data for related places in background
      prefetchRelatedPlacesData(topRelated.map(p => p.place_id));
    }
  };
  useEffect(() => {
    const fetchPlace = async () => {
      if (!placeId) {
        setError('No place ID provided');
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const {
          data,
          error: fetchError
        } = await supabase.from('places').select('*').eq('place_id', placeId).maybeSingle();
        if (fetchError) {
          console.error('Error fetching place:', fetchError);
          setError('Failed to load place details');
          return;
        }
        if (!data) {
          // Place doesn't exist in our database - try to fetch from Google using place_id
          console.log('Place not in database, attempting to fetch from Google...');
          try {
            const enrichResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-places`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                placeId: placeId,
                // Pass the place_id directly for lookup
                lat: userLocation?.lat,
                lng: userLocation?.lng
              })
            });
            if (enrichResponse.ok) {
              const enrichResult = await enrichResponse.json();
              if (enrichResult.places && enrichResult.places.length > 0) {
                // Re-fetch from database after enrichment
                const {
                  data: newData
                } = await supabase.from('places').select('*').eq('place_id', placeId).maybeSingle();
                if (newData) {
                  const placeData: PlaceDetails = {
                    place_id: newData.place_id,
                    name: newData.name,
                    address: newData.address,
                    lat: newData.lat,
                    lng: newData.lng,
                    categories: newData.categories,
                    rating: newData.rating,
                    ratings_total: newData.ratings_total,
                    photo_name: newData.photo_name,
                    photos: (newData as any).photos || null,
                    price_level: (newData as any).price_level ?? null,
                    opening_hours: (newData as any).opening_hours as OpeningHoursData | null,
                    reviews: (newData as any).reviews as ReviewData[] | null,
                    is_open_now: (newData as any).is_open_now ?? null,
                    ai_reason: (newData as any).ai_reason ?? null
                  };
                  setPlace(placeData);
                  await fetchRelatedPlaces(newData);
                  return;
                }
              }
            }
          } catch (enrichError) {
            console.error('Failed to fetch place from Google:', enrichError);
          }
          setError('Place not found');
          return;
        }

        // Check if place needs enrichment (missing photos, reviews, etc.)
        const needsEnrichment = !data.photos || data.photos.length === 0 || !data.reviews;
        if (needsEnrichment) {
          console.log('Place needs enrichment, fetching additional data...');
          try {
            // Call enrich-places with correct format (name, not placeId)
            const enrichResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-places`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                places: [{
                  name: data.name,
                  reason: '',
                  category: ''
                }],
                lat: data.lat,
                lng: data.lng
              })
            });
            if (enrichResponse.ok) {
              // Re-fetch the place data after enrichment
              const {
                data: enrichedData
              } = await supabase.from('places').select('*').eq('place_id', placeId).maybeSingle();
              if (enrichedData) {
                const enrichedPlaceData: PlaceDetails = {
                  place_id: enrichedData.place_id,
                  name: enrichedData.name,
                  address: enrichedData.address,
                  lat: enrichedData.lat,
                  lng: enrichedData.lng,
                  categories: enrichedData.categories,
                  rating: enrichedData.rating,
                  ratings_total: enrichedData.ratings_total,
                  photo_name: enrichedData.photo_name,
                  photos: (enrichedData as any).photos || null,
                  price_level: (enrichedData as any).price_level ?? null,
                  opening_hours: (enrichedData as any).opening_hours as OpeningHoursData | null,
                  reviews: (enrichedData as any).reviews as ReviewData[] | null,
                  is_open_now: (enrichedData as any).is_open_now ?? null,
                  ai_reason: (enrichedData as any).ai_reason ?? null
                };
                setPlace(enrichedPlaceData);
                await fetchRelatedPlaces(enrichedData);
                return;
              }
            }
          } catch (enrichError) {
            console.error('Failed to enrich place:', enrichError);
          }
        }

        // Type assertion for the data
        const placeData: PlaceDetails = {
          place_id: data.place_id,
          name: data.name,
          address: data.address,
          lat: data.lat,
          lng: data.lng,
          categories: data.categories,
          rating: data.rating,
          ratings_total: data.ratings_total,
          photo_name: data.photo_name,
          photos: (data as any).photos || null,
          price_level: (data as any).price_level ?? null,
          opening_hours: (data as any).opening_hours as OpeningHoursData | null,
          reviews: (data as any).reviews as ReviewData[] | null,
          is_open_now: (data as any).is_open_now ?? null,
          ai_reason: (data as any).ai_reason ?? null
        };
        setPlace(placeData);
        await fetchRelatedPlaces(data);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('Something went wrong');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlace();
  }, [placeId, userLocation]);
  const openInMaps = () => {
    let url: string;
    if (place?.lat && place?.lng) {
      url = `https://maps.google.com/?q=${place.lat},${place.lng}`;
    } else if (place?.address) {
      const query = encodeURIComponent(`${place.name} ${place.address}`);
      url = `https://maps.google.com/?q=${query}`;
    } else {
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const handleShare = () => {
    if (navigator.share && place) {
      navigator.share({
        title: place.name,
        text: `Check out ${place.name} on SweetSpots!`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };
  const handleRelatedClick = (id: string) => {
    navigate(`/place/${id}`);
  };
  const handleSave = () => {
    if (!placeId) return;
    const wasSaved = isSaved(placeId);
    if (wasSaved) {
      // If already saved, just unsave
      toggleSave(placeId);
      toast.success('Removed from saved');
    } else {
      // Show the save to board dialog
      setShowSaveToBoardDialog(true);
    }
  };
  const handleSavedToBoard = () => {
    if (placeId && !isSaved(placeId)) {
      toggleSave(placeId);
    }
    toast.success('Saved to your spots!');
  };
  const handleFindSimilarVibes = async () => {
    if (!placeId || isLoadingAiSimilar) return;
    setIsLoadingAiSimilar(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/find-similar-vibes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          placeId
        })
      });
      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Too many requests. Please try again later.');
          return;
        }
        throw new Error('Failed to find similar places');
      }
      const data = await response.json();
      if (data.similarPlaces && data.similarPlaces.length > 0) {
        const formatted: RelatedPlace[] = data.similarPlaces.map((p: any) => ({
          id: p.place_id,
          name: p.name,
          image: p.photo_name ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/place-photo?photo_name=${encodeURIComponent(p.photo_name)}` : 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
          rating: p.rating || 4.0,
          distance: userLocation && p.lat && p.lng ? Math.round(calculateDistance(userLocation.lat, userLocation.lng, p.lat, p.lng) * 10) / 10 : Math.round((Math.random() * 3 + 0.5) * 10) / 10
        }));
        setAiSimilarPlaces(formatted);
        setHasLoadedAiSimilar(true);
        toast.success('Found places with similar vibes!');
      } else {
        toast.info('No similar places found');
      }
    } catch (error) {
      console.error('Error finding similar vibes:', error);
      toast.error('Failed to find similar places');
    } finally {
      setIsLoadingAiSimilar(false);
    }
  };
  if (isLoading) {
    return <div className="min-h-screen bg-background max-w-[420px] mx-auto">
        <div className="absolute top-4 left-4 z-30">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background rounded-full w-10 h-10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
        <Skeleton className="w-full aspect-[4/3]" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>;
  }
  // Show blurred preview with auth overlay for non-authenticated users when place not found
  if (error || !place) {
    // If user is not logged in, show a teaser with auth prompt
    if (!user) {
      return (
        <div className="min-h-screen bg-background max-w-[420px] mx-auto relative">
          {/* Floating Back Button */}
          <div className="fixed top-4 left-4 z-50">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)} 
              className="bg-background/90 backdrop-blur-md shadow-lg hover:bg-background rounded-full w-10 h-10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>

          {/* Blurred Background Content (Teaser) */}
          <div className="filter blur-sm pointer-events-none select-none">
            {/* Placeholder Hero Image */}
            <div className="w-full aspect-[4/3] bg-gradient-to-br from-primary/20 to-secondary/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            </div>
            
            {/* Placeholder Content */}
            <div className="px-4 py-5 space-y-6">
              <div className="space-y-3">
                <div className="h-8 w-3/4 bg-muted rounded-lg" />
                <div className="h-4 w-full bg-muted/60 rounded" />
                <div className="flex gap-3">
                  <div className="h-10 w-20 bg-primary/20 rounded-xl" />
                  <div className="h-10 w-24 bg-muted rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="h-24 bg-muted rounded-xl" />
                <div className="h-24 bg-muted rounded-xl" />
                <div className="h-24 bg-muted rounded-xl" />
              </div>
              <div className="space-y-3">
                <div className="h-6 w-1/2 bg-muted rounded" />
                <div className="h-20 w-full bg-muted/60 rounded-xl" />
              </div>
            </div>
          </div>

          {/* Auth Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px] z-40">
            <div className="bg-card rounded-2xl shadow-elevated p-6 mx-4 max-w-sm w-full text-center space-y-4 border border-border">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">
                  Sign in to explore
                </h2>
                <p className="text-muted-foreground text-sm">
                  Create a free account to view place details, save your favorites, and discover personalized recommendations.
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <Button 
                  variant="primary" 
                  size="lg" 
                  className="w-full rounded-xl"
                  onClick={() => setShowAuthDialog(true)}
                >
                  Sign in or Sign up
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-muted-foreground"
                  onClick={() => navigate(-1)}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Go back
                </Button>
              </div>
            </div>
          </div>

          {/* Auth Dialog */}
          <AuthDialog 
            open={showAuthDialog} 
            onOpenChange={setShowAuthDialog}
            onSuccess={() => {
              setShowAuthDialog(false);
              // Refresh the page to reload place data
              window.location.reload();
            }}
          />
        </div>
      );
    }

    // User is logged in but place genuinely not found
    return (
      <div className="min-h-screen bg-background max-w-[420px] mx-auto flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            {error || 'Place not found'}
          </h2>
          <p className="text-muted-foreground">
            We couldn't find the place you're looking for.
          </p>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }
  const saved = placeId ? isSaved(placeId) : false;
  const priceRange = getPriceRangeFromLevel(place.price_level, place.categories);

  // Generate image URLs from photos array (real Google photos)
  const basePhotoUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/place-photo?photo_name=`;
  const placeImages = place.photos && place.photos.length > 0 ? place.photos.map(photoName => `${basePhotoUrl}${encodeURIComponent(photoName)}`) : place.photo_name ? [`${basePhotoUrl}${encodeURIComponent(place.photo_name)}`] : ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800'];

  // Parse opening hours for display
  const openingHoursDisplay = parseOpeningHours(place.opening_hours);

  // Format reviews for ReviewsList component
  const formattedReviews = place.reviews?.map((review, index) => ({
    id: `review-${index}`,
    name: review.author_name,
    rating: review.rating,
    text: review.text,
    date: review.relative_time
  })) || [];
  return <div className="min-h-screen bg-background max-w-[420px] mx-auto pb-28">
      {/* Floating Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="bg-background/90 backdrop-blur-md shadow-lg hover:bg-background rounded-full w-10 h-10">
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* 1. Hero Image Carousel - Now with real photos */}
      <ImageCarousel images={placeImages} placeName={place.name} />

      {/* Content */}
      <div className="px-4 py-5 space-y-6">
        {/* 2. Place Name & Info */}
        <div className="space-y-3 animate-fade-in">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              {place.name}
            </h1>
            {place.address && <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary/60" />
                <span className="leading-relaxed text-[sidebar-primary-foreground] text-muted-foreground">{place.address}</span>
              </p>}
          </div>
          
          {/* Rating & Distance */}
          <div className="flex items-center gap-3 flex-wrap">
            {place.rating && <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-2 rounded-xl">
                <Star className="w-4 h-4 text-primary fill-primary" />
                <span className="text-sm font-bold text-primary">
                  {place.rating.toFixed(1)}
                </span>
                <span className="text-xs text-primary/70">/ 5</span>
              </div>}
            {distanceKm !== null && (
              <div className="flex items-center gap-1.5 bg-muted px-3 py-2 rounded-xl">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm}km`}
                </span>
                <span className="text-xs text-muted-foreground">away</span>
              </div>
            )}
          </div>
          
          {place.ratings_total && <span className="text-sm text-muted-foreground">
              Based on {place.ratings_total.toLocaleString()} reviews
            </span>}
        </div>

        {/* 2b. Action Buttons - Save, Map, Share */}
        <ActionButtons isSaved={saved} onSave={handleSave} onViewMap={openInMaps} onShare={handleShare} flyImageSrc={placeImages[0]} />

        {/* 3. Opening Hours */}
        <QuickInfoSection distance={distanceKm ?? 0} priceRange={priceRange} openingHours={openingHoursDisplay || [{
        day: 'Hours',
        hours: 'Not available',
        isToday: true
      }]} isOpen={place.is_open_now} />

        {/* 4. Why You Should Visit */}
        <WhyVisitSection placeName={place.name} categories={place.categories || []} rating={place.rating} priceLevel={place.price_level} reviewCount={place.ratings_total} aiReason={aiReason || place.ai_reason || undefined} />


        {/* 6. Reviews Section - Now with real Google reviews */}
        {formattedReviews.length > 0 ? <ReviewsList reviews={formattedReviews} /> : <div className="text-center py-4 text-muted-foreground text-sm">
            No reviews available yet
          </div>}

        {/* 7. Similar Places - "You might also like" */}
        {relatedPlaces.length > 0 && <RelatedSpots places={relatedPlaces} onPlaceClick={handleRelatedClick} />}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab="home" onTabChange={tab => {
      if (tab === 'home') navigate('/');else if (tab === 'saved') navigate('/saved');else if (tab === 'profile') navigate('/profile');
    }} />

      {/* Save to Board Dialog */}
      {showSaveToBoardDialog && place && <SaveToBoardDialog placeId={place.place_id} placeName={place.name} onClose={() => setShowSaveToBoardDialog(false)} onSaved={handleSavedToBoard} />}
    </div>;
};
export default PlaceDetailsPage;