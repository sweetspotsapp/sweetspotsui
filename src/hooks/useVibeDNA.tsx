import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface VibeScore {
  label: string;
  percentage: number;
  color: string;
}

interface VibeDNAData {
  vibeBreakdown: VibeScore[];
  isLoading: boolean;
  totalInteractions: number;
  searchCount: number;
  placesShownCount: number;
}

// Map filter_tags to vibe categories with weights
const VIBE_TAG_MAP: Record<string, { category: string; weight: number }> = {
  // Chill vibes
  'quiet': { category: 'Chill', weight: 2 },
  'peaceful': { category: 'Chill', weight: 2 },
  'cozy': { category: 'Chill', weight: 2 },
  'relaxed': { category: 'Chill', weight: 1.5 },
  'calm': { category: 'Chill', weight: 1.5 },
  'intimate': { category: 'Chill', weight: 1 },
  'reading_friendly': { category: 'Chill', weight: 1 },
  'wifi_work': { category: 'Chill', weight: 0.5 },
  
  // Aesthetic vibes
  'instagrammable': { category: 'Aesthetic', weight: 2 },
  'scenic': { category: 'Aesthetic', weight: 2 },
  'rooftop': { category: 'Aesthetic', weight: 1.5 },
  'waterfront': { category: 'Aesthetic', weight: 1.5 },
  'artsy': { category: 'Aesthetic', weight: 1.5 },
  'design': { category: 'Aesthetic', weight: 1 },
  'unique': { category: 'Aesthetic', weight: 1 },
  'trendy': { category: 'Aesthetic', weight: 1 },
  
  // Social vibes
  'lively': { category: 'Social', weight: 2 },
  'group_friendly': { category: 'Social', weight: 2 },
  'nightlife': { category: 'Social', weight: 1.5 },
  'sports_bar': { category: 'Social', weight: 1.5 },
  'live_music': { category: 'Social', weight: 1.5 },
  'dancing': { category: 'Social', weight: 1.5 },
  'karaoke': { category: 'Social', weight: 1 },
  'games': { category: 'Social', weight: 1 },
  
  // Foodie vibes
  'fine_dining': { category: 'Foodie', weight: 2 },
  'local_cuisine': { category: 'Foodie', weight: 1.5 },
  'street_food': { category: 'Foodie', weight: 1.5 },
  'brunch': { category: 'Foodie', weight: 1 },
  'desserts': { category: 'Foodie', weight: 1 },
  'cocktails': { category: 'Foodie', weight: 1 },
  'wine': { category: 'Foodie', weight: 1 },
  'craft_beer': { category: 'Foodie', weight: 1 },
  
  // Adventure vibes
  'outdoor': { category: 'Adventure', weight: 2 },
  'hidden_gem': { category: 'Adventure', weight: 1.5 },
  'off_beaten_path': { category: 'Adventure', weight: 1.5 },
  'local_favorite': { category: 'Adventure', weight: 1 },
  'late_night': { category: 'Adventure', weight: 1 },
};

// Action weights for scoring
const ACTION_WEIGHTS: Record<string, number> = {
  'save': 3,
  'click': 1,
  'view': 0.5,
  'share': 2,
};

const VIBE_COLORS: Record<string, string> = {
  'Chill': 'bg-gentle-sage',
  'Aesthetic': 'bg-soft-coral',
  'Social': 'bg-primary',
  'Foodie': 'bg-amber-500',
  'Adventure': 'bg-emerald-500',
};

