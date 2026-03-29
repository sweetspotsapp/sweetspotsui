import { Sparkles, MapPin, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EmptyStateProps {
  type: "boards" | "places";
}

const EmptyState = ({ type }: EmptyStateProps) => {
  const navigate = useNavigate();

  if (type === "boards") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
        {/* Fun Illustration */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Heart className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          {/* Floating Sparkles */}
          <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-400 animate-pulse" />
          <Sparkles className="absolute -bottom-2 -left-2 w-4 h-4 text-primary/60 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
        
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No boards yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-[260px] mb-6">
          Save a place and start your first board to organize your favorite spots
        </p>
        
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-medium 
                     hover:bg-primary/90 transition-all active:scale-[0.98] flex items-center gap-2"
        >
          <MapPin className="w-4 h-4" />
          Explore Places
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
        <Heart className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">No saved spots yet</h3>
      <p className="text-xs text-muted-foreground max-w-[220px]">
        Tap the heart on any place to save it here
      </p>
    </div>
  );
};

export default EmptyState;
