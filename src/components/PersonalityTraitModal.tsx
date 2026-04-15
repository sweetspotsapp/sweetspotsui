import { X, Sparkles, RotateCcw, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import type { PersonalityTrait } from "@/hooks/useVibeDNA";

interface PersonalityTraitModalProps {
  trait: PersonalityTrait | null;
  onClose: () => void;
  onExplore: (trait: PersonalityTrait) => void;
  onReset: (trait: PersonalityTrait) => void;
  isResetting?: boolean;
}

const TRAIT_INSIGHTS: Record<string, { why: string; based_on: string }> = {
  night_owl: {
    why: "Your saved spots and searches lean heavily toward places that come alive after sunset — bars, nightlife venues, and late-night eateries.",
    based_on: "Your clicks and saves on nightlife, late-night dining, and evening entertainment spots.",
  },
  conversation_seeker: {
    why: "You gravitate toward intimate cafes and quiet spots — places where the music is soft and the conversations flow.",
    based_on: "Your interest in cozy cafes, tea houses, and quiet dining spots.",
  },
  cafe_hopper: {
    why: "From specialty coffee to cozy bakeries, your browsing history is basically a coffee shop tour guide.",
    based_on: "Your frequent saves and clicks on cafes, bakeries, and work-friendly spots.",
  },
  social_butterfly: {
    why: "Group-friendly restaurants, karaoke joints, game bars — you love spots where the more, the merrier.",
    based_on: "Your interest in group-friendly venues, lively bars, and entertainment spots.",
  },
  aesthetic_hunter: {
    why: "Rooftop views, Instagram-worthy interiors, scenic waterfronts — you have an eye for beauty in every corner.",
    based_on: "Your saves on scenic, instagrammable, and artsy locations.",
  },
  foodie: {
    why: "Fine dining, street food, brunch spots — if it involves great food, you're there. Eating well isn't a hobby, it's a lifestyle.",
    based_on: "Your heavy engagement with restaurants, food stalls, and dining experiences.",
  },
  hidden_gem_finder: {
    why: "While others follow the crowds, you seek the road less traveled. Local favorites and off-the-beaten-path discoveries are your specialty.",
    based_on: "Your clicks on hidden gems, local favorites, and unique off-radar spots.",
  },
  cocktail_connoisseur: {
    why: "Speakeasies, wine bars, craft cocktail spots — your palate extends well beyond food into the world of carefully crafted drinks.",
    based_on: "Your interest in cocktail bars, wine bars, and speakeasy-style venues.",
  },
  music_lover: {
    why: "From jazz clubs to live music venues, you believe the right soundtrack makes any place unforgettable.",
    based_on: "Your engagement with live music venues, concert halls, and music-themed spots.",
  },
  romantic: {
    why: "Candlelit dinners, scenic overlooks, intimate atmospheres — you have a knack for finding the most date-worthy spots.",
    based_on: "Your saves on romantic, intimate, and fine dining locations.",
  },
};

// Map trait labels to IDs
const TRAIT_LABEL_TO_ID: Record<string, string> = {
  "Evening explorer": "night_owl",
  "Conversation seeker": "conversation_seeker",
  "Café hopper": "cafe_hopper",
  "Social butterfly": "social_butterfly",
  "Aesthetic hunter": "aesthetic_hunter",
  "Flavor chaser": "foodie",
  "Hidden gem finder": "hidden_gem_finder",
  "Cocktail connoisseur": "cocktail_connoisseur",
  "Music lover": "music_lover",
  "Romantic at heart": "romantic",
};

const PersonalityTraitModal: React.FC<PersonalityTraitModalProps> = ({
  trait,
  onClose,
  onExplore,
  onReset,
  isResetting = false,
}) => {
  if (!trait) return null;

  const traitId = TRAIT_LABEL_TO_ID[trait.label];
  const _isCustomVibe = !traitId;
  const insight = traitId ? (TRAIT_INSIGHTS[traitId] || {
    why: trait.description,
    based_on: "Your browsing and saving patterns across the app.",
  }) : {
    why: `You're all about that ${trait.label.toLowerCase()} energy — places with this vibe just hit different for you.`,
    based_on: `You added "${trait.label}" as a personal vibe.`,
  };
  const Icon = trait.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-[400px] mx-4 mb-4 bg-card rounded-2xl border border-border shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{trait.label}</h2>
              <p className="text-xs text-muted-foreground">Your travel personality</p>
            </div>
          </div>

          {/* Why explanation */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">Why this fits you</span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{insight.why}</p>
            </div>

            <div className="p-3 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/70">Based on: </span>
                {insight.based_on}
              </p>
            </div>

            {/* Interaction count */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                You've explored <span className="font-medium text-foreground">{trait.score}</span> related {trait.score === 1 ? 'spot' : 'spots'} so far
              </span>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="px-5 pb-5 pt-2 flex gap-2">
          <Button
            variant="outline"
            onClick={() => onReset(trait)}
            disabled={isResetting}
            className="flex-1 rounded-xl h-10 text-xs border-border/60 hover:bg-muted/60"
          >
            {isResetting ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            )}
            Reset
          </Button>
          <Button
            onClick={() => onExplore(trait)}
            className="flex-1 rounded-xl h-10 text-xs bg-primary text-primary-foreground font-semibold transition-all"
          >
            Explore vibe
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PersonalityTraitModal;
