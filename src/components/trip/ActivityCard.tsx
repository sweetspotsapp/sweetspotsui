import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, ExternalLink, Heart, Trash2, MoreVertical, Check, X, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import ReplaceSheet from "./ReplaceSheet";
import type { Activity, SwapAlternative } from "@/hooks/useTrip";
import type { ActivityStatus } from "@/hooks/useLiveTrip";

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
  // Live mode props
  isLive?: boolean;
  liveStatus?: ActivityStatus | null;
  isCurrentActivity?: boolean;
  onCheck?: () => void;
  onSkip?: () => void;
  onCancel?: () => void;
  onUndo?: () => void;
}

const ActivityCard = ({ activity, onSwap, onReplace, isSwapping, isEditing, onRemove, isDragging, onMoveToDay, availableDays, currentDayIndex, cardIndex = 0, destination = "", isLive, liveStatus, isCurrentActivity, onCheck, onSkip, onCancel, onUndo }: ActivityCardProps) => {
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

  const handleNavigate = () => {
    if (activity.lat && activity.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${activity.lat},${activity.lng}`, "_blank");
    } else if (activity.address) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activity.address)}`, "_blank");
    }
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

  const isDone = liveStatus === "done";
  const isCancelled = liveStatus === "cancelled";
  const isSkipped = liveStatus === "skipped";

  const imageElement = (
    <div
      className={cn(
        "w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden relative",
        !isEditing && activity.placeId && "cursor-pointer",
        (isCancelled || isDone || isSkipped) && "opacity-50"
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
      {isDone && (
        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
          <Check className="w-6 h-6 text-green-600" />
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
        {isCurrentActivity && !liveStatus && (
          <span className="text-[9px] font-bold text-primary-foreground bg-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Now</span>
        )}
      </div>
      <span
        className={cn(
          "text-[15px] font-bold text-foreground truncate mt-1 leading-snug tracking-tight text-amber-600",
          !isEditing && activity.placeId && "cursor-pointer hover:text-primary transition-colors",
          isCancelled && "line-through text-muted-foreground"
        )}
        onClick={handleCardClick}
      >
        {activity.name}
      </span>
      {activity.time && (
        <span className="text-[11px] text-muted-foreground/80 font-medium mt-0.5">{activity.time}</span>
      )}
      <p className={cn("text-xs text-muted-foreground/80 mt-0.5 line-clamp-2", isCancelled && "line-through")}>{activity.description}</p>
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
        "rounded-xl transition-all relative bg-card shadow-soft hover:shadow-card",
        isEditing && "ring-1 ring-primary/30 select-none",
        isDragging && "opacity-30 border-dashed border-2 border-primary/40 shadow-none scale-[0.98]",
        isCurrentActivity && !liveStatus && "ring-2 ring-primary/40 shadow-card",
        isDone && "bg-green-50/50 dark:bg-green-950/10 ring-1 ring-green-200/50 dark:ring-green-800/30",
        isCancelled && "bg-muted/30 shadow-none",
        isSkipped && "bg-muted/20 shadow-none opacity-60"
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

          {!isEditing && !isLive && (
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

        {/* Live mode action buttons */}
        {isLive && !isEditing && (
          <div className="px-2.5 pb-2.5">
            {(isCancelled || isSkipped) && (
              <button
                onClick={onUndo}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
              >
                Undo
              </button>
            )}
             {isDone && (
              <div className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                <Check className="w-3.5 h-3.5" /> Been there ✓
              </div>
            )}
            {!liveStatus && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onCheck}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 transition-colors whitespace-nowrap"
                >
                  <Check className="w-3.5 h-3.5" /> Been here
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Not going
                </button>
                {(activity.lat || activity.address) && (
                  <button
                    onClick={handleNavigate}
                    className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
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
