import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Navigation, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import ImageCarousel from '@/components/place-detail/ImageCarousel';
import ReviewsList from '@/components/place-detail/ReviewsList';
import TipsSection from '@/components/place-detail/TipsSection';
import RelatedSpots from '@/components/place-detail/RelatedSpots';
import ActionButtons from '@/components/place-detail/ActionButtons';

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
}

// Mock data generators
const generateMockImages = (photoUrl: string | null, name: string): string[] => {
  const category = name.toLowerCase().includes('cafe') ? 'cafe' : 'restaurant';
  return [
    photoUrl || `https://source.unsplash.com/800x600/?${category},interior`,
    `https://source.unsplash.com/800x600/?${category},food`,
    `https://source.unsplash.com/800x600/?${category},ambiance`,
    `https://source.unsplash.com/800x600/?${category},drink`,
  ];
};

const mockReviews = [
  { id: '1', name: 'Sarah M.', rating: 5, text: 'Absolutely loved the atmosphere! Perfect spot for a weekend brunch with friends.', date: '2 days ago' },
  { id: '2', name: 'James K.', rating: 4, text: 'Great food and friendly staff. A bit crowded on weekends but worth the wait.', date: '1 week ago' },
  { id: '3', name: 'Emily R.', rating: 5, text: 'Hidden gem! The natural lighting is perfect for photos.', date: '2 weeks ago' },
];

const mockTips = [
  'Perfect for solo study sessions or catching up with friends',
  'Arrive early on weekends to avoid the brunch rush',
  'Try the signature house blend coffee — it\'s worth it!',
  'Outdoor seating available — ask for a window spot',
];

const mockRelatedPlaces = [
  { id: 'related-1', name: 'The Garden Cafe', image: 'https://source.unsplash.com/400x500/?cafe,garden', rating: 4.5, distance: 1.2 },
  { id: 'related-2', name: 'Urban Bites', image: 'https://source.unsplash.com/400x500/?restaurant,modern', rating: 4.3, distance: 0.8 },
  { id: 'related-3', name: 'Sunset Lounge', image: 'https://source.unsplash.com/400x500/?lounge,rooftop', rating: 4.7, distance: 2.1 },
  { id: 'related-4', name: 'Cozy Corner', image: 'https://source.unsplash.com/400x500/?cafe,cozy', rating: 4.4, distance: 1.5 },
];

const getPhotoUrl = (photoName: string | null): string | null => {
  if (!photoName) return null;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/place-photo?photo_name=${encodeURIComponent(photoName)}&maxWidthPx=800`;
};

const getPriceRange = (categories: string[] | null): string => {
  if (!categories) return '$$';
  const hasExpensive = categories.some(c => c.toLowerCase().includes('fine') || c.toLowerCase().includes('luxury'));
  const hasCheap = categories.some(c => c.toLowerCase().includes('fast') || c.toLowerCase().includes('casual'));
  if (hasExpensive) return '$$$';
  if (hasCheap) return '$';
  return '$$';
};

const getWhyVisit = (name: string, categories: string[] | null): string => {
  const category = categories?.[0]?.replace(/_/g, ' ').toLowerCase() || 'spot';
  return `A charming ${category} known for its welcoming atmosphere and quality offerings. Perfect for those seeking a memorable experience with great vibes and excellent service.`;
};

const PlaceDetailsPage = () => {
  const { placeId } = useParams<{ placeId: string }>();
  const navigate = useNavigate();
  const { isSaved, toggleSave, logInteraction } = useSavedPlaces();
  
  // Dummy place data for UI development
  const dummyPlace: PlaceDetails = {
    place_id: placeId || '1',
    name: 'The Botanical Garden Cafe',
    address: '123 Garden Lane, Melbourne VIC 3000',
    lat: -37.8136,
    lng: 144.9631,
    categories: ['cafe', 'brunch', 'garden'],
    rating: 4.6,
    ratings_total: 284,
    photo_name: null,
  };

  const place = dummyPlace;
  const photoUrl = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800';
  const isLoading = false;

  const images = useMemo(() => {
    if (!place) return [];
    return generateMockImages(photoUrl, place.name);
  }, [place, photoUrl]);

  const openInMaps = () => {
    if (place?.lat && place?.lng) {
      const url = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}&query_place_id=${place.place_id}`;
      window.open(url, '_blank');
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[420px] mx-auto">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
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

  const saved = placeId ? isSaved(placeId) : false;
  const priceRange = getPriceRange(place.categories);
  const whyVisit = getWhyVisit(place.name, place.categories);
  const mockDistance = (Math.random() * 5 + 0.5).toFixed(1);

  return (
    <div className="min-h-screen bg-background max-w-[420px] mx-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-primary">Place Details</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Hero Image Carousel */}
      <ImageCarousel images={images} placeName={place.name} />

      {/* Content */}
      <div className="px-4 py-4 space-y-5">
        {/* Name & Quick Info */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">{place.name}</h2>
          
          <div className="flex items-center flex-wrap gap-3">
            {/* Rating */}
            {place.rating && (
              <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
                <Star className="w-4 h-4 text-primary fill-primary" />
                <span className="text-sm font-semibold text-primary">
                  {place.rating} / 5
                </span>
                {place.ratings_total && (
                  <span className="text-xs text-primary/70">
                    ({place.ratings_total})
                  </span>
                )}
              </div>
            )}

            {/* Distance */}
            <div className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full">
              <Navigation className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{mockDistance} km</span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-1 bg-secondary px-3 py-1.5 rounded-full">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">{priceRange}</span>
            </div>
          </div>
        </div>

        {/* Why Visit */}
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">Why Visit</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{whyVisit}</p>
        </div>

        {/* Reviews */}
        <ReviewsList reviews={mockReviews} />

        {/* Tips */}
        <TipsSection tips={mockTips} />

        {/* Action Buttons */}
        <ActionButtons
          isSaved={saved}
          onSave={() => placeId && toggleSave(placeId)}
          onViewMap={openInMaps}
          onShare={handleShare}
        />

        {/* Related Spots */}
        <RelatedSpots places={mockRelatedPlaces} onPlaceClick={handleRelatedClick} />
      </div>
    </div>
  );
};

export default PlaceDetailsPage;
