import { MapPin } from "lucide-react";
import MoodInput from "./MoodInput";

interface EntryScreenProps {
  onSubmit: (mood: string) => void;
}

const EntryScreen = ({ onSubmit }: EntryScreenProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top decorative element */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      
      <main className="flex-1 flex flex-col justify-center px-6 py-12 relative">
        <div className="w-full max-w-md mx-auto space-y-10">
          {/* Logo / Icon */}
          <div className="flex justify-center opacity-0 animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
          </div>

          {/* Headlines */}
          <div className="text-center space-y-3 opacity-0 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
            <h1 className="text-3xl font-bold text-foreground leading-tight">
              Don't know where to go?
            </h1>
            <p className="text-lg text-muted-foreground">
              That's okay. Just tell us what you're in the mood for.
            </p>
          </div>

          {/* Input */}
          <div className="opacity-0 animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
            <MoodInput onSubmit={onSubmit} />
          </div>
        </div>
      </main>

      {/* Bottom branding */}
      <footer className="pb-8 pt-4 text-center opacity-0 animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
        <p className="text-sm font-medium text-primary">Sweetspots</p>
        <p className="text-xs text-muted-foreground mt-1">
          Find places that feel right
        </p>
      </footer>
    </div>
  );
};

export default EntryScreen;
