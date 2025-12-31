import { Sparkles } from "lucide-react";
import { IceCreamCone } from "lucide-react";

const LoadingTransition = () => {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>
      
      <div className="relative flex flex-col items-center text-center px-8">
        {/* Main loader - Ice cream animation */}
        <div className="relative mb-8">
          {/* Drip animation circles */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-primary/20 animate-ping" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-primary/30 animate-[spin_4s_linear_infinite]" />
          
          {/* Ice cream cone container */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Wobble animation for ice cream */}
            <div className="animate-[bounce_1.5s_ease-in-out_infinite]">
              <IceCreamCone className="w-14 h-14 text-primary drop-shadow-lg" strokeWidth={1.5} />
            </div>
          </div>
          
          {/* Floating sparkles - like sprinkles */}
          <Sparkles className="absolute -top-1 right-0 w-5 h-5 text-amber-400 animate-pulse" />
          <Sparkles className="absolute top-1/4 -left-2 w-4 h-4 text-pink-400 animate-pulse delay-200" />
          <Sparkles className="absolute bottom-1/4 -right-3 w-3 h-3 text-cyan-400 animate-pulse delay-500" />
        </div>
        
        {/* Text content */}
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
