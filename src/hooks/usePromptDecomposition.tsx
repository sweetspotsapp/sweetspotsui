import { useMemo } from "react";

export interface DecomposedSection {
  id: string;
  title: string;
  type: "exact" | "core" | "secondary" | "similar";
  query: string;
  description?: string;
}

// Common activity keywords
const ACTIVITY_KEYWORDS = [
  "wine", "coffee", "brunch", "dinner", "lunch", "breakfast",
  "drinks", "cocktails", "beer", "food", "dessert", "pizza",
  "sushi", "ramen", "tacos", "burgers", "seafood", "steak",
  "vegan", "vegetarian", "healthy", "comfort food", "street food"
];

// Common setting/context keywords
const SETTING_KEYWORDS = [
  "city view", "rooftop", "outdoor", "garden", "beach", "waterfront",
  "cozy", "romantic", "quiet", "lively", "aesthetic", "trendy",
  "hidden gem", "scenic", "sunset", "sunrise", "night", "late night"
];

// Vibe keywords for similarity matching
const VIBE_KEYWORDS = [
  "chill", "vibrant", "intimate", "social", "fancy", "casual",
  "upscale", "budget", "cheap", "expensive", "affordable",
  "modern", "classic", "vintage", "artsy", "hipster"
];

function extractKeywords(prompt: string): {
  activities: string[];
  settings: string[];
  vibes: string[];
  other: string[];
} {
  const lowerPrompt = prompt.toLowerCase();
  
  const activities = ACTIVITY_KEYWORDS.filter(kw => lowerPrompt.includes(kw));
  const settings = SETTING_KEYWORDS.filter(kw => lowerPrompt.includes(kw));
  const vibes = VIBE_KEYWORDS.filter(kw => lowerPrompt.includes(kw));
  
  // Extract remaining words as "other"
  let remaining = lowerPrompt;
  [...activities, ...settings, ...vibes].forEach(kw => {
    remaining = remaining.replace(kw, "");
  });
  
  const other = remaining
    .split(/[\s,]+/)
    .filter(word => word.length > 2)
    .slice(0, 3);
  
  return { activities, settings, vibes, other };
}

function generateCoreTitle(activities: string[], other: string[]): string {
  if (activities.length > 0) {
    const main = activities[0];
    // Capitalize first letter
    const formatted = main.charAt(0).toUpperCase() + main.slice(1);
    return `Great ${formatted.toLowerCase()} spots`;
  }
  if (other.length > 0) {
    const main = other[0];
    return `Best ${main} places`;
  }
  return "Popular spots nearby";
}

function generateSecondaryTitle(settings: string[], vibes: string[]): string {
  if (settings.length > 0) {
    const main = settings[0];
    // Format for display
    if (main.includes("view")) {
      return `Spots with ${main}s`;
    }
    if (main.includes("rooftop")) {
      return "Rooftop spots";
    }
    if (main.includes("outdoor") || main.includes("garden")) {
      return "Great outdoor spots";
    }
    return `${main.charAt(0).toUpperCase() + main.slice(1)} places`;
  }
  if (vibes.length > 0) {
    const main = vibes[0];
    return `${main.charAt(0).toUpperCase() + main.slice(1)} vibes`;
  }
  return "Spots with great atmosphere";
}

function generateSimilarTitle(vibes: string[]): string {
  if (vibes.length > 0) {
    return "Similar spots you might like";
  }
  return "You might also enjoy";
}

export function usePromptDecomposition(prompt: string): DecomposedSection[] {
  return useMemo(() => {
    if (!prompt || prompt.trim().length === 0) {
      // Default sections when no prompt
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

    const trimmedPrompt = prompt.trim();
    const { activities, settings, vibes, other } = extractKeywords(trimmedPrompt);
    
    const sections: DecomposedSection[] = [];
    
    // 1. Exact Match Section - top picks for the full query
    sections.push({
      id: "exact",
      title: `Top picks for "${trimmedPrompt}"`,
      type: "exact",
      query: trimmedPrompt,
      description: "Best matches for your search"
    });
    
    // 2. Core Intent Section - main activity/interest
    const coreQuery = [...activities, ...other.slice(0, 1)].join(" ");
    sections.push({
      id: "core",
      title: generateCoreTitle(activities, other),
      type: "core",
      query: coreQuery || trimmedPrompt,
      description: "Focus on the main activity"
    });
    
    // 3. Secondary Intent Section - setting/context
    const secondaryQuery = [...settings, ...vibes.slice(0, 1)].join(" ");
    sections.push({
      id: "secondary",
      title: generateSecondaryTitle(settings, vibes),
      type: "secondary",
      query: secondaryQuery || "nice atmosphere",
      description: "Focus on the ambiance"
    });
    
    // 4. Similar Spots Section - algorithmic similarity
    sections.push({
      id: "similar",
      title: generateSimilarTitle(vibes),
      type: "similar",
      query: vibes.length > 0 ? vibes.join(" ") : trimmedPrompt,
      description: "Based on vibe and atmosphere"
    });
    
    return sections;
  }, [prompt]);
}

export default usePromptDecomposition;
