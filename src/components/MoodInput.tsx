import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const placeholders = [
  "Somewhere chill, not too crowded, good for talking",
  "Cheap food and something fun tonight",
  "I'm new here, surprise me",
  "A quiet café to sit and think",
  "Good vibes, nothing fancy",
  "Date night spot, cozy atmosphere",
];

interface MoodInputProps {
  onSubmit: (mood: string) => void;
}

const MoodInput = ({ onSubmit }: MoodInputProps) => {
  const [value, setValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        setIsAnimating(false);
      }, 200);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const moodText = value.trim() || placeholders[placeholderIndex];
    onSubmit(moodText);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholders[placeholderIndex]}
          rows={3}
          className={`
            w-full px-4 py-3.5 text-base rounded-2xl border-2 border-border 
            bg-card text-foreground placeholder:text-muted-foreground
            focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10
            resize-none transition-all duration-300
            ${isAnimating ? 'placeholder:opacity-0' : 'placeholder:opacity-100'}
          `}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full h-12 text-base rounded-xl"
      >
        Show me places
        <ArrowRight className="w-5 h-5 ml-1" />
      </Button>

      <p className="text-center text-xs text-muted-foreground px-4">
        No planning. No pressure. You can change this anytime.
      </p>
    </form>
  );
};

export default MoodInput;
