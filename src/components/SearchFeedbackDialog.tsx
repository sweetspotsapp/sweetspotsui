import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SearchFeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  searchPrompt?: string;
  userId?: string;
}

const SearchFeedbackDialog = ({ open, onClose, searchPrompt, userId }: SearchFeedbackDialogProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      if (userId) {
        await supabase.from("search_feedback" as any).insert({
          user_id: userId,
          rating,
          comment: comment.trim() || null,
          search_prompt: searchPrompt || null,
        } as any);
      }
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        // Reset state after close
        setRating(0);
        setComment("");
        setSubmitted(false);
      }, 1500);
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setRating(0);
    setComment("");
    setSubmitted(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-[340px] rounded-2xl p-5 gap-0">

        {submitted ? (
          <div className="text-center py-6">
            <DialogTitle className="text-lg font-semibold text-foreground">Thanks for your feedback!</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">It helps us improve your experience.</p>
          </div>
        ) : (
          <>
            <DialogTitle className="text-base font-semibold text-foreground text-center mb-1">
              How were the results?
            </DialogTitle>
            <p className="text-xs text-muted-foreground text-center mb-4">
              Your feedback helps us find better spots for you
            </p>

            {/* Star Rating */}
            <div className="flex justify-center gap-1.5 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoveredStar || rating)
                        ? "fill-primary text-primary"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Comment */}
            <Textarea
              placeholder="Any thoughts? (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              className="resize-none text-sm min-h-[72px] mb-3"
            />

            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="w-full"
              size="sm"
            >
              {submitting ? "Sending..." : "Submit"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SearchFeedbackDialog;
