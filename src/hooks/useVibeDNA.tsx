import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LucideIcon, Moon, Volume2, Coffee, Users, Sparkles, Camera, Utensils, MapPin, Music, Wine, Heart, Compass } from "lucide-react";

interface VibeScore {
  label: string;
  percentage: number;
  color: string;
}

export interface PersonalityTrait {
  icon: LucideIcon;
  label: string;
  description: string;
  score: number;
}

interface VibeDNAData {
  vibeBreakdown: VibeScore[];
  personalityTraits: PersonalityTrait[];
  isLoading: boolean;
  totalInteractions: number;
  searchCount: number;
  placesShownCount: number;
  refresh: () => void;
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

// Personality trait definitions based on behavior patterns
export const PERSONALITY_DEFINITIONS: Array<{
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
  triggers: { tags?: string[]; categories?: string[]; minScore: number };
}> = [
  {
    id: 'night_owl',
    icon: Moon,
    label: 'Evening explorer',
    description: 'You prefer spots that come alive after dark',
    triggers: { tags: ['nightlife', 'late_night', 'dancing', 'live_music'], categories: ['bar', 'club', 'pub', 'nightclub'], minScore: 2 }
  },
  {
    id: 'conversation_seeker',
    icon: Volume2,
    label: 'Conversation seeker',
    description: 'Quiet enough to talk, lively enough to feel alive',
    triggers: { tags: ['quiet', 'cozy', 'intimate', 'relaxed'], categories: ['cafe', 'coffee', 'tea'], minScore: 2 }
  },
  {
    id: 'cafe_hopper',
    icon: Coffee,
    label: 'Café hopper',
    description: "You've got a thing for good coffee and better vibes",
    triggers: { tags: ['cozy', 'wifi_work', 'reading_friendly'], categories: ['cafe', 'coffee', 'bakery'], minScore: 2 }
  },
  {
    id: 'social_butterfly',
    icon: Users,
    label: 'Social butterfly',
    description: 'Group-friendly spots are your go-to',
    triggers: { tags: ['group_friendly', 'lively', 'games', 'karaoke'], categories: ['bar', 'restaurant', 'entertainment'], minScore: 2 }
  },
  {
    id: 'aesthetic_hunter',
    icon: Camera,
    label: 'Aesthetic hunter',
    description: 'You chase the prettiest corners and Insta-worthy spots',
    triggers: { tags: ['instagrammable', 'scenic', 'rooftop', 'waterfront', 'artsy'], categories: ['gallery', 'museum', 'art'], minScore: 2 }
  },
  {
    id: 'foodie',
    icon: Utensils,
    label: 'Flavor chaser',
    description: 'Great food is your love language',
    triggers: { tags: ['fine_dining', 'local_cuisine', 'street_food', 'brunch'], categories: ['restaurant', 'food', 'dining'], minScore: 2 }
  },
  {
    id: 'hidden_gem_finder',
    icon: Compass,
    label: 'Hidden gem finder',
    description: 'You love discovering spots off the beaten path',
    triggers: { tags: ['hidden_gem', 'off_beaten_path', 'local_favorite', 'unique'], categories: [], minScore: 2 }
  },
  {
    id: 'cocktail_connoisseur',
    icon: Wine,
    label: 'Cocktail connoisseur',
    description: 'A well-crafted drink is your thing',
    triggers: { tags: ['cocktails', 'wine', 'craft_beer', 'speakeasy'], categories: ['bar', 'lounge', 'wine bar'], minScore: 2 }
  },
  {
    id: 'music_lover',
    icon: Music,
    label: 'Music lover',
    description: 'Live tunes make any spot better',
    triggers: { tags: ['live_music', 'dancing', 'karaoke'], categories: ['music venue', 'jazz', 'concert'], minScore: 2 }
  },
  {
    id: 'romantic',
    icon: Heart,
    label: 'Romantic at heart',
    description: 'Intimate, date-worthy spots are your specialty',
    triggers: { tags: ['romantic', 'intimate', 'scenic', 'fine_dining'], categories: [], minScore: 2 }
  },
];

export const useVibeDNA = (): VibeDNAData => {
  const { user } = useAuth();
  const [vibeBreakdown, setVibeBreakdown] = useState<VibeScore[]>([]);
  const [personalityTraits, setPersonalityTraits] = useState<PersonalityTrait[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalInteractions, setTotalInteractions] = useState(0);
  const [searchCount, setSearchCount] = useState(0);
  const [placesShownCount, setPlacesShownCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(k => k + 1);

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

        // Calculate weighted vibe scores and personality trait scores
        const vibeScores: Record<string, number> = {};
        const personalityScores: Record<string, number> = {};

        interactions.forEach(interaction => {
          const place = placeMap.get(interaction.place_id);
          if (!place) return;

          const actionWeight = ACTION_WEIGHTS[interaction.action] || 1;
          const interactionWeight = interaction.weight || 1;
          const totalWeight = actionWeight * interactionWeight;

          const filterTags = place.filter_tags || [];
          const categories = place.categories || [];
          const allTagsLower = filterTags.map((t: string) => t.toLowerCase().replace(/-/g, '_'));
          const allCatsLower = categories.map((c: string) => c.toLowerCase().replace(/-/g, '_'));

          // Score from filter_tags for vibe breakdown
          filterTags.forEach((tag: string) => {
            const normalized = tag.toLowerCase().replace(/-/g, '_');
            const tagInfo = VIBE_TAG_MAP[normalized];
            if (tagInfo) {
              vibeScores[tagInfo.category] = (vibeScores[tagInfo.category] || 0) + (tagInfo.weight * totalWeight);
            }
          });

          // Calculate personality trait scores
          PERSONALITY_DEFINITIONS.forEach(trait => {
            let matchScore = 0;
            
            // Check tag matches
            if (trait.triggers.tags) {
              trait.triggers.tags.forEach(triggerTag => {
                if (allTagsLower.some(t => t.includes(triggerTag) || triggerTag.includes(t))) {
                  matchScore += totalWeight;
                }
              });
            }
            
            // Check category matches
            if (trait.triggers.categories) {
              trait.triggers.categories.forEach(triggerCat => {
                if (allCatsLower.some(c => c.includes(triggerCat) || triggerCat.includes(c))) {
                  matchScore += totalWeight * 0.5; // Categories get less weight than tags
                }
              });
            }
            
            if (matchScore > 0) {
              personalityScores[trait.id] = (personalityScores[trait.id] || 0) + matchScore;
            }
          });

          // Also consider categories as a fallback for vibe scores
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

        // Calculate personality traits from scores
        const calculatedTraits: PersonalityTrait[] = PERSONALITY_DEFINITIONS
          .filter(def => (personalityScores[def.id] || 0) >= def.triggers.minScore)
          .map(def => ({
            icon: def.icon,
            label: def.label,
            description: def.description,
            score: personalityScores[def.id] || 0,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 4); // Show top 4 traits

        setPersonalityTraits(calculatedTraits);

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
  }, [user, refreshKey]);

  return { vibeBreakdown, personalityTraits, isLoading, totalInteractions, searchCount, placesShownCount, refresh };
};
