import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
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

// Dummy data for images
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

const mockRelatedPlaces = [
  { id: 'related-1', name: 'The Garden Cafe', image: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=400', rating: 4.5, distance: 1.2 },
  { id: 'related-2', name: 'Urban Bites', image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400', rating: 4.3, distance: 0.8 },
  { id: 'related-3', name: 'Sunset Lounge', image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400', rating: 4.7, distance: 2.1 },
  { id: 'related-4', name: 'Cozy Corner', image: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=400', rating: 4.4, distance: 1.5 },
];

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

const PlaceDetailsPage = () => {
  const { placeId } = useParams<{ placeId: string }>();
  const navigate = useNavigate();
  const { isSaved, toggleSave } = useSavedPlaces();
  const [isLoading] = useState(false);
  
  // Dummy place data for UI development
  const dummyPlace: PlaceDetails = {
    place_id: placeId || '1',
    name: 'The Botanical Garden Cafe',
    address: '123 Garden Lane, Melbourne VIC 3000',
    lat: -37.8136,
    lng: 144.9631,
    categories: ['cafe', 'brunch', 'garden', 'instagrammable'],
    rating: 4.6,
    ratings_total: 284,
    photo_name: null,
    distance_km: 2.3,
    price_range: '$$',
  };

  const place = dummyPlace;

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
      <ImageCarousel images={dummyImages} placeName={place.name} />

      {/* Content */}
      <div className="px-4 py-5 space-y-6">
        {/* 2. Place Name & Info */}
        <div className="space-y-3 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {place.name}
          </h1>
          
          {/* Rating, Distance, Price Row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Rating */}
            <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-2 rounded-xl">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className="text-sm font-bold text-primary">
                {place.rating}
              </span>
              <span className="text-xs text-primary/70">/ 5</span>
            </div>
            
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
          imageUrl={dummyImages[0]}
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
          description="A cozy hidden wine bar with city views, perfect for relaxed evenings and intimate conversations. Known for its lush indoor plants, Instagram-worthy corners, and specialty coffee that'll make your taste buds dance."
          vibes={['Instagrammable', 'Cozy', 'Plant Paradise', 'Brunch Spot']}
        />

        {/* 5. Reviews Section */}
        <ReviewsList reviews={mockReviews} />

        {/* 6. Similar Places - "You might also like" */}
        <RelatedSpots places={mockRelatedPlaces} onPlaceClick={handleRelatedClick} />
      </div>
    </div>
  );
};

export default PlaceDetailsPage;