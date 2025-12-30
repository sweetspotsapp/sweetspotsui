import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DecomposedSection {
  id: string;
  title: string;
  type: "exact" | "core" | "secondary" | "similar";
  query: string;
  description?: string;
}

interface AIHeadings {
  topPicks: string;
  coreIntent: string;
  secondary: string;
  similar: string;
}

// Simple hash for caching
const hashPrompt = (prompt: string): string => {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
};

// Cache for AI headings
const headingsCache = new Map<string, AIHeadings>();

export function usePromptDecomposition(prompt: string): {
  sections: DecomposedSection[];
  isLoading: boolean;
} {
  const [aiHeadings, setAiHeadings] = useState<AIHeadings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmedPrompt = prompt?.trim() || "";
    
    if (!trimmedPrompt || trimmedPrompt === "Discover nearby") {
      setAiHeadings(null);
      setIsLoading(false);
      return;
    }

    const cacheKey = hashPrompt(trimmedPrompt);
    
    // Check cache first
    if (headingsCache.has(cacheKey)) {
      setAiHeadings(headingsCache.get(cacheKey)!);
      setIsLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchHeadings = async () => {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('summarize-prompt', {
          body: { prompt: trimmedPrompt }
        });

        if (controller.signal.aborted) return;

        if (error) {
          console.error('Error fetching AI headings:', error);
          setAiHeadings(null);
        } else if (data?.headings) {
          headingsCache.set(cacheKey, data.headings);
          setAiHeadings(data.headings);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch AI headings:', err);
        setAiHeadings(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    // Small debounce to avoid rapid API calls
    const timeoutId = setTimeout(fetchHeadings, 300);
    
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [prompt]);

  const sections = useMemo(() => {
    const trimmedPrompt = prompt?.trim() || "";
    
    if (!trimmedPrompt || trimmedPrompt === "Discover nearby") {
      return [
        {
          id: "default-top",
          title: "Top picks for you",
          type: "exact" as const,
          query: "",
          description: "Personalized recommendations"
        },
        {
          id: "default-nearby",
          title: "Popular spots nearby",
          type: "core" as const,
          query: "",
          description: "Trending in your area"
        },
        {
          id: "default-gems",
          title: "Hidden gems",
          type: "secondary" as const,
          query: "hidden gem",
          description: "Off the beaten path"
        },
        {
          id: "default-similar",
          title: "Explore something new",
          type: "similar" as const,
          query: "",
          description: "Discover new favorites"
        }
      ];
    }

    // Use AI headings if available, otherwise use prompt
    const headings = aiHeadings || {
      topPicks: `Top picks`,
      coreIntent: "Best matches",
      secondary: "Great atmosphere",
      similar: "You might like"
    };

    return [
      {
        id: "exact",
        title: headings.topPicks,
        type: "exact" as const,
        query: trimmedPrompt,
        description: "Best matches for your search"
      },
      {
        id: "core",
        title: headings.coreIntent,
        type: "core" as const,
        query: trimmedPrompt,
        description: "Focus on the main activity"
      },
      {
        id: "secondary",
        title: headings.secondary,
        type: "secondary" as const,
        query: trimmedPrompt,
        description: "Focus on the ambiance"
      },
      {
        id: "similar",
        title: headings.similar,
        type: "similar" as const,
        query: trimmedPrompt,
        description: "Based on vibe and atmosphere"
      }
    ];
  }, [prompt, aiHeadings]);

  return { sections, isLoading };
}

export default usePromptDecomposition;
