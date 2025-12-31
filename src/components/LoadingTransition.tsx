import { MapPin, Sparkles } from "lucide-react";

const LoadingTransition = () => {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>
      
      <div className="relative flex flex-col items-center text-center px-8">
        {/* Main loader icon */}
        <div className="relative mb-8">
          {/* Outer ring pulse */}
          <div className="absolute inset-0 w-24 h-24 rounded-full border-2 border-primary/20 animate-ping" />
          
          {/* Middle ring */}
          <div className="absolute inset-0 w-24 h-24 rounded-full border border-primary/30 animate-[spin_3s_linear_infinite]" />
          
          {/* Inner circle with icon */}
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center backdrop-blur-sm">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-primary animate-bounce" />
            </div>
          </div>
          
          {/* Floating sparkles */}
          <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-primary/60 animate-pulse" />
          <Sparkles className="absolute -bottom-1 -left-3 w-4 h-4 text-primary/40 animate-pulse delay-300" />
        </div>
        
        {/* Text content - centered and symmetrical */}
        <div className="flex flex-col items-center gap-3 max-w-xs">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            Finding your SweetSpots
          </h2>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-sm text-muted-foreground">
            Curating places based on your vibe
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingTransition;
