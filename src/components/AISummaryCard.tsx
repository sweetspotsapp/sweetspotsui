import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface AISummaryCardProps {
  summary: string;
  searchQuery?: string;
  location?: string | null;
}

const AISummaryCard = ({ summary }: AISummaryCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getBlurb = (): string => {
    // Try to parse as JSON array (legacy bullet format) → join into paragraph
    try {
      const parsed = JSON.parse(summary);
      if (Array.isArray(parsed)) {
        return parsed.filter((s: string) => typeof s === 'string' && s.length > 0).join(' ');
      }
    } catch {
      // Not JSON — use as-is
    }
    return summary.trim();
  };

  const blurb = getBlurb();

  return (
    <div className="mx-4 mb-6 rounded-2xl bg-gradient-to-br from-amber-50/80 to-orange-50/60 dark:from-amber-950/30 dark:to-orange-950/20">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full gap-3 p-4 text-left rounded-2xl transition-colors py-[10px] flex items-center justify-center bg-[#fef7e1]"
      >
        <div className="relative p-2 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 shrink-0">
          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <span className="text-sm font-medium text-amber-700 dark:text-amber-300 flex-1">
          Our take
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2">
          <p className="text-sm text-foreground/80 leading-relaxed">
            {blurb}
          </p>
        </div>
      )}
    </div>
  );
};

export default AISummaryCard;
