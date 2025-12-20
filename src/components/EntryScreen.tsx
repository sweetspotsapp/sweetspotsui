import { MapPin } from "lucide-react";
import MoodInput from "./MoodInput";

interface EntryScreenProps {
  onSubmit: (mood: string) => void;
}

const EntryScreen = ({ onSubmit }: EntryScreenProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Top decorative element */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      
      {/* Header */}
      <header className="pt-12 pb-4 px-5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <span className="text-lg font-semibold text-primary">Sweetspots</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center px-5 pb-8 relative">
        <div className="w-full space-y-8">
          {/* Headlines */}
          <div className="space-y-2 opacity-0 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              Don't know where to go?
            </h1>
            <p className="text-base text-muted-foreground">
              That's okay. Just tell us what you're in the mood for.
            </p>
          </div>

          {/* Input */}
          <div className="opacity-0 animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
            <MoodInput onSubmit={onSubmit} />
          </div>
        </div>
      </main>

      {/* Bottom safe area */}
      <div className="h-6" />
    </div>
  );
};

export default EntryScreen;
