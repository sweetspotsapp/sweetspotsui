import { X, MapPin, Calendar, Star } from "lucide-react";
import type { SavedTrip } from "@/hooks/useTrip";
import { differenceInDays, parseISO } from "date-fns";
import DaySection from "./trip/DaySection";

interface TripPreviewSheetProps {
  trip: SavedTrip;
  onClose: () => void;
}

const TripPreviewSheet = ({ trip, onClose }: TripPreviewSheetProps) => {
  const getTripDuration = () => {
    try {
      return differenceInDays(parseISO(trip.end_date), parseISO(trip.start_date)) + 1;
    } catch {
      return 0;
    }
  };

  const totalSpots = trip.trip_data?.days?.reduce(
    (count, day) => count + day.slots.reduce((sc, slot) => sc + slot.activities.length, 0),
    0
  ) || 0;

  const duration = getTripDuration();

  const getPhotoUrl = () => {
    if (trip.trip_data?.days) {
      for (const day of trip.trip_data.days) {
        for (const slot of day.slots) {
          for (const activity of slot.activities) {
            if (activity.photoName) {
              return `https://bqjuoxckvrkykfqpbkpv.supabase.co/functions/v1/place-photo?photo_name=${encodeURIComponent(activity.photoName)}&maxWidthPx=800`;
            }
          }
        }
      }
    }
    return null;
  };

  const photoUrl = getPhotoUrl();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-md bg-card rounded-t-3xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 pb-8">
          {/* Hero image */}
          {photoUrl && (
            <div className="mx-4 rounded-2xl overflow-hidden aspect-video mb-4">
              <img src={photoUrl} alt={trip.name || trip.destination} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Trip info */}
          <div className="px-5 mb-4">
            <h2 className="text-xl font-bold text-foreground mb-1">
              {trip.name || `${trip.destination} Trip`}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                {totalSpots} spots
              </span>
              {duration > 0 && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  {duration} days
                </span>
              )}
              {trip.trip_data?.days && (
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-primary" />
                  4.5
                </span>
              )}
            </div>
            {trip.trip_data?.summary && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                {trip.trip_data.summary}
              </p>
            )}
          </div>

          {/* Day-by-day itinerary (read-only) */}
          {trip.trip_data?.days && (
            <div className="px-4 space-y-4">
              {trip.trip_data.days.map((day, dayIndex) => (
                <DaySection
                  key={dayIndex}
                  day={day}
                  dayIndex={dayIndex}
                  onSwap={async () => undefined}
                  onReplace={() => {}}
                  isSwapping={false}
                  isEditing={false}
                  onRemoveActivity={() => {}}
                  onAddActivity={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripPreviewSheet;
