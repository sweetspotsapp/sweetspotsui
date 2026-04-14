import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from "react";
import SearchFeedbackDialog from "@/components/SearchFeedbackDialog";
import { useAuth } from "@/hooks/useAuth";

import { SS_FEEDBACK_SHOWN } from "@/lib/storageKeys";

const FEEDBACK_SESSION_KEY = SS_FEEDBACK_SHOWN;

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

  // Check if feedback was already shown this session
  useEffect(() => {
    try {
      if (sessionStorage.getItem(FEEDBACK_SESSION_KEY) === "true") {
        hasShownThisSession.current = true;
      }
    } catch {}
  }, []);

  const trackSearch = useCallback((searchPrompt?: string) => {
    searchCountRef.current += 1;
    setLastPrompt(searchPrompt);

    // Show after 1st search, then every 5th search — delayed 10s
    if (searchCountRef.current === 1 || searchCountRef.current % 5 === 0) {
      if (!hasShownThisSession.current) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          if (!hasShownThisSession.current) {
            setShowFeedback(true);
            hasShownThisSession.current = true;
            try { sessionStorage.setItem(FEEDBACK_SESSION_KEY, "true"); } catch {}
          }
        }, 10000);
      }
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
