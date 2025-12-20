import { X, Heart, MapPin, Clock, DollarSign, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Place } from "@/data/mockPlaces";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PlaceDetailProps {
  place: Place;
  onClose: () => void;
  userMood?: string;
}

const PlaceDetail = ({ place, onClose, userMood }: PlaceDetailProps) => {
  const [isSaved, setIsSaved] = useState(false);

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
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header Image */}
      <div className="relative h-[45vh] overflow-hidden">
        <img 
          src={place.image} 
          alt={place.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-full bg-background/80 backdrop-blur-sm text-foreground"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Save button */}
        <button
          onClick={() => setIsSaved(!isSaved)}
          className={cn(
            "absolute top-4 right-4 p-2 rounded-full backdrop-blur-sm transition-all",
            isSaved 
              ? "bg-primary/20 text-primary" 
              : "bg-background/80 text-foreground"
          )}
        >
          <Heart className={cn("w-5 h-5", isSaved && "fill-current")} />
        </button>

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
      <div className="px-4 py-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(55vh - 80px)' }}>
        {/* Why this place section - Bumble style */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Why we picked this for you</h2>
          </div>
          
          <div className="space-y-3">
            {reasons.map((reason, index) => {
              const Icon = reason.icon;
              return (
                <div 
                  key={index}
                  className="flex gap-3 p-3 rounded-xl bg-card border border-border opacity-0 animate-fade-up"
                  style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
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

        {/* Quick info */}
        <section className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-warm-cream text-foreground text-xs">
            <DollarSign className="w-3.5 h-3.5" />
            <span>$$</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-warm-cream text-foreground text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Open until 11pm</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-warm-cream text-foreground text-xs">
            <MapPin className="w-3.5 h-3.5" />
            <span>0.8 miles</span>
          </div>
        </section>
      </div>

      {/* Bottom CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
        <div className="max-w-md mx-auto flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 h-12 rounded-xl"
            onClick={() => setIsSaved(!isSaved)}
          >
            <Heart className={cn("w-5 h-5 mr-2", isSaved && "fill-current text-primary")} />
            {isSaved ? "Saved" : "Save"}
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
