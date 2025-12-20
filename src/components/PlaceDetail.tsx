import { X, Heart, MapPin, Clock, DollarSign, Sparkles, Users, ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Place } from "@/data/mockPlaces";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useApp } from "@/context/AppContext";

interface PlaceDetailProps {
  place: Place;
  onClose: () => void;
  userMood?: string;
}

const PlaceDetail = ({ place, onClose, userMood }: PlaceDetailProps) => {
  const { isSaved, toggleSave } = useApp();
  const saved = isSaved(place.id);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = place.images || [place.image];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Generate personalized reasons based on the place and user mood
  const getPersonalizedReasons = () => {
    const reasons = [
      {
        icon: Sparkles,
        title: "Perfect for your vibe",
        description: `You mentioned wanting something "${place.vibeTag.toLowerCase()}" — this place nails that energy perfectly.`
      },
      {
        icon: Users,
        title: "Great for what you need",
        description: `${place.practicalHint} — exactly what you were looking for tonight.`
      },
      {
        icon: MapPin,
        title: "Right in your area",
        description: "Just 8 mins away. Close enough to be spontaneous."
      },
      {
        icon: Clock,
        title: "Timing works out",
        description: "Open right now and usually not too busy at this hour."
      }
    ];
    return reasons;
  };

  const reasons = getPersonalizedReasons();

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Image Gallery */}
      <div className="relative h-[40vh] min-h-[280px] overflow-hidden">
        <img 
          src={images[currentImageIndex]} 
          alt={`${place.name} - Photo ${currentImageIndex + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2.5 rounded-full bg-background/80 backdrop-blur-sm text-foreground shadow-soft"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Save button */}
        <button
          onClick={() => toggleSave(place)}
          className={cn(
            "absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-sm shadow-soft transition-all",
            saved 
              ? "bg-primary/20 text-primary" 
              : "bg-background/80 text-foreground"
          )}
        >
          <Heart className={cn("w-5 h-5", saved && "fill-current")} />
        </button>

        {/* Image navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/60 backdrop-blur-sm text-foreground hover:bg-background/80 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/60 backdrop-blur-sm text-foreground hover:bg-background/80 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Image indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentImageIndex 
                    ? "bg-primary w-4" 
                    : "bg-background/60 hover:bg-background/80"
                )}
              />
            ))}
          </div>
        )}

        {/* Place info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex gap-2 mb-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
              {place.vibeTag}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
              {place.category}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{place.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{place.practicalHint}</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-5 space-y-5 pb-28">
        {/* Image thumbnails */}
        {images.length > 1 && (
          <section className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {images.map((img, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={cn(
                  "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                  index === currentImageIndex 
                    ? "border-primary" 
                    : "border-transparent opacity-70 hover:opacity-100"
                )}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </section>
        )}

        {/* Why this place section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Why we picked this for you</h2>
          </div>
          
          <div className="space-y-2.5">
            {reasons.map((reason, index) => {
              const Icon = reason.icon;
              return (
                <div 
                  key={index}
                  className="flex gap-3 p-3 rounded-xl bg-card border border-border opacity-0 animate-fade-up"
                  style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">{reason.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{reason.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* What to prepare section */}
        {place.whatToPrepare && place.whatToPrepare.length > 0 && (
          <section className="space-y-3 opacity-0 animate-fade-up" style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                <Lightbulb className="w-3.5 h-3.5 text-accent-foreground" />
              </div>
              <h2 className="text-base font-semibold text-foreground">What to prepare</h2>
            </div>
            
            <div className="bg-warm-cream rounded-xl p-4 space-y-2.5">
              {place.whatToPrepare.map((tip, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <p className="text-sm text-foreground">{tip}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick info */}
        <section className="flex gap-2 flex-wrap opacity-0 animate-fade-up" style={{ animationDelay: '450ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-card border border-border text-foreground text-xs">
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
            <span>$$</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-card border border-border text-foreground text-xs">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Open until 11pm</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-card border border-border text-foreground text-xs">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span>0.8 miles</span>
          </div>
        </section>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
        <div className="max-w-md mx-auto flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 h-12 rounded-xl"
            onClick={() => toggleSave(place)}
          >
            <Heart className={cn("w-5 h-5 mr-2", saved && "fill-current text-primary")} />
            {saved ? "Saved" : "Save"}
          </Button>
          <Button 
            variant="primary" 
            className="flex-1 h-12 rounded-xl"
          >
            <MapPin className="w-5 h-5 mr-2" />
            Take me there
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlaceDetail;
