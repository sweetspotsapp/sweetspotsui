import { Heart, MapPin, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionButtonsProps {
  isSaved: boolean;
  onSave: () => void;
  onViewMap: () => void;
  onShare: () => void;
}

const ActionButtons = ({ isSaved, onSave, onViewMap, onShare }: ActionButtonsProps) => {
  return (
    <div className="flex gap-3">
      <Button
        onClick={onSave}
        variant={isSaved ? "default" : "outline"}
        className="flex-1 gap-2"
      >
        <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        {isSaved ? 'Saved' : 'Save Spot'}
      </Button>
      <Button
        onClick={onViewMap}
        variant="outline"
        className="flex-1 gap-2"
      >
        <MapPin className="w-4 h-4" />
        View on Map
      </Button>
      <Button
        onClick={onShare}
        variant="ghost"
        size="icon"
        className="flex-shrink-0"
      >
        <Share2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default ActionButtons;
