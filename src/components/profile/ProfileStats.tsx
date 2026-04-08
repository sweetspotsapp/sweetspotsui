import { ChevronRight } from "lucide-react";

interface ProfileStatsProps {
  totalSaved: number;
  placesShownCount: number;
  searchCount: number;
  onNavigateToSaved?: () => void;
  onOpenPlacesHistory: () => void;
  onOpenSearchHistory: () => void;
}

const ProfileStats = ({ totalSaved, placesShownCount, searchCount, onNavigateToSaved, onOpenPlacesHistory, onOpenSearchHistory }: ProfileStatsProps) => (
  <section className="grid grid-cols-3 gap-3 opacity-0 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
    <button onClick={onNavigateToSaved} className="bg-card rounded-xl p-3 border border-border text-center hover:border-primary/30 hover:bg-primary/5 transition-all group">
      <div className="text-2xl font-bold text-primary">{totalSaved}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5 group-hover:text-primary transition-colors">Saved spots</div>
      <ChevronRight className="w-3 h-3 text-muted-foreground mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
    <button onClick={onOpenPlacesHistory} className="bg-card rounded-xl p-3 border border-border text-center hover:border-primary/30 hover:bg-primary/5 transition-all group">
      <div className="text-2xl font-bold text-primary">{placesShownCount}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5 group-hover:text-primary transition-colors">Places shown</div>
      <ChevronRight className="w-3 h-3 text-muted-foreground mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
    <button onClick={onOpenSearchHistory} className="bg-card rounded-xl p-3 border border-border text-center hover:border-primary/30 hover:bg-primary/5 transition-all group">
      <div className="text-2xl font-bold text-primary">{searchCount || 0}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5 group-hover:text-primary transition-colors">Mood searches</div>
      <ChevronRight className="w-3 h-3 text-muted-foreground mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  </section>
);

export default ProfileStats;
