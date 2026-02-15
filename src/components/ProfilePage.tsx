import { useState } from "react";
import { User, Sparkles, TrendingUp, Loader2, Settings } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useVibeDNA } from "@/hooks/useVibeDNA";
import ProfileSlideMenu from "./ProfileSlideMenu";

const ProfilePage = () => {
  const { savedPlaceIds, userVibes } = useApp();
  const { vibeBreakdown, personalityTraits, isLoading: isVibeLoading, totalInteractions, searchCount, placesShownCount } = useVibeDNA();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Total saved is directly from savedPlaceIds Set (synced with DB)
  const totalSaved = savedPlaceIds.size;

  return (
    <>
    <div className="min-h-screen bg-background pb-20 max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/40">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="w-10" />
            
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              SweetSpots
            </h1>
            
            <button 
              onClick={() => setIsProfileMenuOpen(true)}
              className="p-2 -mr-2 text-foreground hover:text-primary transition-colors"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Page Title */}
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-foreground">Your Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">What Sweetspots knows about you</p>
        </div>

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
            <div className="text-2xl font-bold text-primary">{totalSaved}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Saved spots</div>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <div className="text-2xl font-bold text-primary">{placesShownCount}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Places shown</div>
          </div>
          <div className="bg-card rounded-xl p-3 border border-border text-center">
            <div className="text-2xl font-bold text-primary">{searchCount || 0}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Mood searches</div>
          </div>
        </section>

        {/* Vibe Analysis */}
        <section className="bg-card rounded-xl p-4 border border-border shadow-soft space-y-3 opacity-0 animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">Your Vibe DNA</h3>
            {totalInteractions > 0 && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                Based on {totalInteractions} interaction{totalInteractions !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground">
            {totalInteractions > 0 
              ? "Based on what you save and explore, here's what you're drawn to:"
              : "Start exploring and saving places to build your unique Vibe DNA!"}
          </p>

          {isVibeLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : (
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
                      style={{ width: `${vibe.percentage}%`, animationDelay: `${index * 100}ms` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Personality Traits */}
        <section className="space-y-3 opacity-0 animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-2 px-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">What we've learned</h3>
          </div>
          
          {isVibeLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : personalityTraits.length === 0 ? (
            <div className="p-4 bg-card rounded-xl border border-border text-center">
              <p className="text-sm text-muted-foreground">
                Start saving and exploring places to discover your personality traits!
              </p>
            </div>
          ) : (
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
          )}
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

    <ProfileSlideMenu 
      isOpen={isProfileMenuOpen} 
      onClose={() => setIsProfileMenuOpen(false)}
    />
    </>
  );
};

export default ProfilePage;
