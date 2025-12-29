import { X, DollarSign, Users, Heart, User, Coffee, Sparkles, Dog, Moon, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SlideOutMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onFilterSelect: (filter: string) => void;
  activeFilter: string | null;
}

const MENU_FILTERS = [
  { id: 'under_50', label: 'Under $50', icon: DollarSign },
  { id: '50_100', label: '$50–$100', icon: DollarSign },
  { id: '100_plus', label: '$100+', icon: DollarSign },
  { id: 'friends', label: 'With Friends', icon: Users },
  { id: 'romantic', label: 'Romantic Date', icon: Heart },
  { id: 'family', label: 'Family-Friendly', icon: Home },
  { id: 'solo', label: 'Solo Hangout', icon: User },
  { id: 'chill', label: 'Chill & Quiet', icon: Coffee },
  { id: 'hidden', label: 'Hidden Gems', icon: Sparkles },
  { id: 'pet', label: 'Pet-Friendly', icon: Dog },
  { id: 'nightlife', label: 'Night Life', icon: Moon },
];

const SlideOutMenu: React.FC<SlideOutMenuProps> = ({ isOpen, onClose, onFilterSelect, activeFilter }) => {
  const navigate = useNavigate();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-foreground/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-[280px] bg-card z-50 shadow-elevated transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter List */}
        <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-80px)]">
          {MENU_FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => {
                onFilterSelect(filter.id);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeFilter === filter.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted text-foreground'
              }`}
            >
              <filter.icon className="w-5 h-5" />
              <span className="font-medium">{filter.label}</span>
            </button>
          ))}

          {/* Clear filter */}
          {activeFilter && (
            <button
              onClick={() => {
                onFilterSelect('');
                onClose();
              }}
              className="w-full mt-4 px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default SlideOutMenu;
