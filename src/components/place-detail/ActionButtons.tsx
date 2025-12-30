import { useState, useRef } from 'react';
import { Heart, MapPin, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionButtonsProps {
  isSaved: boolean;
  onSave: () => void;
  onViewMap: () => void;
  onShare: () => void;
  imageUrl?: string;
}

const ActionButtons = ({ isSaved, onSave, onViewMap, onShare, imageUrl }: ActionButtonsProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationStyle, setAnimationStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleSave = () => {
    // If unsaving, just toggle without animation
    if (isSaved) {
      onSave();
      return;
    }

    // Get positions for the fly animation
    const buttonRect = buttonRef.current?.getBoundingClientRect();
    const savedTab = document.querySelector('[data-saved-tab]');
    const savedTabRect = savedTab?.getBoundingClientRect();

    if (buttonRect && savedTabRect && imageUrl) {
      // Calculate the translation needed from button to saved tab
      const translateX = savedTabRect.left + savedTabRect.width / 2 - (buttonRect.left + buttonRect.width / 2);
      const translateY = savedTabRect.top + savedTabRect.height / 2 - (buttonRect.top + buttonRect.height / 2);

      setAnimationStyle({
        '--fly-x': `${translateX}px`,
        '--fly-y': `${translateY}px`,
      } as React.CSSProperties);

      setIsAnimating(true);

      // Trigger the save after animation starts
      setTimeout(() => {
        onSave();
      }, 150);

      // Reset animation state
      setTimeout(() => {
        setIsAnimating(false);
      }, 500);
    } else {
      // Fallback if we can't get positions
      onSave();
    }
  };

  return (
    <div className="flex gap-2 animate-fade-in relative" style={{ animationDelay: '0.05s' }}>
      {/* Animated flying image */}
      {isAnimating && imageUrl && (
        <div 
          className="fixed z-50 w-16 h-16 rounded-xl overflow-hidden pointer-events-none animate-fly-to-saved shadow-elevated"
          style={{
            ...animationStyle,
            top: buttonRef.current?.getBoundingClientRect().top,
            left: buttonRef.current?.getBoundingClientRect().left,
          }}
        >
          <img
            src={imageUrl}
            alt="Saving"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Save Button */}
      <Button
        ref={buttonRef}
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
