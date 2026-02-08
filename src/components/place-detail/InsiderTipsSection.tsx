import { Lightbulb } from 'lucide-react';

interface InsiderTipsSectionProps {
  tips: string[];
  localSecret?: string | null;
}

const InsiderTipsSection = ({ tips, localSecret }: InsiderTipsSectionProps) => {
  if ((!tips || tips.length === 0) && !localSecret) return null;

  return (
    <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.25s' }}>
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">Insider Tips</h3>
      </div>
      
      <div className="bg-gradient-to-br from-amber-500/5 via-orange-500/10 to-amber-500/5 border border-primary/10 rounded-2xl p-4 space-y-4">
        {tips && tips.length > 0 && (
          <ul className="space-y-3">
            {tips.map((tip, i) => (
              <li 
                key={i} 
                className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="pt-0.5">{tip}</span>
              </li>
            ))}
          </ul>
        )}
        
        {localSecret && (
          <div className="pt-2 border-t border-primary/10">
            <div className="flex items-start gap-2">
              <span className="text-primary text-sm">🤫</span>
              <p className="text-sm text-foreground italic leading-relaxed">
                {localSecret}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InsiderTipsSection;
