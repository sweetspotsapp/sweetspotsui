import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Tracks page views. Currently logs to console in dev.
 * Replace the body with your analytics provider (Plausible, PostHog, GA4, etc.)
 */
export function usePageView() {
  const location = useLocation();

  useEffect(() => {
    // Future: send to analytics provider
    // e.g. posthog.capture('$pageview')
    // e.g. plausible('pageview')
    if (import.meta.env.DEV) {
      console.debug("[analytics] pageview:", location.pathname + location.search);
    }
  }, [location.pathname, location.search]);
}
