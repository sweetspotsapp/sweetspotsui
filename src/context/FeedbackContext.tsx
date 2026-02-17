import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from "react";
import SearchFeedbackDialog from "@/components/SearchFeedbackDialog";
import { useAuth } from "@/hooks/useAuth";

const FEEDBACK_SESSION_KEY = "sweetspots_feedback_shown";

interface FeedbackContextType {
  trackSearch: (searchPrompt?: string) => void;
}

const FeedbackContext = createContext<FeedbackContextType>({ trackSearch: () => {} });

export const useFeedback = () => useContext(FeedbackContext);

export const FeedbackProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string>();
  const searchCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const hasShownThisSession = useRef(false);

  // Exit-intent: show after 10s on any screen if not already shown this session
  useEffect(() => {
    try {
      if (sessionStorage.getItem(FEEDBACK_SESSION_KEY) === "true") {
        hasShownThisSession.current = true;
        return;
      }
    } catch {}

    const exitTimer = setTimeout(() => {
      if (!hasShownThisSession.current) {
        hasShownThisSession.current = true;
        setShowFeedback(true);
        try { sessionStorage.setItem(FEEDBACK_SESSION_KEY, "true"); } catch {}
      }
    }, 10000);

    return () => clearTimeout(exitTimer);
  }, []);

  const trackSearch = useCallback((searchPrompt?: string) => {
    searchCountRef.current += 1;
    setLastPrompt(searchPrompt);

    // Also show on every 5th search (in addition to exit-intent)
    if (searchCountRef.current % 5 === 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowFeedback(true), 10000);
    }
  }, []);

  const handleClose = useCallback(() => {
    setShowFeedback(false);
    hasShownThisSession.current = true;
    try { sessionStorage.setItem(FEEDBACK_SESSION_KEY, "true"); } catch {}
  }, []);

  return (
    <FeedbackContext.Provider value={{ trackSearch }}>
      {children}
      <SearchFeedbackDialog
        open={showFeedback}
        onClose={handleClose}
        searchPrompt={lastPrompt}
        userId={user?.id}
      />
    </FeedbackContext.Provider>
  );
};
