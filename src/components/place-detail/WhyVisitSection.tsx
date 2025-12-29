import { Sparkles } from 'lucide-react';

interface WhyVisitSectionProps {
  description: string;
  vibes: string[];
}

const WhyVisitSection = ({ description, vibes }: WhyVisitSectionProps) => {
  return (
    <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">Why Visit</h3>
      </div>
      
      <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-4 space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
        
        {/* Vibe Tags */}
        <div className="flex flex-wrap gap-2 pt-1">
          {vibes.map((vibe, i) => (
            <span 
              key={i}
              className="text-xs font-medium px-3 py-1.5 bg-primary/10 text-primary rounded-full"
            >
              {vibe}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WhyVisitSection;
