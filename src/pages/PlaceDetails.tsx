import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, Clock, Navigation, ExternalLink, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { Skeleton } from '@/components/ui/skeleton';

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

const PlaceDetailsPage = () => {
  const { placeId } = useParams<{ placeId: string }>();
  const navigate = useNavigate();
  const { isSaved, toggleSave, logInteraction } = useSavedPlaces();
  
  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Log click interaction
  useEffect(() => {
    if (placeId) {
      logInteraction(placeId, 'click', 1);
    }
  }, [placeId, logInteraction]);

  // Fetch place details
  useEffect(() => {
    const fetchPlace = async () => {
      if (!placeId) return;
      
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('places')
          .select('*')
          .eq('place_id', placeId)
          .maybeSingle();

        if (fetchError) throw fetchError;
        
        if (!data) {
          setError('Place not found');
          return;
        }

        setPlace(data);

        // Resolve photo
        if (data.photo_name) {
          const { data: photoData } = await supabase.functions.invoke(
            'resolve_photos_for_places',
            { body: { place_ids: [placeId], maxWidthPx: 800 } }
          );
          
          if (photoData?.photos?.[0]?.photo_url) {
            setPhotoUrl(photoData.photos[0].photo_url);
          }
        }
      } catch (err) {
        console.error('Error fetching place:', err);
        setError('Failed to load place details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlace();
  }, [placeId]);

  const openInMaps = () => {
    if (place?.lat && place?.lng) {
      const url = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}&query_place_id=${place.place_id}`;
      window.open(url, '_blank');
    }
  };

  const getPlaceholderImage = () => {
    const category = place?.categories?.[0]?.toLowerCase() || 'place';
    return `https://source.unsplash.com/800x600/?${category},travel`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[420px] mx-auto">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
        <div className="px-4 space-y-4">
          <Skeleton className="w-full aspect-video rounded-2xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="min-h-screen bg-background max-w-[420px] mx-auto flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">{error || 'Place not found'}</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const saved = placeId ? isSaved(placeId) : false;

  return (
    <div className="min-h-screen bg-background max-w-[420px] mx-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-primary">Place Details</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => placeId && toggleSave(placeId)}
          >
            <Heart className={`w-5 h-5 ${saved ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
          </Button>
        </div>
      </div>

      {/* Image */}
      <div className="px-4">
        <div className="relative rounded-2xl overflow-hidden aspect-video bg-muted">
          <img
            src={photoUrl || getPlaceholderImage()}
            alt={place.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getPlaceholderImage();
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 mt-4 space-y-4">
        <h2 className="text-2xl font-bold text-foreground">{place.name}</h2>

        {/* Rating */}
        {place.rating && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className="text-sm font-semibold text-primary">{place.rating}</span>
            </div>
            {place.ratings_total && (
              <span className="text-sm text-muted-foreground">
                ({place.ratings_total.toLocaleString()} reviews)
              </span>
            )}
          </div>
        )}

        {/* Address */}
        {place.address && (
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">{place.address}</p>
          </div>
        )}

        {/* Categories */}
        {place.categories && place.categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {place.categories.slice(0, 5).map((cat, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-secondary text-secondary-foreground text-xs rounded-full"
              >
                {cat.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Open in Maps Button */}
        <Button
          onClick={openInMaps}
          className="w-full gap-2"
          disabled={!place.lat || !place.lng}
        >
          <ExternalLink className="w-4 h-4" />
          Open in Google Maps
        </Button>
      </div>
    </div>
  );
};

export default PlaceDetailsPage;
