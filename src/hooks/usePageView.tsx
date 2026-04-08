import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import posthog from "@/lib/posthog";

/**
 * Tracks page views via PostHog on every route change.
 */
export function usePageView() {
  const location = useLocation();

  useEffect(() => {
    posthog.capture("$pageview", {
      $current_url: window.location.href,
      path: location.pathname,
    });
  }, [location.pathname, location.search]);
}
