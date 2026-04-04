import { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface RecentSearchesProps {
  onSelect: (query: string) => void;
}

const RecentSearches = ({ onSelect }: RecentSearchesProps) => {
  const { user } = useAuth();
  const [searches, setSearches] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      // Load from localStorage for guests
      const stored = localStorage.getItem("recent_searches");
      if (stored) {
        try { setSearches(JSON.parse(stored).slice(0, 5)); } catch { /* */ }
      }
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from("searches")
        .select("prompt")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (data) {
        // Deduplicate
        const unique = [...new Set(data.map((d) => d.prompt))];
        setSearches(unique.slice(0, 5));
      }
    };
    fetch();
  }, [user]);

  const handleClear = () => {
    setSearches([]);
    if (!user) localStorage.removeItem("recent_searches");
  };

  if (searches.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent searches</p>
        <button onClick={handleClear} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {searches.map((s, i) => (
          <button
            key={`${s}-${i}`}
            onClick={() => onSelect(s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-card border border-border text-foreground hover:border-primary/30 transition-colors"
          >
            <Clock className="w-3 h-3 text-muted-foreground" />
            {s}
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecentSearches;
