import { MoreHorizontal, Heart, Pencil, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Board } from "@/hooks/useBoards";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BoardCardProps {
  board?: Board;
  isAllSaved?: boolean;
  savedCount?: number;
  coverImages?: string[];
  onClick: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  animationDelay?: number;
}

const BoardCard = ({ 
  board, 
  isAllSaved = false, 
  savedCount = 0,
  coverImages = [],
  onClick, 
  onRename,
  onDelete,
  onEdit,
  animationDelay = 0 
}: BoardCardProps) => {
  const name = isAllSaved ? "All Saved" : board?.name || "";
  const count = isAllSaved ? savedCount : board?.placeIds.length || 0;

  // Pinterest-style collage layout based on image count
  const renderCollage = () => {
    if (coverImages.length === 0) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
          <Heart className="w-10 h-10 text-primary/60" />
        </div>
      );
    }

    if (coverImages.length === 1) {
      return (
        <img 
          src={coverImages[0]} 
          alt={name}
          className="w-full h-full object-cover"
        />
      );
    }

    if (coverImages.length === 2) {
      return (
        <div className="w-full h-full flex gap-0.5">
          <img src={coverImages[0]} alt="" className="w-1/2 h-full object-cover" />
          <img src={coverImages[1]} alt="" className="w-1/2 h-full object-cover" />
        </div>
      );
    }

    return (
      <div className="w-full h-full flex gap-0.5">
        <img src={coverImages[0]} alt="" className="w-1/2 h-full object-cover" />
        <div className="w-1/2 h-full flex flex-col gap-0.5">
          <img src={coverImages[1]} alt="" className="w-full h-1/2 object-cover" />
          <img src={coverImages[2]} alt="" className="w-full h-1/2 object-cover" />
        </div>
      </div>
    );
  };

  const hasOptions = !isAllSaved && (onRename || onDelete || onEdit);

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full rounded-2xl overflow-hidden bg-card",
        "active:scale-[0.98] transition-all duration-200 group",
        "opacity-0 animate-fade-up hover:shadow-lg"
      )}
      style={{ 
        animationDelay: `${animationDelay}ms`, 
        animationFillMode: 'forwards' 
      }}
    >
      {/* Cover Collage */}
      <div className="aspect-[4/5] relative overflow-hidden bg-muted">
        {renderCollage()}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        
        {/* Options Dropdown */}
        {hasOptions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm 
                           opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-black/60"
              >
                <MoreHorizontal className="w-4 h-4 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
              {onRename && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {/* All Saved Badge */}
        {isAllSaved && (
          <div className="absolute top-2 left-2 p-1.5 rounded-full bg-primary">
            <Heart className="w-3.5 h-3.5 text-primary-foreground fill-primary-foreground" />
          </div>
        )}
      </div>

      {/* Board Info */}
      <div className="p-3 text-left bg-card">
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
