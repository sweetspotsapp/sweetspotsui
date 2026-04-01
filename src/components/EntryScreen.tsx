import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import AuthDialog from "./AuthDialog";
import type { OnboardingData } from "@/context/AppContext";

interface EntryScreenProps {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
}

const EntryScreen = ({ onComplete, onSkip }: EntryScreenProps) => {
  const { signInWithGoogle } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGetStarted = () => {
    onComplete({
      trip_intention: null,
      budget: null,
      travel_personality: [],
      explore_location: null,
    });
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: "Google sign in failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center max-w-[420px] mx-auto px-8 py-12">
      <div className="flex-1 flex flex-col items-center justify-center w-full gap-12">
        {/* Logo */}
        <div className="opacity-0 animate-fade-up">
          <img
            src="/sweetspots-logo.svg"
            alt="Sweetspots"
            className="h-12 w-auto"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        {/* Hero copy */}
        <div className="text-center space-y-4 opacity-0 animate-fade-up delay-200">
          <h1 className="text-4xl font-bold text-foreground tracking-tight leading-[1.15]">
            Save spots you love.
            <br />
            Plan trips that matter.
          </h1>
          <p className="text-muted-foreground text-base max-w-[280px] mx-auto leading-relaxed">
            Import places from anywhere, organise them into boards, and turn them into trips.
          </p>
        </div>

        {/* Actions */}
        <div className="w-full space-y-3 opacity-0 animate-fade-up delay-400">
          <Button
            onClick={handleGetStarted}
            className="w-full h-13 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-base font-medium"
          >
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <Button
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            variant="outline"
            className="w-full h-13 rounded-xl text-base border-border font-medium"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          <button
            onClick={() => setShowAuthDialog(true)}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors pt-2"
          >
            Sign in with email
          </button>
        </div>
      </div>

      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onSuccess={handleGetStarted}
      />
    </div>
  );
};

export default EntryScreen;
