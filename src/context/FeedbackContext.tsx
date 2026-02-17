import { createContext, useContext, useState, useRef, useCallback, ReactNode } from "react";
import SearchFeedbackDialog from "@/components/SearchFeedbackDialog";
import { useAuth } from "@/hooks/useAuth";

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

  const trackSearch = useCallback((searchPrompt?: string) => {
    searchCountRef.current += 1;
    setLastPrompt(searchPrompt);

    // Show on 1st search, then every 5th
    if (searchCountRef.current === 1 || searchCountRef.current % 5 === 0) {
      // Clear any pending timer
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowFeedback(true), 5000);
    }
  }, []);

  return (
    <FeedbackContext.Provider value={{ trackSearch }}>
      {children}
      <SearchFeedbackDialog
        open={showFeedback}
        onClose={() => setShowFeedback(false)}
        searchPrompt={lastPrompt}
        userId={user?.id}
      />
    </FeedbackContext.Provider>
  );
};
