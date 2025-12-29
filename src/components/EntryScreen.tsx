import { MapPin } from "lucide-react";
import MoodInput from "./MoodInput";

interface EntryScreenProps {
  onSubmit: (mood: string) => void;
  onSkip: () => void;
}

const EntryScreen = ({ onSubmit, onSkip }: EntryScreenProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Top decorative element */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      
      {/* Header */}
      <header className="pt-safe pt-12 pb-4 px-5 relative z-10">
        <div className="flex items-center gap-2 opacity-0 animate-fade-up" style={{ animationFillMode: 'forwards' }}>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <span className="text-lg font-semibold text-primary">Sweetspots</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center px-5 pb-8 relative">
        <div className="w-full space-y-8">
          {/* Headlines */}
          <div className="space-y-3 opacity-0 animate-fade-up" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              What are you in the mood for right now?
            </h1>
            <p className="text-base text-muted-foreground">
              Just describe what you're feeling, and we'll show you places that actually match.
            </p>
          </div>

          {/* Input */}
          <div className="opacity-0 animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
            <MoodInput onSubmit={onSubmit} onSkip={onSkip} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default EntryScreen;
