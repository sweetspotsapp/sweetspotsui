import { MapPin } from "lucide-react";

const LoadingTransition = () => {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center space-y-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-primary/10 animate-ping absolute inset-0" />
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center relative animate-float">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
        </div>
        <p className="text-muted-foreground animate-gentle-pulse">
          Finding your perfect spots...
        </p>
      </div>
    </div>
  );
};

export default LoadingTransition;
