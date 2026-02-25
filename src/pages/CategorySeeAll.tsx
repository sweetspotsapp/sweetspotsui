import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Navigation, Heart } from "lucide-react";
import { MockPlace } from "@/components/PlaceCardCompact";
import { useSavedPlaces } from "@/hooks/useSavedPlaces";

interface LocationState {
  places: MockPlace[];
  userLocation: { lat: number; lng: number } | null;
  searchQuery?: string;
}

const CategorySeeAll = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleSave, isSaved } = useSavedPlaces();

  // Get data from navigation state
  const state = location.state as LocationState | null;
  const places = state?.places || [];
  const searchQuery = state?.searchQuery || "";

  // Redirect if no places data
  useEffect(() => {
    if (!state?.places || state.places.length === 0) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  const handlePlaceClick = (place: MockPlace) => {
    navigate(`/place/${place.id}`, { state: { place } });
  };

  const getPlaceholderImage = (name: string) => {
    return `https://source.unsplash.com/400x600/?restaurant,food&${name.slice(0, 3)}`;
  };

  // Get vibe tag from place data
  const getVibeTag = (place: MockPlace): string | null => {
    if (place.ai_category) {
      return place.ai_category.charAt(0).toUpperCase() + place.ai_category.slice(1);
    }
    if (place.categories && place.categories.length > 0) {
      const category = place.categories[0];
      if (category.toLowerCase().includes('bar') || category.toLowerCase().includes('club')) return 'Nightlife';
      if (category.toLowerCase().includes('cafe') || category.toLowerCase().includes('coffee')) return 'Cafe';
      if (category.toLowerCase().includes('restaurant')) return 'Restaurant';
      return category.replace(/_/g, ' ').split(' ')[0];
    }
    return null;
  };

  // Generate header text based on search query
  const getHeaderTitle = () => {
    if (searchQuery) {
      // Capitalize first letter and truncate if too long
      const formatted = searchQuery.charAt(0).toUpperCase() + searchQuery.slice(1);
      return formatted.length > 30 ? formatted.substring(0, 30) + "..." : formatted;
    }
    return "All Places";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 border-b border-border bg-card/95 backdrop-blur-sm max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-secondary rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-foreground truncate">{getHeaderTitle()}</h1>
          <p className="text-xs text-muted-foreground">{places.length} places found</p>
        </div>
      </header>

      {/* Pinterest-style Grid */}
      <div className="p-3 lg:p-6 max-w-4xl mx-auto">
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
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

                  {/* Vibe tag - always visible */}
                  {getVibeTag(place) && (
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 bg-card/90 backdrop-blur-sm text-xs font-medium text-foreground rounded-full shadow-sm">
                        {getVibeTag(place)}
                      </span>
                    </div>
                  )}

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

                {/* Info always visible below image */}
                <div className="mt-2 px-1">
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
