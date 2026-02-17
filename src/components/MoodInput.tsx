import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MoodInputProps {
  onSubmit: (mood: string) => void;
  onSkip?: () => void;
}

const suggestions = [
  "chill vibes",
  "outdoor",
  "nature",
  "coffee",
  "date night",
  "family friendly",
  "late night",
  "live music",
];

const MoodInput = ({ onSubmit, onSkip }: MoodInputProps) => {
  const [value, setValue] = useState("");
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combine typed input with selected suggestions
    const parts: string[] = [];
    if (value.trim()) {
      parts.push(value.trim());
    }
    selectedSuggestions.forEach(s => {
      if (!value.toLowerCase().includes(s.toLowerCase())) {
        parts.push(s);
      }
    });
    
    const finalMood = parts.join(", ");
    if (finalMood) {
      onSubmit(finalMood);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(suggestion)) {
        newSet.delete(suggestion);
      } else {
        newSet.add(suggestion);
      }
      return newSet;
    });
  };

  const hasInput = value.trim() || selectedSuggestions.size > 0;

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Rooftop drinks, cozy cafes, street tacos…"
          className="
            w-full px-4 py-4 text-base rounded-2xl border-2 border-border 
            bg-card text-foreground placeholder:text-muted-foreground
            focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10
            transition-all duration-300
          "
        />
      </div>

      {/* Suggestion chips - multi-select */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => {
          const isSelected = selectedSuggestions.has(suggestion);
          return (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                isSelected 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {suggestion}
            </button>
          );
        })}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full h-12 text-base rounded-xl"
        disabled={!hasInput}
      >
        Show me the goods
        <ArrowRight className="w-5 h-5 ml-1" />
      </Button>

      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          Just browsing
        </button>
      )}
    </form>
  );
};

export default MoodInput;
