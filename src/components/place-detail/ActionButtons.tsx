import { useState } from 'react';
import { Heart, MapPin, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionButtonsProps {
  isSaved: boolean;
  onSave: () => void;
  onViewMap: () => void;
  onShare: () => void;
}

const ActionButtons = ({ isSaved, onSave, onViewMap, onShare }: ActionButtonsProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSave = () => {
    setIsAnimating(true);
    onSave();
    setTimeout(() => setIsAnimating(false), 600);
  };

  return (
    <div className="flex gap-2 animate-fade-in" style={{ animationDelay: '0.05s' }}>
      {/* Save Button */}
      <Button
        onClick={handleSave}
        variant={isSaved ? "default" : "outline"}
        className={`flex-1 gap-2 h-12 rounded-xl font-semibold transition-all duration-300 ${
          isSaved 
            ? 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25' 
            : 'border-2 hover:border-primary hover:text-primary'
        } ${isAnimating ? 'scale-95' : 'scale-100'}`}
      >
        <Heart 
          className={`w-5 h-5 transition-all duration-300 ${
            isSaved ? 'fill-current' : ''
          } ${isAnimating ? 'scale-125' : 'scale-100'}`} 
        />
        {isSaved ? 'Saved!' : 'Save Spot'}
      </Button>

      {/* Map Button */}
      <Button
        onClick={onViewMap}
        variant="outline"
        className="flex-1 gap-2 h-12 rounded-xl font-semibold border-2 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-300"
      >
        <MapPin className="w-5 h-5" />
        View Map
      </Button>

      {/* Share Button */}
      <Button
        onClick={onShare}
        variant="ghost"
        size="icon"
        className="h-12 w-12 rounded-xl hover:bg-secondary transition-all duration-300 hover:scale-105"
      >
        <Share2 className="w-5 h-5" />
      </Button>
    </div>
  );
};

export default ActionButtons;