export const useVibeDNA = (): VibeDNAData => {
  const { user } = useAuth();
  const [vibeBreakdown, setVibeBreakdown] = useState<VibeScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalInteractions, setTotalInteractions] = useState(0);
  const [searchCount, setSearchCount] = useState(0);
  const [placesShownCount, setPlacesShownCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setVibeBreakdown([
        { label: 'Chill', percentage: 40, color: 'bg-gentle-sage' },
        { label: 'Aesthetic', percentage: 30, color: 'bg-soft-coral' },
        { label: 'Social', percentage: 30, color: 'bg-primary' },
      ]);
      setIsLoading(false);
      return;
    }

    const calculateVibeDNA = async () => {
      setIsLoading(true);
      
      try {
        // Fetch user's place interactions
        const { data: interactions, error: interactionsError } = await supabase
          .from('place_interactions')
          .select('place_id, action, weight')
          .eq('user_id', user.id);

        if (interactionsError) {
          console.error('Error fetching interactions:', interactionsError);
        }

        // Fetch user's searches count
        const { count: searchesCount, error: searchesError } = await supabase
          .from('searches')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (searchesError) {
          console.error('Error fetching searches:', searchesError);
        }

        setSearchCount(searchesCount || 0);
        
        // Calculate places shown count: unique places the user has interacted with
        const uniquePlaceIds = new Set(interactions?.map(i => i.place_id) || []);
        setPlacesShownCount(uniquePlaceIds.size);

        if (!interactions || interactions.length === 0) {
          // Default vibes for new users
          setVibeBreakdown([
            { label: 'Chill', percentage: 40, color: 'bg-gentle-sage' },
            { label: 'Aesthetic', percentage: 30, color: 'bg-soft-coral' },
            { label: 'Social', percentage: 30, color: 'bg-primary' },
          ]);
          setTotalInteractions(0);
          setIsLoading(false);
          return;
        }

        setTotalInteractions(interactions.length);

        // Get unique place IDs
        const placeIds = [...new Set(interactions.map(i => i.place_id))];

        // Fetch places with filter_tags
        const { data: places, error: placesError } = await supabase
          .from('places')
          .select('place_id, filter_tags, categories')
          .in('place_id', placeIds);

        if (placesError) {
          console.error('Error fetching places:', placesError);
          setIsLoading(false);
          return;
        }

        // Create a map of place_id to place data
        const placeMap = new Map(places?.map(p => [p.place_id, p]) || []);

        // Calculate weighted vibe scores
        const vibeScores: Record<string, number> = {};

        interactions.forEach(interaction => {
          const place = placeMap.get(interaction.place_id);
          if (!place) return;

          const actionWeight = ACTION_WEIGHTS[interaction.action] || 1;
          const interactionWeight = interaction.weight || 1;
          const totalWeight = actionWeight * interactionWeight;

          // Score from filter_tags
          const filterTags = place.filter_tags || [];
          filterTags.forEach((tag: string) => {
            const tagInfo = VIBE_TAG_MAP[tag.toLowerCase()];
            if (tagInfo) {
              vibeScores[tagInfo.category] = (vibeScores[tagInfo.category] || 0) + (tagInfo.weight * totalWeight);
            }
          });

          // Also consider categories as a fallback
          const categories = place.categories || [];
          categories.forEach((cat: string) => {
            const catLower = cat.toLowerCase();
            if (catLower.includes('cafe') || catLower.includes('coffee')) {
              vibeScores['Chill'] = (vibeScores['Chill'] || 0) + totalWeight;
            }
            if (catLower.includes('bar') || catLower.includes('club') || catLower.includes('pub')) {
              vibeScores['Social'] = (vibeScores['Social'] || 0) + totalWeight;
            }
            if (catLower.includes('restaurant') || catLower.includes('food')) {
              vibeScores['Foodie'] = (vibeScores['Foodie'] || 0) + totalWeight;
            }
            if (catLower.includes('museum') || catLower.includes('gallery') || catLower.includes('art')) {
              vibeScores['Aesthetic'] = (vibeScores['Aesthetic'] || 0) + totalWeight;
            }
            if (catLower.includes('park') || catLower.includes('outdoor') || catLower.includes('nature')) {
              vibeScores['Adventure'] = (vibeScores['Adventure'] || 0) + totalWeight;
            }
          });
        });

        // Convert to percentages
        const totalScore = Object.values(vibeScores).reduce((a, b) => a + b, 0);
        
        if (totalScore === 0) {
          // No meaningful data yet
          setVibeBreakdown([
            { label: 'Chill', percentage: 40, color: 'bg-gentle-sage' },
            { label: 'Aesthetic', percentage: 30, color: 'bg-soft-coral' },
            { label: 'Social', percentage: 30, color: 'bg-primary' },
          ]);
        } else {
          // Sort by score and take top 3-5
          const sortedVibes = Object.entries(vibeScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([label, score]) => ({
              label,
              percentage: Math.round((score / totalScore) * 100),
              color: VIBE_COLORS[label] || 'bg-primary',
            }));

          // Normalize to ensure percentages add up to 100
          const totalPercentage = sortedVibes.reduce((a, b) => a + b.percentage, 0);
          if (totalPercentage !== 100 && sortedVibes.length > 0) {
            sortedVibes[0].percentage += (100 - totalPercentage);
          }

          setVibeBreakdown(sortedVibes);
        }
      } catch (error) {
        console.error('Error calculating Vibe DNA:', error);
        setVibeBreakdown([
          { label: 'Chill', percentage: 40, color: 'bg-gentle-sage' },
          { label: 'Aesthetic', percentage: 30, color: 'bg-soft-coral' },
          { label: 'Social', percentage: 30, color: 'bg-primary' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    calculateVibeDNA();
  }, [user]);

  return { vibeBreakdown, isLoading, totalInteractions, searchCount, placesShownCount };
};
