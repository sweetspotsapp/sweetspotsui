import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Heart, MapPin, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ActionButtonsProps {
  isSaved: boolean;
  onSave: () => void;
  onViewMap: () => void;
  onShare: () => void;
  flyImageSrc?: string;
}

const ActionButtons = ({ isSaved, onSave, onViewMap, onShare, flyImageSrc }: ActionButtonsProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [flyingClone, setFlyingClone] = useState<{
    src: string;
    startRect: DOMRect;
    endRect: DOMRect;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleSave = () => {
    // If unsaving, just toggle without animation
    if (isSaved) {
      onSave();
      return;
    }

    setIsAnimating(true);

    // Get positions for the fly animation
    const buttonRect = buttonRef.current?.getBoundingClientRect();
    const savedTab = document.querySelector('[data-saved-tab]');
    const savedTabRect = savedTab?.getBoundingClientRect();

    if (buttonRect && savedTabRect && flyImageSrc) {
      // Create a flying clone from above the button
      setFlyingClone({
        src: flyImageSrc,
        startRect: new DOMRect(
          buttonRect.left + buttonRect.width / 2 - 40,
          buttonRect.top - 100,
          80,
          80
        ),
        endRect: savedTabRect,
      });

      // Trigger the save after animation starts
      setTimeout(() => {
        onSave();
      }, 150);

      // Reset animation state and remove clone
      setTimeout(() => {
        setIsAnimating(false);
        setFlyingClone(null);
      }, 500);
    } else {
      // Fallback if we can't get positions or no image
      onSave();
      setTimeout(() => setIsAnimating(false), 600);
    }
  };

  return (
    <>
      {/* Flying clone portal - renders at body level for visibility */}
      {flyingClone && createPortal(
        <div 
          className="fixed z-[9999] rounded-xl overflow-hidden pointer-events-none animate-fly-to-saved-portal shadow-elevated"
          style={{
            top: flyingClone.startRect.top,
            left: flyingClone.startRect.left,
            width: flyingClone.startRect.width,
            height: flyingClone.startRect.height,
            '--fly-end-x': `${flyingClone.endRect.left + flyingClone.endRect.width / 2 - flyingClone.startRect.left - flyingClone.startRect.width / 2}px`,
            '--fly-end-y': `${flyingClone.endRect.top + flyingClone.endRect.height / 2 - flyingClone.startRect.top - flyingClone.startRect.height / 2}px`,
          } as React.CSSProperties}
        >
          <img
            src={flyingClone.src}
            alt="Saving"
            className="w-full h-full object-cover"
          />
        </div>,
        document.body
      )}

      <div className="flex gap-2 animate-fade-in" style={{ animationDelay: '0.05s' }}>
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
    </>
  );
};

export default ActionButtons;
