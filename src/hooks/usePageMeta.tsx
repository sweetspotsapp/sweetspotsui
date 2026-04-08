import { useEffect } from "react";

interface PageMeta {
  title?: string;
  description?: string;
}

/**
 * Sets document title and meta description for the current page.
 * Falls back to SweetSpots defaults.
 */
export function usePageMeta({ title, description }: PageMeta) {
  useEffect(() => {
    const prev = document.title;
    if (title) {
      document.title = `${title} — SweetSpots`;
    }
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute("content") ?? "";
    if (description && metaDesc) {
      metaDesc.setAttribute("content", description);
    }
    return () => {
      document.title = prev;
      if (metaDesc) metaDesc.setAttribute("content", prevDesc);
    };
  }, [title, description]);
}
