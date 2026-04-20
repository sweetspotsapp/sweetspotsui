import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const SharedTrip = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!tripId) {
      setError("Invalid link");
      return;
    }

    // Not signed in → send to auth, then come back here
    if (!user) {
      const returnTo = `/trip/shared/${tripId}`;
      sessionStorage.setItem("postAuthRedirect", returnTo);
      navigate("/", { replace: true });
      return;
    }

    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          "accept-trip-link",
          { body: { tripId } },
        );
        if (fnErr) throw fnErr;
        if (!data?.ok) throw new Error(data?.error || "Failed to open trip");

        sessionStorage.setItem("resumeTripId", tripId);
        toast.success(
          data.owner ? "Opening your trip" : "Trip added to shared with you",
        );
        navigate("/trip", { replace: true });
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Couldn't open this shared trip");
      }
    })();
  }, [authLoading, user, tripId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center space-y-3">
        {error ? (
          <>
            <p className="text-foreground font-medium">{error}</p>
            <button
              onClick={() => navigate("/")}
              className="text-sm text-primary hover:underline"
            >
              Go home
            </button>
          </>
        ) : (
          <>
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Opening shared trip…</p>
          </>
        )}
      </div>
    </div>
  );
};

export default SharedTrip;
