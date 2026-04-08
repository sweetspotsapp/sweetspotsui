import { useState } from "react";
import { X, Send, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ShareTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
}

const ShareTripDialog = ({ isOpen, onClose, tripId, tripName }: ShareTripDialogProps) => {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  if (!isOpen) return null;

  const handleShare = async () => {
    if (!user || !input.trim()) return;
    setIsSharing(true);

    try {
      const trimmed = input.trim();
      let targetUserId: string | null = null;

      // Check if input looks like a SweetSpots ID (SS-XXXXXX)
      if (/^SS-[A-Z0-9]{6}$/i.test(trimmed)) {
        const { data } = await supabase.rpc("lookup_profile_by_sweetspots_id", {
          lookup_id: trimmed.toUpperCase(),
        });
        if (data && data.length > 0) targetUserId = data[0].id;
      } else {
        // Treat as email — look up via auth metadata isn't possible,
        // so we search profiles by checking auth users via edge function
        // For now, we'll look up by email in auth
        const { data } = await supabase.functions.invoke("find-user-by-email", {
          body: { email: trimmed },
        });
        if (data?.user_id) targetUserId = data.user_id;
      }

      if (!targetUserId) {
        toast.error("User not found", {
          description: "Check the SweetSpots ID or email and try again.",
        });
        setIsSharing(false);
        return;
      }

      if (targetUserId === user.id) {
        toast.error("That's you!", { description: "You can't share a trip with yourself." });
        setIsSharing(false);
        return;
      }

      const { error } = await (supabase.from("shared_trips") as any).insert({
        trip_id: tripId,
        shared_by: user.id,
        shared_with: targetUserId,
        permission: "view",
      });

      if (error) {
        if (error.code === "23505") {
          toast.info("Already shared", { description: "This trip is already shared with that user." });
        } else {
          throw error;
        }
      } else {
        toast.success("Trip shared!", { description: `"${tripName}" has been shared.` });
        // Send email notification (fire-and-forget)
        supabase.functions.invoke("notify-trip-shared", {
          body: {
            tripId,
            tripName,
            sharedWithUserId: targetUserId,
            sharerName: user.email?.split("@")[0] || "Someone",
          },
        }).catch(console.error);
      }

      setInput("");
      onClose();
    } catch (err) {
      console.error("Share error:", err);
      toast.error("Failed to share trip");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border shadow-elevated p-6 mx-4 max-w-sm w-full space-y-4 animate-fade-up" style={{ animationFillMode: "forwards" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Share Trip</h3>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          Enter your friend's SweetSpots ID or email to share <span className="font-medium text-foreground">"{tripName}"</span>.
        </p>

        <div className="space-y-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="SS-A7K3X9 or friend@email.com"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            onKeyDown={(e) => e.key === "Enter" && handleShare()}
            autoFocus
          />

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={!input.trim() || isSharing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSharing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Share
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareTripDialog;
