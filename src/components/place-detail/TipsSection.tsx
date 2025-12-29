import { Lightbulb } from 'lucide-react';

interface TipsSectionProps {
  tips: string[];
}

const TipsSection = ({ tips }: TipsSectionProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">SweetSpots Tips</h3>
      </div>
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
        <ul className="space-y-2">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-primary mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TipsSection;
