import posthog from "posthog-js";

const POSTHOG_KEY = "phc_o3HxnSjpuNcWMKW47yRA3RHQDCq3WuvJwweZdsLVETcd";
const POSTHOG_HOST = "https://us.i.posthog.com";

const isPreview =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("id-preview--") ||
    window.location.hostname.includes("lovableproject.com"));

const isIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

if (!isPreview && !isIframe && typeof window !== "undefined") {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: true,
    capture_pageview: false, // we handle this manually via usePageView
    capture_pageleave: true,
    persistence: "localStorage+cookie",
  });
}

export default posthog;
