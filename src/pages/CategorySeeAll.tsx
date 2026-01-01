import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, Navigation, Heart } from "lucide-react";
import { MockPlace } from "@/components/PlaceCardCompact";
import { useSavedPlaces } from "@/hooks/useSavedPlaces";

interface LocationState {
  places: MockPlace[];
  userLocation: { lat: number; lng: number } | null;
}

const CategorySeeAll = () => {
  const { categoryName } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleSave, isSaved } = useSavedPlaces();

  // Get data from navigation state
  const state = location.state as LocationState | null;
  const places = state?.places || [];

  // Redirect if no places data
  useEffect(() => {
    if (!state?.places || state.places.length === 0) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  const handlePlaceClick = (place: MockPlace) => {
    navigate(`/place/${place.id}`, { state: { place } });
  };

  const decodedCategoryName = categoryName
    ? decodeURIComponent(categoryName)
    : "Places";

  const getPlaceholderImage = (name: string) => {
    return `https://source.unsplash.com/400x600/?restaurant,food&${name.slice(0, 3)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 border-b border-border bg-card/95 backdrop-blur-sm">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-secondary rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-semibold text-foreground">{decodedCategoryName}</h1>
          <p className="text-xs text-muted-foreground">{places.length} places</p>
        </div>
      </header>

      {/* Pinterest-style Grid */}
      <div className="p-3">
        <div className="columns-2 gap-3 space-y-3">
          {places.map((place, index) => {
            const saved = isSaved(place.id);
            const imageUrl = place.image || getPlaceholderImage(place.name);
            // Vary heights for Pinterest effect
            const isLarge = index % 3 === 0;

            return (
              <div
                key={place.id}
                className="break-inside-avoid group cursor-pointer"
                onClick={() => handlePlaceClick(place)}
              >
                <div
                  className={`relative rounded-2xl overflow-hidden bg-muted ${
                    isLarge ? "aspect-[3/4]" : "aspect-square"
                  }`}
                >
                  {/* Image */}
                  <img
                    src={imageUrl}
                    alt={place.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getPlaceholderImage(place.name);
                    }}
                  />

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                  {/* Save button - always visible */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSave(place.id);
                    }}
                    className="absolute top-3 right-3 p-2 bg-card/80 backdrop-blur-sm rounded-full shadow-lg transition-all hover:scale-110"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        saved ? "fill-primary text-primary" : "text-foreground"
                      }`}
                    />
                  </button>

                  {/* Info overlay - visible on hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <h3 className="font-semibold text-white text-sm line-clamp-2 mb-1">
                      {place.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-white/90">
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{place.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-white/60">•</span>
                      <div className="flex items-center gap-0.5">
                        <Navigation className="w-3 h-3" />
                        <span>{place.distance_km.toFixed(1)} km</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile: Info always visible below image */}
                <div className="mt-2 px-1 md:hidden">
                  <h3 className="font-semibold text-foreground text-sm line-clamp-1">
                    {place.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-primary text-primary" />
                      <span>{place.rating.toFixed(1)}</span>
                    </div>
                    <span>•</span>
                    <span>{place.distance_km.toFixed(1)} km</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CategorySeeAll;
