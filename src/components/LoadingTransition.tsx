import { MapPin } from "lucide-react";

const LoadingTransition = () => {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center space-y-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/10 animate-ping absolute inset-0" />
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center relative animate-float">
            <MapPin className="w-10 h-10 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-foreground font-medium animate-gentle-pulse">
            Finding your perfect spots...
          </p>
          <p className="text-sm text-muted-foreground">
            This won't take long
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingTransition;
