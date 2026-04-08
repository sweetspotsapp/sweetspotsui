import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, Loader2, ExternalLink, Heart, Trash2, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import ReplaceSheet from "./ReplaceSheet";
import type { Activity, SwapAlternative } from "@/hooks/useTrip";

interface ActivityCardProps {
  activity: Activity;
  onSwap: () => Promise<SwapAlternative[] | undefined>;
  onReplace: (newActivity: { name: string; description: string; category: string; placeId?: string; photoName?: string; lat?: number; lng?: number; address?: string }) => void;
  isSwapping: boolean;
  isEditing?: boolean;
  onRemove?: () => void;
  isDragging?: boolean;
  onMoveToDay?: (targetDayIndex: number) => void;
  availableDays?: Array<{ dayIndex: number; label: string }>;
  currentDayIndex?: number;
  cardIndex?: number;
  destination?: string;
}

const ActivityCard = ({ activity, onSwap, onReplace, isSwapping, isEditing, onRemove, isDragging, onMoveToDay, availableDays, currentDayIndex, cardIndex = 0, destination = "" }: ActivityCardProps) => {
  const navigate = useNavigate();
  const [showReplace, setShowReplace] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const moveMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMoveMenu) return;
    const handler = (e: MouseEvent) => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
        setShowMoveMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMoveMenu]);

  const handleCardClick = () => {
    if (!isEditing && activity.placeId) {
      navigate(`/place/${activity.placeId}`, { state: { fromTrip: true } });
    }
  };

  const handleSelectPlace = (place: { name: string; placeId?: string; category: string; description: string; photoName?: string; lat?: number; lng?: number; address?: string }) => {
    onReplace(place);
  };

  const categoryLabel = activity.category ? activity.category.charAt(0).toUpperCase() + activity.category.slice(1) : "Place";

  const imageUrl = activity.photoName && !imageError
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/place-photo?photo_name=${encodeURIComponent(activity.photoName)}&maxWidthPx=400&maxHeightPx=250`
    : null;

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
  const imageOnRight = cardIndex % 2 !== 0;

  const imageElement = (
    <div
      className={cn(
        "w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden",
        !isEditing && activity.placeId && "cursor-pointer"
      )}
      onClick={handleCardClick}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={activity.name}
          className="w-full h-full object-cover"
          draggable="false"
          style={{ pointerEvents: isEditing ? 'none' : 'auto' }}
          onError={() => setImageError(true)}
        />
      ) : (
        <div className={cn("w-full h-full bg-gradient-to-br flex items-center justify-center", fallbackGradient)}>
          <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">{categoryLabel}</span>
        </div>
      )}
    </div>
  );

  const textElement = (
    <div className="flex-1 min-w-0 flex flex-col justify-center">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full capitalize">{categoryLabel}</span>
        {activity.mustInclude && (
          <Heart className="w-3 h-3 text-primary fill-primary flex-shrink-0" />
        )}
      </div>
      <span
        className={cn("text-sm font-semibold text-foreground truncate mt-1", !isEditing && activity.placeId && "cursor-pointer hover:text-primary transition-colors")}
        onClick={handleCardClick}
      >
        {activity.name}
      </span>
      {activity.time && (
        <span className="text-[11px] text-muted-foreground">{activity.time}</span>
      )}
      <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
      <div className="flex items-center gap-2 mt-1">
        {activity.estimatedCost !== undefined && activity.estimatedCost > 0 && (
          <span className="text-xs font-medium text-primary">${activity.estimatedCost}/pp</span>
        )}
        {activity.estimatedCost === 0 && (
          <span className="text-xs font-medium text-deep-sage">Free</span>
        )}
        {!isEditing && activity.placeId && (
          <ExternalLink className="w-3 h-3 text-muted-foreground" />
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className={cn(
        "rounded-xl transition-all relative",
        isEditing ? "bg-card border border-primary/20 shadow-sm select-none" : "bg-card border border-border/50 hover:border-border",
        isDragging && "opacity-30 border-dashed border-2 border-primary/40 shadow-none scale-[0.98]"
      )}>
        {isEditing && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-30" ref={moveMenuRef}>
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMoveMenu(!showMoveMenu); }}
                className="bg-card/90 backdrop-blur-sm w-7 h-7 flex items-center justify-center rounded-full hover:bg-card active:scale-95 transition-all border border-border"
              >
                <MoreVertical className="w-3.5 h-3.5 text-foreground" />
              </button>
              {showMoveMenu && availableDays && availableDays.length > 1 && (
                <div className="absolute top-full right-0 mt-1 w-40 rounded-lg border border-border bg-popover shadow-xl z-[100] py-1 overflow-hidden">
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Move to</p>
                  {availableDays.map((d) => (
                    <button
                      key={d.dayIndex}
                      disabled={d.dayIndex === currentDayIndex}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveToDay?.(d.dayIndex);
                        setShowMoveMenu(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs transition-colors",
                        d.dayIndex === currentDayIndex
                          ? "text-muted-foreground/50 cursor-default"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      {d.label}
                      {d.dayIndex === currentDayIndex && <span className="ml-1 text-[10px] text-muted-foreground">(current)</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
              className="bg-destructive/90 backdrop-blur-sm w-7 h-7 flex items-center justify-center rounded-full hover:bg-destructive active:scale-95 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive-foreground" />
            </button>
          </div>
        )}

        <div className={cn("flex items-stretch gap-3 p-2.5", imageOnRight && "flex-row-reverse")}>
          {imageElement}
          {textElement}

          {!isEditing && (
            <div className="flex items-center flex-shrink-0">
              <button
                onClick={() => setShowReplace(true)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                title="Replace activity"
              >
                <ArrowLeftRight className="w-4 h-4 text-primary" />
              </button>
            </div>
          )}
        </div>
      </div>

      <ReplaceSheet
        isOpen={showReplace}
        onClose={() => setShowReplace(false)}
        currentName={activity.name}
        destination={destination}
        onSelectPlace={handleSelectPlace}
        onFetchSuggestions={onSwap}
      />
    </>
  );
};

export default ActivityCard;
