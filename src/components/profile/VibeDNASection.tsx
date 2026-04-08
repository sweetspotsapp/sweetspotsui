import { Sparkles, Loader2, Share2 } from "lucide-react";

interface VibeItem {
  label: string;
  percentage: number;
  color: string;
}

interface VibeDNASectionProps {
  vibeBreakdown: VibeItem[];
  totalInteractions: number;
  isLoading: boolean;
  onOpenInteractionDetails: () => void;
  onShareVibe: () => void;
}

const VibeDNASection = ({ vibeBreakdown, totalInteractions, isLoading, onOpenInteractionDetails, onShareVibe }: VibeDNASectionProps) => (
  <section className="bg-card rounded-xl p-4 border border-border shadow-soft space-y-3 opacity-0 animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
    <div className="flex items-center gap-2">
      <Sparkles className="w-4 h-4 text-primary" />
      <h3 className="font-semibold text-foreground text-sm">Your Vibe DNA</h3>
      {totalInteractions > 0 && (
        <button
          onClick={onOpenInteractionDetails}
          className="text-[10px] text-muted-foreground ml-auto mr-2 hover:text-primary transition-colors underline decoration-dotted underline-offset-2"
        >
          Based on {totalInteractions} interaction{totalInteractions !== 1 ? 's' : ''}
        </button>
      )}
    </div>

    <p className="text-xs text-muted-foreground">
      {totalInteractions > 0
        ? "Based on what you save and explore, here's what you're drawn to:"
        : "Start exploring and saving places to build your unique Vibe DNA!"}
    </p>

    {isLoading ? (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    ) : (
      <div className="space-y-2">
        {vibeBreakdown.map((vibe, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-foreground font-medium">{vibe.label}</span>
              <span className="text-muted-foreground flex-shrink-0 ml-2">{vibe.percentage}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${vibe.color} rounded-full transition-all duration-500`}
                style={{ width: `${vibe.percentage}%`, animationDelay: `${index * 100}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    )}

    {totalInteractions > 0 && (
      <button
        onClick={onShareVibe}
        className="w-full mt-2 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-primary text-xs font-semibold flex items-center justify-center gap-2 hover:bg-primary/10 transition-all"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share your Vibe DNA
      </button>
    )}
  </section>
);

export default VibeDNASection;
