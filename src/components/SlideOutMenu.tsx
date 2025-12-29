import { X } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";

interface SlideOutMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilters: Set<string>;
  onFiltersChange: (filters: Set<string>) => void;
}

const FILTER_SECTIONS = [
  {
    title: "Price",
    filters: [
      { id: "under_50", label: "Under $50" },
      { id: "50_100", label: "$50–$100" },
      { id: "100_plus", label: "$100+" },
    ],
  },
  {
    title: "Occasion",
    filters: [
      { id: "friends", label: "With Friends" },
      { id: "romantic", label: "Romantic Date" },
      { id: "family", label: "Family-Friendly" },
      { id: "solo", label: "Solo" },
    ],
  },
  {
    title: "Vibe",
    filters: [
      { id: "chill", label: "Chill & Quiet" },
      { id: "lively", label: "Fun & Lively" },
      { id: "hidden", label: "Hidden Gems" },
      { id: "scenic", label: "Scenic / Nice View" },
    ],
  },
  {
    title: "Other",
    filters: [
      { id: "pet", label: "Pet-Friendly" },
      { id: "late_night", label: "Late Night" },
      { id: "outdoor", label: "Outdoor Seating" },
    ],
  },
];

const SlideOutMenu: React.FC<SlideOutMenuProps> = ({ 
  isOpen, 
  onClose, 
  activeFilters, 
  onFiltersChange 
}) => {
  const toggleFilter = (filterId: string) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(filterId)) {
      newFilters.delete(filterId);
    } else {
      newFilters.add(filterId);
    }
    onFiltersChange(newFilters);
  };

  const clearAll = () => {
    onFiltersChange(new Set());
  };

  const handleApply = () => {
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-foreground/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Slide Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-[300px] bg-card z-50 shadow-elevated transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold text-foreground">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Sections */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {FILTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.filters.map((filter) => (
                  <label
                    key={filter.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={activeFilters.has(filter.id)}
                      onCheckedChange={() => toggleFilter(filter.id)}
                      className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span className="text-sm text-foreground">{filter.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border flex-shrink-0 space-y-2">
          <Button 
            onClick={handleApply}
            className="w-full"
          >
            Apply Filters
            {activeFilters.size > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary-foreground/20 rounded-full text-xs">
                {activeFilters.size}
              </span>
            )}
          </Button>
          {activeFilters.size > 0 && (
            <button
              onClick={clearAll}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default SlideOutMenu;
