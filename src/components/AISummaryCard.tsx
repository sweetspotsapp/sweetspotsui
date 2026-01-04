import { useState, useRef, useEffect } from "react";
import { IceCreamCone, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface AISummaryCardProps {
  summary: string;
  searchQuery?: string;
  location?: string | null;
}

const AISummaryCard = ({ summary, searchQuery, location }: AISummaryCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseFloat(getComputedStyle(textRef.current).lineHeight);
      const maxHeight = lineHeight * 2;
      setNeedsTruncation(textRef.current.scrollHeight > maxHeight + 4);
    }
  }, [summary]);

  // Build context-aware display text
  const getLocationText = () => {
    if (!location || location === "nearby") return "nearby";
    return `in ${location}`;
  };

  const getContextText = () => {
    if (searchQuery) {
      return `Searching for "${searchQuery}" ${getLocationText()}`;
    }
    return null;
  };

  const contextText = getContextText();

  return (
    <div className="mx-4 mb-6 p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 to-orange-50/60 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/50 dark:border-amber-800/30">
      <div className="flex items-start gap-3">
        <div className="relative p-2 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 shrink-0">
          <IceCreamCone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <Sparkles className="w-2.5 h-2.5 text-amber-500 dark:text-amber-300 absolute -top-0.5 -right-0.5" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1 block">
            Here's the scoop
          </span>
          {contextText && (
            <span className="text-xs text-amber-600/80 dark:text-amber-400/80 mb-1.5 block">
              {contextText}
            </span>
          )}
          <p
            ref={textRef}
            className={`text-sm text-foreground/80 leading-relaxed ${
              !isExpanded && needsTruncation ? "line-clamp-2" : ""
            }`}
          >
            {summary}
          </p>
          {needsTruncation && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors font-medium"
            >
              {isExpanded ? (
                <>
                  Less <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  More details <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AISummaryCard;
