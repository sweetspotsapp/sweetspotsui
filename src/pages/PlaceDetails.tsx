import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, DollarSign } from 'lucide-react';
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
  distance_km?: number;
  price_range?: string;
}

// Dummy data for images (will use place photo when available)
const dummyImages = [
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
  'https://images.unsplash.com/photo-1559305616-3f99cd43e353?w=800',
  'https://images.unsplash.com/photo-1525610553991-2bede1a236e2?w=800',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
];

const mockReviews = [
  { id: '1', name: 'Sarah M.', rating: 5, text: 'Absolutely loved the atmosphere! Perfect spot for weekend brunch 🌿', date: '2 days ago' },
  { id: '2', name: 'James K.', rating: 4, text: 'Great food and friendly staff. A bit crowded on weekends but worth it!', date: '1 week ago' },
  { id: '3', name: 'Emily R.', rating: 5, text: 'Hidden gem! The natural lighting is *chef\'s kiss* for photos 📸', date: '2 weeks ago' },
  { id: '4', name: 'Mike T.', rating: 4, text: 'Love their house blend coffee. Will definitely come back!', date: '3 weeks ago' },
];

interface RelatedPlace {
  id: string;
  name: string;
  image: string;
  rating: number;
  distance: number;
}

const mockOpeningHours = [
  { day: 'Monday', hours: '7:00 AM - 6:00 PM', isToday: false },
  { day: 'Tuesday', hours: '7:00 AM - 6:00 PM', isToday: false },
  { day: 'Wednesday', hours: '7:00 AM - 6:00 PM', isToday: false },
  { day: 'Thursday', hours: '7:00 AM - 9:00 PM', isToday: false },
  { day: 'Friday', hours: '7:00 AM - 10:00 PM', isToday: false },
  { day: 'Saturday', hours: '8:00 AM - 10:00 PM', isToday: true },
  { day: 'Sunday', hours: '8:00 AM - 5:00 PM', isToday: false },
];

const mockTrafficHours = [
  { time: '8am', level: 2 as const },
  { time: '10am', level: 4 as const },
  { time: '12pm', level: 5 as const },
  { time: '2pm', level: 3 as const },
  { time: '4pm', level: 4 as const },
  { time: '6pm', level: 5 as const },
  { time: '8pm', level: 3 as const },
];

// Helper to estimate price range from categories
const getPriceRange = (categories: string[] | null): string => {
  if (!categories) return '$$';
  const cats = categories.map(c => c.toLowerCase());
  if (cats.some(c => c.includes('fine dining') || c.includes('luxury'))) return '$$$';
  if (cats.some(c => c.includes('fast food') || c.includes('takeaway'))) return '$';
  return '$$';
};

const PlaceDetailsPage = () => {
  const { placeId } = useParams<{ placeId: string }>();
  const navigate = useNavigate();
  const { isSaved, toggleSave } = useSavedPlaces();
  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [relatedPlaces, setRelatedPlaces] = useState<RelatedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const placeData: PlaceDetails = {
          ...data,
          distance_km: 2.3, // TODO: Calculate from user location
          price_range: getPriceRange(data.categories),
        };
        setPlace(placeData);

        // Fetch related places based on categories
        if (data.categories && data.categories.length > 0) {
          const { data: related, error: relatedError } = await supabase
            .from('places')
            .select('place_id, name, photo_name, rating')
            .neq('place_id', placeId)
            .overlaps('categories', data.categories)
            .limit(6);

          if (!relatedError && related) {
            const formattedRelated: RelatedPlace[] = related.map(p => ({
              id: p.place_id,
              name: p.name,
              image: p.photo_name 
                ? `https://bqjuoxckvrkykfqpbkpv.supabase.co/functions/v1/place-photo?photo_name=${encodeURIComponent(p.photo_name)}`
                : 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
              rating: p.rating || 4.0,
              distance: Math.round((Math.random() * 3 + 0.5) * 10) / 10, // TODO: Calculate real distance
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
  }, [placeId]);

  const openInMaps = () => {
    if (place?.lat && place?.lng) {
      // Open in Google Maps with place name for better results
      const query = encodeURIComponent(place.name);
      const url = `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${place.place_id}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (place?.address) {
      // Fallback to address search
      const query = encodeURIComponent(`${place.name} ${place.address}`);
      const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
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
  
  // Generate image URLs - use place photo if available, otherwise fallback to dummy
  const placeImages = place.photo_name 
    ? [`https://bqjuoxckvrkykfqpbkpv.supabase.co/functions/v1/place-photo?photo_name=${encodeURIComponent(place.photo_name)}`, ...dummyImages.slice(1)]
    : dummyImages;

  // Generate description from categories
  const generateDescription = () => {
    const cats = place.categories?.slice(0, 3).join(', ') || 'local spot';
    return `A ${place.price_range === '$' ? 'budget-friendly' : place.price_range === '$$$' ? 'premium' : 'charming'} ${cats} in ${place.address?.split(',')[1]?.trim() || 'the area'}. Perfect for those seeking quality experiences with a memorable atmosphere.`;
  };

  return (
    <div className="min-h-screen bg-background max-w-[420px] mx-auto pb-28">
      {/* Floating Back Button */}
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

      {/* 1. Hero Image Carousel */}
      <ImageCarousel images={placeImages} placeName={place.name} />

      {/* Content */}
      <div className="px-4 py-5 space-y-6">
        {/* 2. Place Name & Info */}
        <div className="space-y-3 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {place.name}
          </h1>
          
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
            
            {/* Distance */}
            {place.distance_km && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {place.distance_km} km
                </span>
              </div>
            )}
            
            {/* Price Range */}
            {place.price_range && (
              <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-muted">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {place.price_range}
                </span>
              </div>
            )}
          </div>
          
          {place.ratings_total && (
            <span className="text-sm text-muted-foreground">
              Based on {place.ratings_total} reviews
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

        {/* 3. Opening Hours & Busy Times */}
        <QuickInfoSection 
          distance={place.distance_km || 2.3}
          priceRange={place.price_range || "$$"}
          openingHours={mockOpeningHours}
          trafficHours={mockTrafficHours}
        />

        {/* 4. Why You Should Visit */}
        <WhyVisitSection 
          description={generateDescription()}
          vibes={place.categories?.slice(0, 4).map(c => c.charAt(0).toUpperCase() + c.slice(1)) || ['Great Spot']}
        />

        {/* 5. Reviews Section */}
        <ReviewsList reviews={mockReviews} />

        {/* 6. Similar Places - "You might also like" */}
        {relatedPlaces.length > 0 && (
          <RelatedSpots places={relatedPlaces} onPlaceClick={handleRelatedClick} />
        )}
      </div>
    </div>
  );
};

export default PlaceDetailsPage;