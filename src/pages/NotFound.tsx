import { useNavigate } from "react-router-dom";
import { MapPin, Home, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center max-w-sm">
        {/* Illustration */}
        <div className="relative mx-auto mb-8 w-32 h-32">
          <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse" />
          <div className="absolute inset-3 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="w-14 h-14 text-primary/40" />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-destructive font-bold text-sm">?</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">Lost your way?</h1>
        <p className="text-muted-foreground mb-8">
          This page doesn't exist — but there are plenty of amazing spots waiting for you.
        </p>

        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate("/")} className="rounded-full w-full gap-2">
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/?tab=discover")}
            className="rounded-full w-full gap-2"
          >
            <Search className="w-4 h-4" />
            Discover Spots
          </Button>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-2 flex items-center justify-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Go back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
