import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import AuthDialog from "./AuthDialog";
import { useAuth } from "@/hooks/useAuth";

const LoginReminderBanner = () => {
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  if (user) return null;

  return (
    <>
      <div className="mx-4 mt-3 p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground font-medium">Sign in to save your spots</p>
          <p className="text-xs text-muted-foreground">Your saves & itineraries will sync across devices</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 rounded-full border-primary/30 text-primary hover:bg-primary/10 text-xs px-3"
          onClick={() => setShowAuthDialog(true)}
        >
          Sign in
        </Button>
      </div>
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </>
  );
};

export default LoginReminderBanner;
