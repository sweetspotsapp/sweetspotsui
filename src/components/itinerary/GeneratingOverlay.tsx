import { cn } from "@/lib/utils";

interface GeneratingOverlayProps {
  isVisible: boolean;
}

const GeneratingOverlay = ({ isVisible }: GeneratingOverlayProps) => {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[70] flex items-center justify-center bg-background/90 backdrop-blur-sm transition-opacity duration-300",
      isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      <div className="flex flex-col items-center gap-6 px-8">
        {/* Minimal animated loader */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
        </div>

        <p className="text-base font-medium text-foreground tracking-tight">
          Generating your itinerary...
        </p>
      </div>
    </div>
  );
};

export default GeneratingOverlay;
