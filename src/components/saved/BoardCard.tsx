import { FolderHeart, Heart, MoreHorizontal, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaceCategory } from "@/context/AppContext";

interface BoardCardProps {
  board?: PlaceCategory;
  isAllSaved?: boolean;
  savedCount?: number;
  coverImage?: string;
  onClick: () => void;
  onOptions?: () => void;
  animationDelay?: number;
}

const BoardCard = ({ 
  board, 
  isAllSaved = false, 
  savedCount = 0,
  coverImage,
  onClick, 
  onOptions,
  animationDelay = 0 
}: BoardCardProps) => {
  const name = isAllSaved ? "All Saved" : board?.name || "";
  const count = isAllSaved ? savedCount : board?.placeIds.length || 0;
  const colorClass = isAllSaved 
    ? "from-primary to-primary/80" 
    : board?.color || "from-slate-500 to-slate-600";

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full rounded-2xl overflow-hidden bg-card border border-border/50",
        "active:scale-[0.98] transition-all duration-200 group",
        "opacity-0 animate-fade-up hover:shadow-lg hover:border-primary/30"
      )}
      style={{ 
        animationDelay: `${animationDelay}ms`, 
        animationFillMode: 'forwards' 
      }}
    >
      {/* Cover Image or Gradient */}
      <div className="aspect-[4/3] relative overflow-hidden">
        {coverImage ? (
          <img 
            src={coverImage} 
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className={cn(
            "w-full h-full bg-gradient-to-br flex items-center justify-center",
            colorClass
          )}>
            {isAllSaved ? (
              <Heart className="w-10 h-10 text-white/80" />
            ) : (
              <ImageIcon className="w-10 h-10 text-white/60" />
            )}
          </div>
        )}
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Options Button */}
        {!isAllSaved && onOptions && (
          <button
            onClick={(e) => { e.stopPropagation(); onOptions(); }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm 
                       opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
          >
            <MoreHorizontal className="w-4 h-4 text-white" />
          </button>
        )}
        
        {/* Badge for All Saved */}
        {isAllSaved && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
            <span className="text-[10px] font-medium text-white">All Spots</span>
          </div>
        )}
      </div>

      {/* Board Info */}
      <div className="p-3 text-left">
        <h3 className="font-semibold text-foreground text-sm line-clamp-1">
          {name}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {count} {count === 1 ? 'spot' : 'spots'}
        </p>
      </div>
    </button>
  );
};

export default BoardCard;
