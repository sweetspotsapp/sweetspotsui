import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, List } from "lucide-react";
import SeeAllMap from "@/components/see-all/SeeAllMap";
import SeeAllList from "@/components/see-all/SeeAllList";
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

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"split" | "list" | "map">("split");

  // Get data from navigation state
  const state = location.state as LocationState | null;
  const places = state?.places || [];
  const userLocation = state?.userLocation || null;

  // Redirect if no places data
  useEffect(() => {
    if (!state?.places || state.places.length === 0) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  const handlePinClick = (placeId: string) => {
    setSelectedPlaceId(placeId);
  };

  const handleCardClick = (placeId: string) => {
    setSelectedPlaceId(placeId);
  };

  const handleNavigateToPlace = (place: MockPlace) => {
    navigate(`/place/${place.id}`, { state: { place } });
  };

  const decodedCategoryName = categoryName
    ? decodeURIComponent(categoryName)
    : "Places";

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
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
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode("split")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === "split"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Split
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === "map"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapPin className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === "list"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {viewMode === "split" && (
          <>
            {/* Map - top half */}
            <div className="h-1/2 border-b border-border">
              <SeeAllMap
                places={places}
                selectedId={selectedPlaceId}
                onPinClick={handlePinClick}
                userLocation={userLocation}
              />
            </div>
            {/* List - bottom half */}
            <div className="h-1/2">
              <SeeAllList
                places={places}
                selectedId={selectedPlaceId}
                onCardClick={handleCardClick}
                onSave={toggleSave}
                isSaved={isSaved}
                onNavigate={handleNavigateToPlace}
              />
            </div>
          </>
        )}

        {viewMode === "map" && (
          <div className="flex-1">
            <SeeAllMap
              places={places}
              selectedId={selectedPlaceId}
              onPinClick={handlePinClick}
              userLocation={userLocation}
            />
          </div>
        )}

        {viewMode === "list" && (
          <div className="flex-1">
            <SeeAllList
              places={places}
              selectedId={selectedPlaceId}
              onCardClick={handleCardClick}
              onSave={toggleSave}
              isSaved={isSaved}
              onNavigate={handleNavigateToPlace}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CategorySeeAll;
