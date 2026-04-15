import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { haversineKm } from '@/lib/placeUtils';
import { ArrowLeft, Star, MapPin, Search } from 'lucide-react';
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
import InsiderTipsSection from '@/components/place-detail/InsiderTipsSection';
import SignatureItemsSection from '@/components/place-detail/SignatureItemsSection';
import PerfectForSection from '@/components/place-detail/PerfectForSection';
import PopularTimesChart from '@/components/place-detail/PopularTimesChart';
import BottomNav from '@/components/BottomNav';
import SaveToBoardDialog from '@/components/saved/SaveToBoardDialog';
import StreetViewPreview from '@/components/place-detail/StreetViewPreview';
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
  insider_tips: string[] | null;
  signature_items: string[] | null;
  unique_vibes: string | null;
  best_for: string[] | null;
  local_secrets: string | null;
  popular_times: Record<string, number[]> | null;
  website: string | null;
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

const PlaceDetailsPage = () => {
  const {
    placeId
  } = useParams<{
    placeId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as {
    ai_reason?: string;
    fromBoard?: string | "all";
    fromTrip?: boolean;
  } | null;
  const aiReason = locationState?.ai_reason;
  const fromBoard = locationState?.fromBoard;
  const fromTrip = locationState?.fromTrip;
  const {
    isSaved,
    toggleSave
  } = useSavedPlaces();
  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [relatedPlaces, setRelatedPlaces] = useState<RelatedPlace[]>([]);
  const [_aiSimilarPlaces] = useState<RelatedPlace[]>([]);
  const [isLoadingAiSimilar] = useState(false);
  const [_hasLoadedAiSimilar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [showSaveToBoardDialog, setShowSaveToBoardDialog] = useState(false);
  const { } = useAuth();

  // Handle back navigation - return to board view if we came from one
  const handleBack = () => {
    if (fromBoard) {
      navigate('/saved', { state: { openBoard: fromBoard } });
    } else if (fromTrip) {
      navigate('/', { state: { openTrip: true } });
    } else {
      navigate(-1);
    }
  };
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
      const dist = haversineKm(userLocation.lat, userLocation.lng, place.lat, place.lng);
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
        const dist = haversineKm(placeLat, placeLng, p.lat, p.lng);
        return dist <= 20;
      }).map(p => {
        const placeCategories = p.categories || [];
        const meaningfulMatches = placeCategories.filter((cat: string) => meaningfulCategories.includes(cat)).length;
        const dist = haversineKm(placeLat, placeLng, p.lat!, p.lng!);
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
        distance: userLocation && p.lat && p.lng ? Math.round(haversineKm(userLocation.lat, userLocation.lng, p.lat, p.lng) * 10) / 10 : Math.round(p.distanceFromPlace * 10) / 10
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
                    ai_reason: (newData as any).ai_reason ?? null,
                    insider_tips: (newData as any).insider_tips ?? null,
                    signature_items: (newData as any).signature_items ?? null,
                    unique_vibes: (newData as any).unique_vibes ?? null,
                    best_for: (newData as any).best_for ?? null,
                    local_secrets: (newData as any).local_secrets ?? null,
                    popular_times: (newData as any).popular_times ?? null,
                    website: (newData as any).website ?? null,
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

        // Check if place needs enrichment (missing photos, only 1 photo, or missing reviews)
        const photosCount = data.photos?.length || (data.photo_name ? 1 : 0);
        const needsEnrichment = !data.photos || photosCount <= 1 || !data.reviews;
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
                  ai_reason: (enrichedData as any).ai_reason ?? null,
                  insider_tips: (enrichedData as any).insider_tips ?? null,
                  signature_items: (enrichedData as any).signature_items ?? null,
                  unique_vibes: (enrichedData as any).unique_vibes ?? null,
                  best_for: (enrichedData as any).best_for ?? null,
                  local_secrets: (enrichedData as any).local_secrets ?? null,
                  popular_times: (enrichedData as any).popular_times ?? null,
                  website: (enrichedData as any).website ?? null,
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
          ai_reason: (data as any).ai_reason ?? null,
          insider_tips: (data as any).insider_tips ?? null,
          signature_items: (data as any).signature_items ?? null,
          unique_vibes: (data as any).unique_vibes ?? null,
          best_for: (data as any).best_for ?? null,
          local_secrets: (data as any).local_secrets ?? null,
          popular_times: (data as any).popular_times ?? null,
          website: (data as any).website ?? null,
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
    if (!place) return;
    
    // Build a search query using the place name and address for best results
    // This ensures Google Maps shows the place name instead of just coordinates
    let query: string;
    if (place.address) {
      query = `${place.name}, ${place.address}`;
    } else if (place.lat && place.lng) {
      // Include coordinates as a fallback hint but prioritize the name
      query = `${place.name} @${place.lat},${place.lng}`;
    } else {
      query = place.name;
    }
    
    const url = `https://maps.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
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
  if (error || !place) {
    return (
      <div className="min-h-screen bg-background max-w-[420px] mx-auto flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          {/* Illustration */}
          <div className="relative mx-auto w-24 h-24 mb-2">
            <div className="absolute inset-0 rounded-full bg-destructive/5" />
            <div className="absolute inset-2 rounded-full bg-destructive/10 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-destructive/40" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Spot not found
          </h2>
          <p className="text-sm text-muted-foreground max-w-[260px] mx-auto">
            {error === 'Place not found' 
              ? "This place might have been removed or the link is incorrect."
              : error || "We couldn't load this spot right now. Try again later."}
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleBack} variant="default" className="rounded-full gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
            <Button onClick={() => navigate('/?tab=discover')} variant="outline" className="rounded-full gap-2">
              <Search className="w-4 h-4" />
              Discover Spots
            </Button>
          </div>
        </div>
        <BottomNav activeTab="discover" onTabChange={(tab) => navigate(`/?tab=${tab}`)} />
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
        <Button variant="ghost" size="icon" onClick={handleBack} className="bg-background/90 backdrop-blur-md shadow-lg hover:bg-background rounded-full w-10 h-10">
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
      }]} isOpen={place.is_open_now} website={place.website} />

        {/* 4a. Popular Times Chart */}
        {place.popular_times && (
          <PopularTimesChart popularTimes={place.popular_times} />
        )}

        <WhyVisitSection 
          placeName={place.name} 
          categories={place.categories || []} 
          rating={place.rating} 
          priceLevel={place.price_level} 
          reviewCount={place.ratings_total} 
          aiReason={aiReason || place.ai_reason || undefined}
          uniqueVibes={place.unique_vibes}
        />

        {/* 5. What to Try - AI-generated signature items */}
        {place.signature_items && place.signature_items.length > 0 && (
          <SignatureItemsSection items={place.signature_items} />
        )}

        {/* 6. Insider Tips - AI-generated tips and local secrets */}
        {((place.insider_tips && place.insider_tips.length > 0) || place.local_secrets) && (
          <InsiderTipsSection tips={place.insider_tips || []} localSecret={place.local_secrets} />
        )}

        {/* 7. Perfect For - AI-generated occasions/personas */}
        {place.best_for && place.best_for.length > 0 && (
          <PerfectForSection occasions={place.best_for} />
        )}

        {/* 8. Street View Preview */}
        {place.lat && place.lng && (
          <StreetViewPreview lat={place.lat} lng={place.lng} />
        )}

        {/* 9. Reviews Section - Now with real Google reviews */}
        {formattedReviews.length > 0 && <ReviewsList reviews={formattedReviews} />}

        {/* 9. Similar Places - "You might also like" */}
        {relatedPlaces.length > 0 && <RelatedSpots places={relatedPlaces} onPlaceClick={handleRelatedClick} />}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab="home" onTabChange={tab => {
      if (tab === 'home') navigate('/');else if (tab === 'saved') navigate('/saved');else if (tab === 'trip') navigate('/trip');
    }} />

      {/* Save to Board Dialog */}
      {showSaveToBoardDialog && place && <SaveToBoardDialog placeId={place.place_id} placeName={place.name} onClose={() => setShowSaveToBoardDialog(false)} onSaved={handleSavedToBoard} />}
    </div>;
};
export default PlaceDetailsPage;