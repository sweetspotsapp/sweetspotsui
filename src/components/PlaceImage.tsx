import { useState, useCallback } from "react";
import { getStoragePhotoUrl, getEdgeFunctionPhotoUrl } from "@/lib/photoLoader";
import { cn } from "@/lib/utils";

interface PlaceImageProps {
  photoName: string | null;
  placeId: string;
  alt: string;
  className?: string;
  maxWidth?: number;
  maxHeight?: number;
  fallbackSrc?: string;
}

/**
 * Smart image component that tries cached storage URL first ({placeId}.jpg),
 * falls back to edge function (which fetches from Google + caches for next time).
 */
const PlaceImage = ({
  photoName,
  placeId,
  alt,
  className,
  maxWidth = 400,
  maxHeight = 400,
  fallbackSrc,
}: PlaceImageProps) => {
  const [src, setSrc] = useState<string | null>(() =>
    placeId ? getStoragePhotoUrl(placeId) : null
  );
  const [triedEdge, setTriedEdge] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleError = useCallback(() => {
    if (!photoName || !placeId) {
      setFailed(true);
      return;
    }

    if (!triedEdge) {
      // Storage miss → try edge function (fetches from Google + caches)
      setSrc(getEdgeFunctionPhotoUrl(photoName, placeId, maxWidth, maxHeight));
      setTriedEdge(true);
    } else {
      // Both failed
      setFailed(true);
    }
  }, [photoName, placeId, triedEdge, maxWidth, maxHeight]);

  if (failed || !src) {
    if (fallbackSrc) {
      return <img src={fallbackSrc} alt={alt} className={className} />;
    }
    return (
      <div className={cn("bg-muted flex items-center justify-center", className)}>
        <span className="text-muted-foreground/40 text-xs">No photo</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
    />
  );
};

export default PlaceImage;
