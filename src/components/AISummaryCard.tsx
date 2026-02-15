import { useState, useEffect } from "react";
import { IceCreamCone, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface AISummaryCardProps {
  summary: string;
  searchQuery?: string;
  location?: string | null;
}

const AISummaryCard = ({ summary, searchQuery, location }: AISummaryCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);


  // Clean and split summary into bullet points
  const getBulletPoints = () => {
    let cleaned = summary;
    if (location && location !== "nearby") {
      cleaned = cleaned.replace(/\s*nearby\.?/gi, '.');
      cleaned = cleaned.replace(/\s*within \d+(\.\d+)?\s*(km|miles?)\.?/gi, '.');
      cleaned = cleaned.replace(/\.\./g, '.').trim();
    }
    return cleaned
      .split(/(?<=\.)\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 5);
  };

  const bullets = getBulletPoints();
  const visibleBullets = isExpanded ? bullets : bullets.slice(0, 2);

  useEffect(() => {
    setNeedsTruncation(bullets.length > 2);
  }, [summary]);

  return (
    <div className="mx-4 mb-6 p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 to-orange-50/60 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/50 dark:border-amber-800/30">
      <div className="flex items-start gap-3">
        <div className="relative p-2 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 shrink-0">
          <IceCreamCone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <Sparkles className="w-2.5 h-2.5 text-amber-500 dark:text-amber-300 absolute -top-0.5 -right-0.5" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1.5 block">
            Here's the scoop
          </span>
          <ul className="space-y-1.5">
            {visibleBullets.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed">
                <span className="text-amber-500 mt-1 shrink-0">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
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
