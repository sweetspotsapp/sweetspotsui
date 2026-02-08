import { Target } from 'lucide-react';

interface PerfectForSectionProps {
  occasions: string[];
}

const PerfectForSection = ({ occasions }: PerfectForSectionProps) => {
  if (!occasions || occasions.length === 0) return null;

  return (
    <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">Perfect For</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {occasions.map((occasion, i) => (
          <span 
            key={i}
            className="text-sm font-medium px-4 py-2 bg-primary/10 text-primary rounded-full"
          >
            {occasion}
          </span>
        ))}
      </div>
    </div>
  );
};

export default PerfectForSection;
