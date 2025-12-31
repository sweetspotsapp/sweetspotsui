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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setValue(suggestion);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Cheap eats, nice views, fun with friends…"
          className="
            w-full px-4 py-4 text-base rounded-2xl border-2 border-border 
            bg-card text-foreground placeholder:text-muted-foreground
            focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10
            transition-all duration-300
          "
        />
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => handleSuggestionClick(suggestion)}
            className="px-3 py-1.5 text-sm rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full h-12 text-base rounded-xl"
        disabled={!value.trim()}
      >
        Let's go
        <ArrowRight className="w-5 h-5 ml-1" />
      </Button>

      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          Skip to home
        </button>
      )}
    </form>
  );
};

export default MoodInput;
