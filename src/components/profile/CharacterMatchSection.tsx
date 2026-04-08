import { Wand2, Loader2, Sparkles, RefreshCw, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface CharacterMatch {
  character_name: string;
  known_for: string;
  source: string;
  match_reason: string;
  emoji: string;
  match_percentage: number;
}

interface CharacterMatchSectionProps {
  characterMatch: CharacterMatch | null;
  isLoading: boolean;
  onFindMatch: () => void;
  onTryAnother: () => void;
}

const CharacterMatchSection = ({ characterMatch, isLoading, onFindMatch, onTryAnother }: CharacterMatchSectionProps) => {
  const navigate = useNavigate();

  return (
    <section className="bg-card rounded-xl p-4 border border-border shadow-soft space-y-3 opacity-0 animate-fade-up" style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center gap-2">
        <Wand2 className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground text-sm">
          {characterMatch ? "With this travel style, you remind us of..." : "Your Character Match"}
        </h3>
      </div>

      {characterMatch ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="text-3xl">{characterMatch.emoji}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-foreground">{characterMatch.character_name}</h4>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {characterMatch.match_percentage}% match
                </span>
              </div>
              <p className="text-[11px] text-primary/80 font-medium">{characterMatch.known_for}</p>
              <p className="text-[10px] text-muted-foreground">{characterMatch.source}</p>
              <p className="text-sm text-foreground mt-1.5">{characterMatch.match_reason}</p>
            </div>
          </div>
          <button onClick={onTryAnother} disabled={isLoading} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Try another match
          </button>
          <button
            onClick={() => navigate(`/?search=${encodeURIComponent(`explore spots ${characterMatch.character_name} would love`)}`)}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary/10 hover:bg-primary/15 transition-colors group"
          >
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium text-primary truncate">
              Explore spots {characterMatch.character_name} would love
            </span>
            <ChevronRight className="w-4 h-4 text-primary/60 ml-auto flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      ) : (
        <div className="text-center py-3">
          <p className="text-sm text-muted-foreground mb-3">Discover which famous character matches your vibe</p>
          <button
            onClick={onFindMatch}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Find my match
          </button>
        </div>
      )}
    </section>
  );
};

export default CharacterMatchSection;
