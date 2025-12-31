import { useState, useRef, useEffect } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface AISummaryCardProps {
  summary: string;
}

const AISummaryCard = ({ summary }: AISummaryCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (textRef.current) {
      // Check if text overflows 2 lines (approximately 48px at text-sm with leading-relaxed)
      const lineHeight = parseFloat(getComputedStyle(textRef.current).lineHeight);
      const maxHeight = lineHeight * 2;
      setNeedsTruncation(textRef.current.scrollHeight > maxHeight + 4);
    }
  }, [summary]);

  return (
    <div className="mx-4 mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/20">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-primary/10 shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            ref={textRef}
            className={`text-sm text-foreground leading-relaxed ${
              !isExpanded && needsTruncation ? "line-clamp-2" : ""
            }`}
          >
            {summary}
          </p>
          {needsTruncation && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
            >
              {isExpanded ? (
                <>
                  Show less <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  Show more <ChevronDown className="w-3 h-3" />
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
