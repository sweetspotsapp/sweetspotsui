import { useState } from "react";
import { ArrowUp, ArrowDown, RefreshCw, Lock, Loader2, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import SwapSheet from "./SwapSheet";
import type { Activity, SwapAlternative } from "@/hooks/useItinerary";

const CATEGORY_ICONS: Record<string, string> = {
  food: "🍽️",
  cafe: "☕",
  bar: "🍸",
  museum: "🏛️",
  park: "🌿",
  shopping: "🛍️",
  landmark: "📍",
  entertainment: "🎭",
  adventure: "🏔️",
  nightlife: "🌙",
  beach: "🏖️",
  temple: "⛩️",
  market: "🏪",
};

interface ActivityCardProps {
  activity: Activity;
  onSwap: () => Promise<SwapAlternative[] | undefined>;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onReplace: (newActivity: { name: string; description: string; category: string }) => void;
  isSwapping: boolean;
}

const ActivityCard = ({ activity, onSwap, onMoveUp, onMoveDown, onReplace, isSwapping }: ActivityCardProps) => {
  const [showSwap, setShowSwap] = useState(false);
  const [alternatives, setAlternatives] = useState<SwapAlternative[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleSwapClick = async () => {
    setLoading(true);
    const alts = await onSwap();
    setLoading(false);
    if (alts && alts.length > 0) {
      setAlternatives(alts);
      setShowSwap(true);
    }
  };

  const handleSelect = (alt: SwapAlternative) => {
    onReplace({ name: alt.name, description: alt.description, category: alt.category });
    setShowSwap(false);
  };

  const icon = CATEGORY_ICONS[activity.category] || "📍";

  // Build image URL from photo_name using the place-photo proxy
  const imageUrl = activity.photoName && !imageError
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/place-photo?photo_name=${encodeURIComponent(activity.photoName)}&maxWidthPx=200&maxHeightPx=200`
    : null;

  return (
    <>
      <div className={cn(
        "flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors",
        activity.mustInclude ? "bg-primary/5 border border-primary/15" : "hover:bg-muted/30"
      )}>
        {/* Image or Icon */}
        {imageUrl ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
            <img
              src={imageUrl}
              alt={activity.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <span className="text-lg mt-0.5 flex-shrink-0">{icon}</span>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground truncate">{activity.name}</span>
            {activity.mustInclude && <Lock className="w-3 h-3 text-primary flex-shrink-0" />}
          </div>
          {activity.time && (
            <span className="text-xs text-muted-foreground">{activity.time}</span>
          )}
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{activity.description}</p>
          {activity.estimatedCost !== undefined && activity.estimatedCost > 0 && (
            <div className="flex items-center gap-0.5 mt-1">
              <DollarSign className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-primary">${activity.estimatedCost}/pp</span>
            </div>
          )}
          {activity.estimatedCost === 0 && (
            <span className="text-xs text-green-600 mt-1 inline-block">Free</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          {onMoveUp && (
            <button onClick={onMoveUp} className="p-1 rounded-md hover:bg-muted transition-colors">
              <ArrowUp className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          {onMoveDown && (
            <button onClick={onMoveDown} className="p-1 rounded-md hover:bg-muted transition-colors">
              <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          {!activity.mustInclude && (
            <button
              onClick={handleSwapClick}
              disabled={loading}
              className="p-1 rounded-md hover:bg-muted transition-colors"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-primary" />
              )}
            </button>
          )}
        </div>
      </div>

      <SwapSheet
        isOpen={showSwap}
        onClose={() => setShowSwap(false)}
        alternatives={alternatives}
        onSelect={handleSelect}
        currentName={activity.name}
      />
    </>
  );
};

export default ActivityCard;
