import SweetSpotsLoader from "./SweetSpotsLoader";

const LoadingTransition = () => {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="relative flex flex-col items-center text-center px-8">
        <div className="mb-8">
          <SweetSpotsLoader size="md" />
        </div>

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