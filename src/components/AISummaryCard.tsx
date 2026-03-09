import { useState } from "react";
import { IceCreamCone, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface AISummaryCardProps {
  summary: string;
  searchQuery?: string;
  location?: string | null;
}

const AISummaryCard = ({ summary, searchQuery, location }: AISummaryCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getBulletPoints = (): string[] => {
    // Try to parse as JSON array first (new format)
    try {
      const parsed = JSON.parse(summary);
      if (Array.isArray(parsed)) {
        return parsed.filter((s: string) => typeof s === 'string' && s.length > 0).slice(0, 3);
      }
    } catch {
      // Not JSON, fall back to sentence splitting
    }

    // Legacy: split by sentences
    let cleaned = summary;
    if (location && location !== "nearby") {
      cleaned = cleaned.replace(/\s*nearby\.?/gi, '.');
      cleaned = cleaned.replace(/\s*within \d+(\.\d+)?\s*(km|miles?)\.?/gi, '.');
      cleaned = cleaned.replace(/\.\./g, '.').trim();
    }
    return cleaned
      .split(/(?<=\.)\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 5)
      .slice(0, 3);
  };

  const bullets = getBulletPoints();

  return (
    <div className="mx-4 mb-6 rounded-2xl bg-amber-100/60 dark:bg-amber-900/40 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-amber-100/80 dark:hover:bg-amber-900/50 active:bg-amber-200/60 dark:active:bg-amber-900/60 transition-colors"
      >
        <div className="relative p-2 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 shrink-0">
          <IceCreamCone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <Sparkles className="w-2.5 h-2.5 text-amber-500 dark:text-amber-300 absolute -top-0.5 -right-0.5" />
        </div>
        <span className="text-sm font-medium text-amber-700 dark:text-amber-300 flex-1">
          Here's the scoop
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          <ul className="space-y-2">
            {bullets.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed">
                <span className="text-amber-500 mt-1 shrink-0">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AISummaryCard;
