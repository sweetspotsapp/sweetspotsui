import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUp, ArrowDown, RefreshCw, Lock, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import SwapSheet from "./SwapSheet";
import type { Activity, SwapAlternative } from "@/hooks/useItinerary";

// No emoji icons — use text labels only

interface ActivityCardProps {
  activity: Activity;
  onSwap: () => Promise<SwapAlternative[] | undefined>;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onReplace: (newActivity: { name: string; description: string; category: string }) => void;
  isSwapping: boolean;
}

const ActivityCard = ({ activity, onSwap, onMoveUp, onMoveDown, onReplace, isSwapping }: ActivityCardProps) => {
  const navigate = useNavigate();
  const [showSwap, setShowSwap] = useState(false);
  const [alternatives, setAlternatives] = useState<SwapAlternative[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleCardClick = () => {
    if (activity.placeId) {
      navigate(`/place/${activity.placeId}`, { state: { fromItinerary: true } });
    }
  };

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

  const categoryLabel = activity.category ? activity.category.charAt(0).toUpperCase() + activity.category.slice(1) : "Place";

  // Build larger image URL
  const largeImageUrl = activity.photoName && !imageError
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/place-photo?photo_name=${encodeURIComponent(activity.photoName)}&maxWidthPx=400&maxHeightPx=250`
    : null;

  // Category-based gradient fallbacks when no photo available
  const CATEGORY_GRADIENTS: Record<string, string> = {
    food: "from-orange-800/60 to-amber-900/60",
    cafe: "from-amber-800/60 to-yellow-900/60",
    bar: "from-purple-800/60 to-violet-900/60",
    museum: "from-blue-800/60 to-indigo-900/60",
    park: "from-green-800/60 to-emerald-900/60",
    shopping: "from-pink-800/60 to-rose-900/60",
    landmark: "from-amber-700/60 to-orange-900/60",
    entertainment: "from-violet-800/60 to-purple-900/60",
    adventure: "from-teal-800/60 to-green-900/60",
    nightlife: "from-indigo-800/60 to-purple-900/60",
    beach: "from-cyan-700/60 to-blue-900/60",
    temple: "from-red-800/60 to-rose-900/60",
    market: "from-orange-700/60 to-red-900/60",
  };

  const fallbackGradient = CATEGORY_GRADIENTS[activity.category] || "from-muted to-muted-foreground/20";

  return (
    <>
      <div className={cn(
        "rounded-xl overflow-hidden transition-colors",
        activity.mustInclude ? "bg-primary/5 border border-primary/15" : "bg-card border border-border/50 hover:border-border"
      )}>
        {/* Hero Image - clickable to place detail */}
        <div
          className={cn("relative w-full h-32 bg-muted overflow-hidden", activity.placeId && "cursor-pointer")}
          onClick={handleCardClick}
        >
          {largeImageUrl ? (
            <img
              src={largeImageUrl}
              alt={activity.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={cn("w-full h-full bg-gradient-to-br flex items-center justify-center", fallbackGradient)}>
              <span className="text-sm font-semibold text-white/60 uppercase tracking-wider">{categoryLabel}</span>
            </div>
          )}
          <div className="absolute top-2 left-2 bg-card/80 backdrop-blur-sm text-xs font-medium px-2 py-0.5 rounded-full text-foreground capitalize">
            {categoryLabel}
          </div>
          {activity.placeId && (
            <div className="absolute top-2 right-2 bg-card/80 backdrop-blur-sm p-1 rounded-full">
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="px-3 py-2.5">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn("text-sm font-semibold text-foreground truncate", activity.placeId && "cursor-pointer hover:text-primary transition-colors")}
                  onClick={handleCardClick}
                >
                  {activity.name}
                </span>
                {activity.mustInclude && <Lock className="w-3 h-3 text-primary flex-shrink-0" />}
              </div>
              {activity.time && (
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              )}
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{activity.description}</p>
              <div className="flex items-center gap-2 mt-1.5">
                {activity.estimatedCost !== undefined && activity.estimatedCost > 0 && (
                  <span className="text-xs font-medium text-primary">${activity.estimatedCost}/pp</span>
                )}
                {activity.estimatedCost === 0 && (
                  <span className="text-xs font-medium text-green-600">Free</span>
                )}
              </div>
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
