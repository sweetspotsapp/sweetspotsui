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
      {/* Input container with selected tags inside */}
      <div className="relative border-2 border-border rounded-2xl bg-card focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-300">
        {selectedSuggestions.size > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-1">
            {Array.from(selectedSuggestions).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-sm rounded-full bg-primary/15 text-primary font-medium"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleSuggestionClick(tag)}
                  className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-primary/20 transition-colors"
                >
                  <span className="text-xs leading-none">×</span>
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={selectedSuggestions.size > 0 ? "Add more details..." : "Rooftop drinks, cozy cafes, street tacos…"}
          className={`
            w-full px-4 text-base bg-transparent text-foreground placeholder:text-muted-foreground
            focus:outline-none border-none
            ${selectedSuggestions.size > 0 ? 'pt-2 pb-3' : 'py-4'}
          `}
        />
      </div>

      {/* Suggestion chips */}
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
