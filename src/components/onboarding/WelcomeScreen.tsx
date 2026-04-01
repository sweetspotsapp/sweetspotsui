import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

const WelcomeScreen = ({ onGetStarted }: WelcomeScreenProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8 text-center">
      {/* Logo */}
      <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mb-8">
        <MapPin className="w-10 h-10 text-primary-foreground" />
      </div>

      {/* Brand */}
      <h1 className="text-4xl font-bold text-foreground tracking-tight mb-3 font-[Outfit]">
        Sweetspots
      </h1>
      <p className="text-lg text-muted-foreground max-w-xs leading-relaxed">
        Turn the places you save online into trips you actually take.
      </p>

      {/* CTA */}
      <Button
        onClick={onGetStarted}
        className="mt-12 w-full max-w-xs h-14 text-base font-semibold rounded-2xl"
      >
        Get Started
      </Button>
    </div>
  );
};

export default WelcomeScreen;
