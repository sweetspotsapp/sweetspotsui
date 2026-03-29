import { Lightbulb } from 'lucide-react';

interface TipsSectionProps {
  tips: string[];
}

const TipsSection = ({ tips }: TipsSectionProps) => {
  return (
    <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.25s' }}>
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">SweetSpots Tips</h3>
      </div>
      
      <div className="bg-primary/5 rounded-2xl p-4">
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
      </div>
    </div>
  );
};

export default TipsSection;
