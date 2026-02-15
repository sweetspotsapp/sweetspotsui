import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface FilterState {
  budget: "under_50" | "50_100" | "100_plus" | null;
  vibes: string[];
  placeTypes: string[];
}

interface TravelPersonalityFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (filters: FilterState) => void;
  initialFilters?: FilterState;
}

const BUDGET_OPTIONS = [
  { id: "under_50", label: "under $50" },
  { id: "50_100", label: "$50-$100" },
  { id: "100_plus", label: "$100+" },
] as const;

const VIBE_OPTIONS = [
  "Halal",
  "Vegetarian / Vegan",
  "Gluten-Free",
  "Free WiFi",
  "Dog-Friendly",
  "Kid-Friendly",
  "Late Night",
  "Large Groups",
  "Outdoor Seating",
];

const PLACE_TYPE_OPTIONS = [
  { id: "restaurant", label: "Restaurant" },
  { id: "cafe", label: "Cafe" },
  { id: "bar", label: "Bar" },
  { id: "museum", label: "Museum" },
  { id: "park", label: "Park" },
  { id: "shopping", label: "Shopping" },
  { id: "attraction", label: "Attraction" },
  { id: "hotel", label: "Hotel" },
];

const TravelPersonalityFilterModal: React.FC<TravelPersonalityFilterModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialFilters,
}) => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<FilterState>({
    budget: initialFilters?.budget || null,
    vibes: initialFilters?.vibes || [],
    placeTypes: initialFilters?.placeTypes || [],
  });

  // Reset filters when modal opens with new initial values
  useEffect(() => {
    if (isOpen && initialFilters) {
      setFilters({
        budget: initialFilters.budget || null,
        vibes: initialFilters.vibes || [],
        placeTypes: initialFilters.placeTypes || [],
      });
    }
  }, [isOpen, initialFilters]);

  const toggleBudget = (budgetId: FilterState["budget"]) => {
    setFilters((prev) => ({
      ...prev,
      budget: prev.budget === budgetId ? null : budgetId,
    }));
  };

  const toggleVibe = (vibe: string) => {
    setFilters((prev) => ({
      ...prev,
      vibes: prev.vibes.includes(vibe)
        ? prev.vibes.filter((v) => v !== vibe)
        : [...prev.vibes, vibe],
    }));
  };

  const togglePlaceType = (typeId: string) => {
    setFilters((prev) => ({
      ...prev,
      placeTypes: prev.placeTypes.includes(typeId)
        ? prev.placeTypes.filter((t) => t !== typeId)
        : [...prev.placeTypes, typeId],
    }));
  };

  const handleConfirm = async () => {
    // Save to Supabase if user is logged in
    if (user) {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({
            budget: filters.budget,
            vibe: { tags: filters.vibes },
          })
          .eq("id", user.id);

        if (error) {
          console.error("Error saving filters:", error);
          toast({
            title: "Error saving preferences",
            description: "Your preferences couldn't be saved. Please try again.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Error saving filters:", err);
      }
    }

    onConfirm(filters);
    onClose();
  };

  const hasSelection = filters.budget !== null || filters.vibes.length > 0 || filters.placeTypes.length > 0;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-w-[420px] mx-auto animate-fade-up">
        <div className="bg-card rounded-t-3xl shadow-elevated max-h-[85vh] overflow-hidden flex flex-col">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-6 pt-2 pb-4">
            <h2 className="text-xl font-bold text-foreground">My Travel personality</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choose the vibe that matches your trip. (Select all that fit your vibe)
            </p>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
            {/* Place Type Section */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">What are you looking for?</h3>
              <div className="flex flex-wrap gap-2">
                {PLACE_TYPE_OPTIONS.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => togglePlaceType(type.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      filters.placeTypes.includes(type.id)
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-card text-primary border border-primary hover:bg-primary/10"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget chips - single select */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Budget</h3>
              <div className="flex flex-wrap gap-2">
                {BUDGET_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => toggleBudget(option.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      filters.budget === option.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-card text-primary border border-primary hover:bg-primary/10"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vibe chips - multi select */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Vibe</h3>
              <div className="flex flex-wrap gap-2">
                {VIBE_OPTIONS.map((vibe) => (
                  <button
                    key={vibe}
                    onClick={() => toggleVibe(vibe)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      filters.vibes.includes(vibe)
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-card text-primary border border-primary hover:bg-primary/10"
                    }`}
                  >
                    {vibe}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Confirm button */}
          <div className="p-6 pt-4 border-t border-border">
            <Button
              onClick={handleConfirm}
              className={`w-full h-12 rounded-full text-base font-semibold transition-all ${
                hasSelection
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-primary/60 text-primary-foreground cursor-default"
              }`}
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TravelPersonalityFilterModal;
