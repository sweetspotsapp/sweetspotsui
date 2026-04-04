import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Star } from "lucide-react";

interface SavedPlace {
  place_id: string;
  name: string;
  photo_name: string | null;
  rating: number | null;
  address: string | null;
}

interface RecentlySavedSectionProps {
  onPlaceClick?: (placeId: string) => void;
}

const RecentlySavedSection = ({ onPlaceClick }: RecentlySavedSectionProps) => {
  const { user } = useAuth();
  const [places, setPlaces] = useState<SavedPlace[]>([]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data } = await supabase
        .from("saved_places")
        .select("place_id, places(name, photo_name, rating, address)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        setPlaces(
          data
            .filter((d: any) => d.places)
            .map((d: any) => ({
              place_id: d.place_id,
              name: d.places.name,
              photo_name: d.places.photo_name,
              rating: d.places.rating,
              address: d.places.address,
            }))
        );
      }
    };

    load();
  }, [user]);

  if (places.length === 0) return null;

  return (
    <div>
      <h3 className="text-base font-semibold text-foreground mb-3">Recently Saved</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
        {places.map((place) => {
          const photoUrl = place.photo_name
            ? `https://bqjuoxckvrkykfqpbkpv.supabase.co/functions/v1/place-photo?photo_name=${encodeURIComponent(place.photo_name)}&maxWidthPx=400`
            : null;

          return (
            <button
              key={place.place_id}
              onClick={() => onPlaceClick?.(place.place_id)}
              className="shrink-0 w-36 group text-left"
            >
              <div className="w-36 h-28 rounded-xl overflow-hidden bg-muted mb-2">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={place.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10" />
                )}
              </div>
              <p className="text-sm font-medium text-foreground truncate">{place.name}</p>
              {place.rating && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3 h-3 text-primary fill-primary" />
                  <span className="text-xs text-muted-foreground">{place.rating}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RecentlySavedSection;
