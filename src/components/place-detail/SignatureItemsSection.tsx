import { Utensils } from 'lucide-react';

interface SignatureItemsSectionProps {
  items: string[];
}

const SignatureItemsSection = ({ items }: SignatureItemsSectionProps) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
      <div className="flex items-center gap-2">
        <Utensils className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground">What to Try</h3>
      </div>
      
      <div className="bg-gradient-to-br from-amber-500/5 via-orange-500/10 to-amber-500/5 border border-primary/10 rounded-2xl p-4">
        <ul className="space-y-2.5">
          {items.map((item, i) => (
            <li 
              key={i} 
              className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed"
            >
              <span className="text-primary font-medium">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SignatureItemsSection;
