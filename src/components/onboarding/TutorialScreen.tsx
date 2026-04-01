import { useState } from "react";
import { Link2, Bookmark, Map } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TutorialScreenProps {
  onFinish: () => void;
}

const steps = [
  {
    icon: Link2,
    title: "Import your spots",
    description: "Paste a link from any platform — we'll find the place for you.",
  },
  {
    icon: Bookmark,
    title: "Organize into boards",
    description: "Group your saved spots by city, vibe, or however you like.",
  },
  {
    icon: Map,
    title: "Generate a trip",
    description: "Turn your boards into a real itinerary — routes, times, and all.",
  },
];

const TutorialScreen = ({ onFinish }: TutorialScreenProps) => {
  const [current, setCurrent] = useState(0);

  const handleNext = () => {
    if (current < steps.length - 1) {
      setCurrent(current + 1);
    } else {
      onFinish();
    }
  };

  const step = steps[current];
  const Icon = step.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8 text-center">
      {/* Icon */}
      <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-8">
        <Icon className="w-10 h-10 text-secondary-foreground" />
      </div>

      {/* Copy */}
      <h2 className="text-2xl font-bold text-foreground mb-3 font-[Outfit]">
        {step.title}
      </h2>
      <p className="text-muted-foreground max-w-xs leading-relaxed">
        {step.description}
      </p>

      {/* Dots */}
      <div className="flex gap-2 mt-10 mb-8">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? "w-6 bg-primary" : "w-2 bg-muted"
            }`}
          />
        ))}
      </div>

      {/* CTA */}
      <Button
        onClick={handleNext}
        className="w-full max-w-xs h-14 text-base font-semibold rounded-2xl"
      >
        {current < steps.length - 1 ? "Next" : "Let's go"}
      </Button>

      {current < steps.length - 1 && (
        <button
          onClick={onFinish}
          className="text-sm text-muted-foreground mt-4 py-2"
        >
          Skip
        </button>
      )}
    </div>
  );
};

export default TutorialScreen;
