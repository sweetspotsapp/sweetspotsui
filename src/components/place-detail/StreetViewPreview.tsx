import { useState } from "react";
import { Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StreetViewPreviewProps {
  lat: number;
  lng: number;
}

const StreetViewPreview = ({ lat, lng }: StreetViewPreviewProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const streetViewUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/street-view?lat=${lat}&lng=${lng}&width=600&height=300`;

  if (hasError) return null;

  return (
    <div className="space-y-2 animate-fade-in">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Street View</h3>
      </div>
      <div className="relative rounded-xl overflow-hidden bg-muted">
        {isLoading && (
          <Skeleton className="w-full aspect-[2/1] absolute inset-0 z-10" />
        )}
        <img
          src={streetViewUrl}
          alt="Street View"
          className="w-full aspect-[2/1] object-cover"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default StreetViewPreview;
