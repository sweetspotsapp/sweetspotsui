import { User, Heart, MapPin, Sparkles, TrendingUp, Coffee, Moon, Sun, Users, Volume2 } from "lucide-react";
import { useApp } from "@/context/AppContext";

const ProfilePage = () => {
  const { savedPlaceIds, userVibes, rankedPlaces } = useApp();

  // Get saved places from rankedPlaces
  const savedPlaces = rankedPlaces.filter(p => savedPlaceIds.has(p.place_id));

  // Analyze saved places to derive insights
  const getInsights = () => {
    const categoryCount: Record<string, number> = {};
    
    savedPlaces.forEach(place => {
      const category = place.categories?.[0] || "other";
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "café";

    return { topCategory, totalSaved: savedPlaces.length };
  };

  const insights = getInsights();

  const personalityTraits = [
    { icon: Moon, label: "Evening explorer", description: "You prefer spots that come alive after dark" },
    { icon: Volume2, label: "Conversation seeker", description: "Quiet enough to talk, lively enough to feel alive" },
    { icon: Coffee, label: "Café hopper", description: "You've got a thing for good coffee and better vibes" },
    { icon: Users, label: "Social butterfly", description: "Group-friendly spots are your go-to" },
  ];

  const vibeBreakdown = [
    { label: "Chill", percentage: 65, color: "bg-gentle-sage" },
    { label: "Aesthetic", percentage: 20, color: "bg-soft-coral" },
    { label: "Social", percentage: 15, color: "bg-primary" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/40">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-foreground">Your Profile</h1>
          <p className="text-xs text-muted-foreground">What Sweetspots knows about you</p>
        </div>
      </header>

      <div className="p-4 space-y-5">
        {/* Profile Header */}
        <section className="flex items-center gap-4 opacity-0 animate-fade-up" style={{ animationFillMode: 'forwards' }}>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Explorer</h2>
            <p className="text-sm text-muted-foreground">Finding your sweetspots since today</p>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-3 opacity-0 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <div className="text-2xl font-bold text-primary">{insights.totalSaved}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Saved spots</div>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <div className="text-2xl font-bold text-primary">{rankedPlaces.length}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Places shown</div>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <div className="text-2xl font-bold text-primary">1</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Mood searches</div>
          </div>
        </section>

        {/* Vibe Analysis */}
        <section className="bg-card rounded-xl p-4 border border-border shadow-soft space-y-3 opacity-0 animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">Your Vibe DNA</h3>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Based on what you save and search for, here's what you're drawn to:
          </p>

          <div className="space-y-2">
            {vibeBreakdown.map((vibe, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground font-medium">{vibe.label}</span>
                  <span className="text-muted-foreground">{vibe.percentage}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${vibe.color} rounded-full transition-all duration-500`}
                    style={{ width: `${vibe.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Personality Traits */}
        <section className="space-y-3 opacity-0 animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-2 px-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">What we've learned</h3>
          </div>
          
          <div className="space-y-2">
            {personalityTraits.map((trait, index) => {
              const Icon = trait.icon;
              return (
                <div 
                  key={index}
                  className="flex gap-3 p-3 bg-card rounded-xl border border-border"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">{trait.label}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{trait.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Current preferences */}
        <section className="bg-warm-cream rounded-xl p-4 space-y-2 opacity-0 animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
          <h3 className="font-semibold text-foreground text-sm">Current mood preferences</h3>
          <div className="flex flex-wrap gap-1.5">
            {userVibes.map((vibe, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-2.5 py-1 rounded-full bg-background text-foreground text-xs font-medium border border-border"
              >
                {vibe}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
