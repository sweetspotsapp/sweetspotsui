import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, DollarSign, Wand2, Loader2 } from 'lucide-react';
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

// Convert price_level (0-4) to display string
const getPriceRangeFromLevel = (level: number | null): string => {
  if (level === null) return '$$';
  switch (level) {
    case 0: return 'Free';
    case 1: return '$';
    case 2: return '$$';
    case 3: return '$$$';
    case 4: return '$$$$';
    default: return '$$';
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
      isToday: index === todayIndex,
    };
  });
};


// Calculate distance using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const PlaceDetailsPage = () => {
  const { placeId } = useParams<{ placeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const aiReason = (location.state as { ai_reason?: string })?.ai_reason;
  const { isSaved, toggleSave } = useSavedPlaces();
  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [relatedPlaces, setRelatedPlaces] = useState<RelatedPlace[]>([]);
  const [aiSimilarPlaces, setAiSimilarPlaces] = useState<RelatedPlace[]>([]);
  const [isLoadingAiSimilar, setIsLoadingAiSimilar] = useState(false);
  const [hasLoadedAiSimilar, setHasLoadedAiSimilar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  // Get user location on mount
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        // Silently fail - distance will show as N/A
        console.log('Could not get user location for distance calculation');
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  // Calculate distance when we have both user location and place
  useEffect(() => {
    if (userLocation && place?.lat && place?.lng) {
      const dist = calculateDistance(userLocation.lat, userLocation.lng, place.lat, place.lng);
      setDistanceKm(Math.round(dist * 10) / 10);
    }
  }, [userLocation, place]);

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

        const { data, error: fetchError } = await supabase
          .from('places')
          .select('*')
          .eq('place_id', placeId)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching place:', fetchError);
          setError('Failed to load place details');
          return;
        }

        if (!data) {
          setError('Place not found');
          return;
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
        };
        setPlace(placeData);

        // Fetch related places based on meaningful categories (exclude generic ones)
        if (data.categories && data.categories.length > 0) {
          const genericCategories = ['point_of_interest', 'establishment', 'store', 'food'];
          const meaningfulCategories = data.categories.filter(
            (cat: string) => !genericCategories.includes(cat)
          );
          
          // Use meaningful categories if available, otherwise fall back to all
          const categoriesToMatch = meaningfulCategories.length > 0 
            ? meaningfulCategories 
            : data.categories;

          const { data: related, error: relatedError } = await supabase
            .from('places')
            .select('place_id, name, photo_name, rating, lat, lng, categories')
            .neq('place_id', placeId)
            .overlaps('categories', categoriesToMatch)
            .limit(20); // Fetch more to filter and sort

          if (!relatedError && related) {
            // Score places by how many meaningful categories they share
            const scoredPlaces = related.map(p => {
              const placeCategories = p.categories || [];
              const meaningfulMatches = placeCategories.filter(
                (cat: string) => meaningfulCategories.includes(cat)
              ).length;
              return { ...p, score: meaningfulMatches };
            });

            // Sort by score (most category matches first) and take top 6
            const topRelated = scoredPlaces
              .sort((a, b) => b.score - a.score)
              .slice(0, 6);

            const formattedRelated: RelatedPlace[] = topRelated.map(p => ({
              id: p.place_id,
              name: p.name,
              image: p.photo_name 
                ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/place-photo?photo_name=${encodeURIComponent(p.photo_name)}`
                : 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
              rating: p.rating || 4.0,
              distance: userLocation && p.lat && p.lng 
                ? Math.round(calculateDistance(userLocation.lat, userLocation.lng, p.lat, p.lng) * 10) / 10
                : Math.round((Math.random() * 3 + 0.5) * 10) / 10,
            }));
            setRelatedPlaces(formattedRelated);
          }
        }
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
        url: window.location.href,
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
    if (placeId) {
      toggleSave(placeId);
      const wasSaved = isSaved(placeId);
      toast.success(wasSaved ? 'Removed from saved' : 'Saved to your spots!');
    }
  };

  const handleFindSimilarVibes = async () => {
    if (!placeId || isLoadingAiSimilar) return;
    
    setIsLoadingAiSimilar(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/find-similar-vibes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeId }),
        }
      );

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
          image: p.photo_name 
            ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/place-photo?photo_name=${encodeURIComponent(p.photo_name)}`
            : 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
          rating: p.rating || 4.0,
          distance: userLocation && p.lat && p.lng 
            ? Math.round(calculateDistance(userLocation.lat, userLocation.lng, p.lat, p.lng) * 10) / 10
            : Math.round((Math.random() * 3 + 0.5) * 10) / 10,
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
    return (
      <div className="min-h-screen bg-background max-w-[420px] mx-auto">
        <div className="absolute top-4 left-4 z-30">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background rounded-full w-10 h-10"
          >
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
      </div>
    );
  }

  if (error || !place) {
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
  const priceRange = getPriceRangeFromLevel(place.price_level);
  
  // Generate image URLs from photos array (real Google photos)
  const basePhotoUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/place-photo?photo_name=`;
  const placeImages = place.photos && place.photos.length > 0
    ? place.photos.map(photoName => `${basePhotoUrl}${encodeURIComponent(photoName)}`)
    : place.photo_name 
      ? [`${basePhotoUrl}${encodeURIComponent(place.photo_name)}`]
      : ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800'];

  // Parse opening hours for display
  const openingHoursDisplay = parseOpeningHours(place.opening_hours);
  
  // Format reviews for ReviewsList component
  const formattedReviews = place.reviews?.map((review, index) => ({
    id: `review-${index}`,
    name: review.author_name,
    rating: review.rating,
    text: review.text,
    date: review.relative_time,
  })) || [];


  return (
    <div className="min-h-screen bg-background max-w-[420px] mx-auto pb-28">
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
            {place.address && (
              <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary/60" />
                <span className="leading-relaxed">{place.address}</span>
              </p>
            )}
          </div>
          
          {/* Rating */}
          <div className="flex items-center gap-3 flex-wrap">
            {place.rating && (
              <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-2 rounded-xl">
                <Star className="w-4 h-4 text-primary fill-primary" />
                <span className="text-sm font-bold text-primary">
                  {place.rating.toFixed(1)}
                </span>
                <span className="text-xs text-primary/70">/ 5</span>
              </div>
            )}
            
            {/* Real Distance */}
            {distanceKm !== null && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {distanceKm} km
                </span>
              </div>
            )}
            
            {/* Real Price Range */}
            <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-muted">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {priceRange}
              </span>
            </div>
          </div>
          
          {place.ratings_total && (
            <span className="text-sm text-muted-foreground">
              Based on {place.ratings_total.toLocaleString()} reviews
            </span>
          )}
        </div>

        {/* 2b. Action Buttons - Save, Map, Share */}
        <ActionButtons
          isSaved={saved}
          onSave={handleSave}
          onViewMap={openInMaps}
          onShare={handleShare}
          flyImageSrc={placeImages[0]}
        />

        {/* 3. Opening Hours */}
        <QuickInfoSection 
          distance={distanceKm ?? 0}
          priceRange={priceRange}
          openingHours={openingHoursDisplay || [{ day: 'Hours', hours: 'Not available', isToday: true }]}
          isOpen={place.is_open_now}
        />

        {/* 4. Why You Should Visit */}
        <WhyVisitSection 
          placeName={place.name}
          categories={place.categories || []}
          rating={place.rating}
          priceLevel={place.price_level}
          reviewCount={place.ratings_total}
          aiReason={aiReason || place.ai_reason || undefined}
        />


        {/* 6. Reviews Section - Now with real Google reviews */}
        {formattedReviews.length > 0 ? (
          <ReviewsList reviews={formattedReviews} />
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No reviews available yet
          </div>
        )}

        {/* 7. Similar Places - "You might also like" */}
        {relatedPlaces.length > 0 && (
          <RelatedSpots places={relatedPlaces} onPlaceClick={handleRelatedClick} />
        )}
      </div>
    </div>
  );
};

export default PlaceDetailsPage;
